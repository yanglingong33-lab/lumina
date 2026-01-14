import React, { useState, useEffect } from 'react';
import { DesignConfig, MetalType, GemstoneType, JewelryType, ViewAngle, ImageSize, AspectRatio, AppState, DesignHistoryItem } from './types';
import { generateJewelryDesign } from './services/geminiService';
import ComparisonSlider from './components/ComparisonSlider';
import ConfigPanel from './components/ConfigPanel';
import ImageUploader from './components/ImageUploader';
import HistoryDrawer from './components/HistoryDrawer';
import { Gem, Download, Trash2, Loader2, Sparkles, Heart, KeyRound } from 'lucide-react';

// Declaration for AI Studio window object
// Augment the AIStudio interface to include the required methods. 
// This avoids conflict with existing Window.aistudio declaration.
declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
}

function App() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedDescription, setGeneratedDescription] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsApiKey, setNeedsApiKey] = useState(false);
  
  // Collection/Favorites State with Local Storage Persistence
  const [history, setHistory] = useState<DesignHistoryItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('lumina_collection');
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        console.error("Failed to load collection", e);
        return [];
      }
    }
    return [];
  });
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('lumina_collection', JSON.stringify(history));
  }, [history]);

  // Check for AI Studio Key Selection
  useEffect(() => {
    const checkKey = async () => {
      // If we already have a key from env/build config, we don't need to ask the user
      // process.env.API_KEY is replaced by string literal at build time
      if (process.env.API_KEY && process.env.API_KEY.length > 0) {
        setNeedsApiKey(false);
        return;
      }

      if (window.aistudio) {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        if (!hasKey) {
          setNeedsApiKey(true);
        }
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Assume success to avoid race condition with hasSelectedApiKey
      setNeedsApiKey(false);
    }
  };

  const [config, setConfig] = useState<DesignConfig>({
    metal: MetalType.YellowGold,
    gemstone: GemstoneType.Diamond,
    auxiliaryStone: '',
    type: JewelryType.Ring,
    viewAngle: ViewAngle.Front,
    imageSize: ImageSize.S_2K,
    aspectRatio: AspectRatio.Square,
    description: '',
  });

  const handleImageSelected = (base64: string) => {
    setOriginalImage(base64);
    setAppState(prevState => prevState === 'RESULT' ? 'RESULT' : 'CONFIGURING');
    setError(null);
    setIsSaved(false);
    setCurrentDesignId(null);
  };

  const handleGenerate = async () => {
    if (!originalImage) return;
    
    // Check key again before generating
    if (needsApiKey && window.aistudio) {
      await handleSelectKey();
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setAppState('GENERATING');
    setGeneratedDescription(null);
    
    // Reset save state for new generation
    setIsSaved(false);
    setCurrentDesignId(null);

    try {
      const result = await generateJewelryDesign(originalImage, config);
      setGeneratedImage(result.image);
      setGeneratedDescription(result.description);
      setAppState('RESULT');
    } catch (err: any) {
      setError(err.message || '生成设计时出现问题，请重试。');
      setAppState('CONFIGURING');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMainButtonClick = () => {
    if (needsApiKey) {
      handleSelectKey();
    } else {
      handleGenerate();
    }
  };

  const handleToggleFavorite = () => {
    if (!originalImage || !generatedImage) return;

    if (isSaved && currentDesignId) {
      // Remove from favorites
      setHistory(prev => prev.filter(item => item.id !== currentDesignId));
      setIsSaved(false);
      setCurrentDesignId(null);
    } else {
      // Add to favorites
      const newId = Date.now().toString();
      const newHistoryItem: DesignHistoryItem = {
        id: newId,
        timestamp: Date.now(),
        originalImage: originalImage,
        generatedImage: generatedImage,
        designDescription: generatedDescription || undefined,
        config: { ...config }
      };

      setHistory(prev => [newHistoryItem, ...prev]);
      setIsSaved(true);
      setCurrentDesignId(newId);
    }
  };

  const handleDeleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    setHistory(prev => prev.filter(item => item.id !== id));
    
    // If the currently displayed item is deleted, update state
    if (id === currentDesignId) {
      setIsSaved(false);
      setCurrentDesignId(null);
    }
  };

  const handleClear = () => {
    setAppState('IDLE');
    setOriginalImage(null);
    setGeneratedImage(null);
    setGeneratedDescription(null);
    setError(null);
    setIsSaved(false);
    setCurrentDesignId(null);
  };

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `lumina-design-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSelectHistoryItem = (item: DesignHistoryItem) => {
    setOriginalImage(item.originalImage);
    setGeneratedImage(item.generatedImage);
    setGeneratedDescription(item.designDescription || null);
    setConfig({
      ...item.config,
      imageSize: item.config.imageSize || ImageSize.S_2K,
      aspectRatio: item.config.aspectRatio || AspectRatio.Square
    });
    setAppState('RESULT');
    setIsHistoryOpen(false);
    setIsSaved(true); 
    setCurrentDesignId(item.id);
  };

  return (
    <div className="h-screen w-full bg-stone-50 text-stone-800 flex flex-col font-sans overflow-hidden">
      
      {/* Header */}
      <header className="h-16 md:h-20 absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 md:px-10 bg-white/80 backdrop-blur-md border-b border-stone-100/50">
        <div className="flex items-center gap-3">
          <div className="text-champagne-400 p-1.5 rounded-full bg-stone-50 border border-stone-200">
            <Gem className="w-5 h-5 md:w-6 md:h-6 animate-pulse-slow" />
          </div>
          <div className="flex flex-col md:flex-row md:items-baseline md:gap-3">
            <h1 className="text-xl md:text-2xl font-serif font-bold text-stone-900 tracking-wide">LUMINA</h1>
            <span className="text-[10px] text-stone-400 uppercase tracking-[0.2em] font-medium hidden md:inline-block">Haute Joaillerie AI</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
           {needsApiKey && (
            <button 
              onClick={handleSelectKey}
              className="group flex items-center gap-2 px-4 py-2 rounded-full bg-champagne-100 text-champagne-900 hover:bg-champagne-200 transition-all text-xs font-bold uppercase tracking-widest mr-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>Connect AI Key</span>
            </button>
          )}
          
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="group flex items-center gap-2 px-4 py-2 rounded-full hover:bg-stone-100 transition-all text-stone-500 hover:text-stone-800"
          >
            <Heart className="w-5 h-5 group-hover:scale-110 group-hover:text-red-400 transition-all duration-300" />
            <span className="hidden md:inline text-xs font-bold uppercase tracking-widest">我的收藏</span>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex flex-col md:flex-row h-full pt-16 md:pt-20">
        
        {/* Top/Left Panel: Visual Workspace */}
        <div className={`
          relative transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1)
          w-full md:flex-1 bg-stone-50
          ${originalImage ? 'h-[40vh] md:h-auto' : 'h-full'} 
          flex flex-col items-center justify-center
        `}>
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#ffffff_0%,_#f5f5f4_100%)] opacity-80" />
          
          <div className="relative w-full h-full p-6 md:p-12 flex items-center justify-center z-10">
            {!originalImage ? (
              <div className="w-full max-w-md aspect-square md:aspect-auto md:h-[500px] animate-fade-in-up">
                 <ImageUploader onImageSelected={handleImageSelected} />
              </div>
            ) : (
              <div className="relative w-full h-full shadow-soft rounded-2xl overflow-hidden bg-white border border-stone-100 group animate-scale-in">
                 {appState === 'RESULT' && generatedImage ? (
                    <ComparisonSlider originalImage={originalImage} generatedImage={generatedImage} />
                  ) : (
                    <>
                      <img src={originalImage} alt="Reference" className="w-full h-full object-contain p-8 md:p-12 animate-fade-in" />
                      <div className="absolute top-4 left-4 md:top-6 md:left-6 px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-bold tracking-widest text-stone-400 shadow-sm border border-stone-100 animate-fade-in-up delay-[200ms]">
                        ORIGINAL
                      </div>
                    </>
                  )}

                  {/* Loading Overlay */}
                  {isGenerating && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-md z-20 flex flex-col items-center justify-center animate-fade-in">
                       <div className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-stone-200 border-t-champagne-400 animate-spin mb-4 md:mb-6"></div>
                       <p className="text-stone-800 font-serif text-sm md:text-lg tracking-wider animate-pulse">正在精工细作...</p>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Floating Action Bar (Visuals) */}
          {originalImage && (
             <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 z-20 animate-fade-in-up delay-[400ms]">
               <div className="flex items-center gap-1 bg-white/90 backdrop-blur-xl border border-white/50 p-1.5 rounded-full shadow-soft ring-1 ring-stone-100">
                  <button 
                    onClick={handleClear}
                    title="Clear Workspace"
                    className="p-3 rounded-full hover:bg-stone-100 text-stone-400 hover:text-red-400 transition-colors transform hover:scale-110 active:scale-95 duration-200"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  
                  {appState === 'RESULT' && (
                    <>
                      <div className="w-px h-6 bg-stone-200 mx-1"></div>
                      
                      {/* Favorite Button (Toggle) */}
                      <button
                        onClick={handleToggleFavorite}
                        title={isSaved ? "取消收藏" : "加入收藏"}
                        className={`
                          p-3 rounded-full transition-all duration-300 transform active:scale-95 relative group
                          ${isSaved 
                            ? 'text-red-500 hover:bg-red-50' 
                            : 'hover:bg-red-50 text-stone-400 hover:text-red-400 hover:scale-110'
                          }
                        `}
                      >
                         <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                      </button>

                      {/* Download Image Button */}
                      <button 
                        onClick={handleDownload}
                        title="Download Image"
                        className="ml-1 px-5 py-2.5 rounded-full bg-champagne-400 text-white hover:bg-champagne-500 shadow-lg shadow-champagne-400/30 text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        保存图片
                      </button>
                    </>
                  )}
                  
                  <div className="w-px h-6 bg-stone-200 mx-1"></div>
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-stone-200 shadow-inner relative group cursor-pointer transform hover:scale-105 transition-transform duration-300">
                     <ImageUploader onImageSelected={handleImageSelected} compact />
                  </div>
               </div>
             </div>
          )}

           {error && (
             <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-red-50 text-red-600 px-6 py-3 rounded-xl shadow-lg border border-red-100 text-sm z-50 flex items-center gap-2 w-max max-w-[90%] animate-fade-in-up">
               <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse"></span>
               {error}
             </div>
           )}
        </div>

        {/* Bottom/Right Panel: Controls */}
        <div className={`
          z-20 bg-white border-t md:border-t-0 md:border-l border-stone-100 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]
          md:w-[400px] md:relative
          flex flex-col flex-1
          ${originalImage ? 'flex animate-slide-up' : 'hidden md:flex'}
          overflow-hidden
        `}>
          <div className="flex-1 overflow-hidden relative">
            <div className="h-full overflow-y-auto custom-scrollbar p-6 md:p-8 pb-32 md:pb-8">
               <ConfigPanel 
                 config={config} 
                 setConfig={setConfig} 
                 onGenerate={handleMainButtonClick}
                 isGenerating={isGenerating}
                 disabled={!originalImage}
                 generatedDescription={generatedDescription}
               />
            </div>
            
            {/* Desktop Decoration */}
            <div className="hidden md:block absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          </div>

          {/* Mobile Sticky Action Bar */}
          {originalImage && (
            <div className="md:hidden absolute bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur border-t border-stone-100 pb-safe z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] animate-slide-up">
               <button
                onClick={handleMainButtonClick}
                disabled={isGenerating || !originalImage}
                className={`
                  w-full relative overflow-hidden rounded-xl py-3.5
                  ${(!originalImage || isGenerating) ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'bg-stone-900 text-white cursor-pointer active:scale-[0.98]'}
                  font-bold tracking-widest text-sm transition-all duration-300 shadow-lg
                `}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4 text-champagne-400" />
                      正在生成...
                    </>
                  ) : needsApiKey ? (
                    <>
                      <KeyRound className="w-4 h-4 text-champagne-400" />
                      连接 AI 密钥
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-champagne-400" />
                      {appState === 'RESULT' ? '重新生成' : '开始生成设计'}
                    </>
                  )}
                </span>
              </button>
            </div>
          )}
        </div>

      </main>

      {/* Favorites Drawer (Previously History) */}
      <HistoryDrawer 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        history={history}
        onSelect={handleSelectHistoryItem}
        onDelete={handleDeleteHistoryItem}
      />
      
      <style>{`
        .pb-safe {
          padding-bottom: max(16px, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}

export default App;