
import React, { useState, useEffect } from 'react';
import { DesignConfig, MetalType, GemstoneType, JewelryType, ViewAngle, ImageSize, AspectRatio, AppState, DesignHistoryItem, AppSettings } from './types';
import { generateJewelryDesign } from './services/geminiService';
import ComparisonSlider from './components/ComparisonSlider';
import ConfigPanel from './components/ConfigPanel';
import ImageUploader from './components/ImageUploader';
import HistoryDrawer from './components/HistoryDrawer';
import { Gem, Download, Trash2, Loader2, Sparkles, Heart, Settings, X, Save } from 'lucide-react';

const LOADING_STEPS = [
  "Analyzing Geometry...",
  "Identifying Materials...",
  "Sketching Concept...",
  "Rendering Gold Texture...",
  "Polishing Gemstones...",
  "Finalizing Light & Shadow..."
];

function App() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedDescription, setGeneratedDescription] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({
    apiKey: '',
    baseUrl: '',
    modelName: ''
  });

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

  // Loading Step Cycler
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      setLoadingStepIndex(0);
      interval = setInterval(() => {
        setLoadingStepIndex(prev => (prev + 1) % LOADING_STEPS.length);
      }, 2500); // Change step every 2.5s
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Load settings on mount
  useEffect(() => {
    const systemKey = process.env.API_KEY || '';
    const defaultBaseUrl = 'https://api.apimart.ai';
    const defaultModel = 'gemini-3-pro-image-preview'; // Default fallback

    try {
      const savedSettings = localStorage.getItem('lumina_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (!parsed.apiKey && systemKey) {
            setSettings({
                apiKey: systemKey,
                baseUrl: parsed.baseUrl || defaultBaseUrl,
                modelName: parsed.modelName || defaultModel
            });
        } else {
            setSettings(parsed);
        }
      } else {
        setSettings({
          apiKey: systemKey,
          baseUrl: defaultBaseUrl,
          modelName: defaultModel
        });
      }
    } catch (e) {
      console.warn("Failed to load settings", e);
      setSettings({
        apiKey: systemKey,
        baseUrl: defaultBaseUrl,
        modelName: defaultModel
      });
    }
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem('lumina_settings', JSON.stringify(settings));
    setIsSettingsOpen(false);
    setError(null); 
  };
  
  const handleResetSettings = () => {
      const defaultSettings = {
          apiKey: process.env.API_KEY || '',
          baseUrl: 'https://api.apimart.ai',
          modelName: 'gemini-3-pro-image-preview'
      };
      setSettings(defaultSettings);
      localStorage.setItem('lumina_settings', JSON.stringify(defaultSettings));
      setError(null);
  };

  const [config, setConfig] = useState<DesignConfig>({
    metal: MetalType.YellowGold18K,
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
    
    const currentApiKey = settings.apiKey || process.env.API_KEY;
    if (!currentApiKey) {
      setIsSettingsOpen(true);
      setError("请先配置 API Key");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setAppState('GENERATING');
    setGeneratedDescription(null);
    
    setIsSaved(false);
    setCurrentDesignId(null);

    try {
      const result = await generateJewelryDesign(originalImage, config);
      setGeneratedImage(result.image);
      setGeneratedDescription(result.description);
      setAppState('RESULT');
    } catch (err: any) {
      let msg = err.message || '生成设计时出现问题，请重试。';
      if (msg.includes("AUTH_ERROR")) {
        setIsSettingsOpen(true);
        msg = msg.replace("AUTH_ERROR: ", "");
      }
      setError(msg);
      setAppState('CONFIGURING');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMainButtonClick = () => {
     handleGenerate();
  };

  const handleToggleFavorite = () => {
    if (!originalImage || !generatedImage) return;

    if (isSaved && currentDesignId) {
      setHistory(prev => prev.filter(item => item.id !== currentDesignId));
      setIsSaved(false);
      setCurrentDesignId(null);
    } else {
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
    <div className="h-[100dvh] w-full bg-stone-50 text-stone-800 flex flex-col font-sans overflow-hidden">
      
      {/* Header */}
      <header className="h-14 md:h-20 absolute top-0 left-0 right-0 z-40 flex items-center justify-between px-4 md:px-10 bg-white/80 backdrop-blur-md border-b border-stone-100/50 transition-all">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="text-champagne-400 p-1.5 rounded-full bg-stone-50 border border-stone-200">
            <Gem className="w-5 h-5 md:w-6 md:h-6 animate-pulse-slow" />
          </div>
          <div className="flex flex-col md:flex-row md:items-baseline md:gap-3">
            <h1 className="text-lg md:text-2xl font-serif font-bold text-stone-900 tracking-wide">LUMINA</h1>
            <span className="text-[10px] text-stone-400 uppercase tracking-[0.2em] font-medium hidden md:inline-block">Haute Joaillerie AI</span>
          </div>
        </div>

        <div className="flex items-center gap-1 md:gap-2">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2.5 rounded-full hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-all active:scale-95"
            title="API 设置"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="group flex items-center gap-2 px-3 py-2 md:px-4 rounded-full hover:bg-stone-100 transition-all text-stone-500 hover:text-stone-800 active:scale-95"
          >
            <Heart className="w-5 h-5 group-hover:scale-110 group-hover:text-red-400 transition-all duration-300" />
            <span className="hidden md:inline text-xs font-bold uppercase tracking-widest">我的收藏</span>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex flex-col md:flex-row h-full pt-14 md:pt-20">
        
        {/* Top/Left Panel: Visual Workspace */}
        <div className={`
          relative transition-all duration-700 cubic-bezier(0.16, 1, 0.3, 1)
          w-full md:flex-1 bg-stone-50
          ${originalImage ? 'h-[42vh] md:h-auto shrink-0' : 'h-full'} 
          flex flex-col items-center justify-center
          border-b md:border-b-0 md:border-r border-stone-100
        `}>
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#ffffff_0%,_#f5f5f4_100%)] opacity-80" />
          
          <div className="relative w-full h-full p-2 md:p-12 flex items-center justify-center z-10">
            {!originalImage ? (
              <div className="w-full max-w-sm md:max-w-md aspect-square md:aspect-auto md:h-[500px] animate-fade-in-up px-4">
                 <ImageUploader onImageSelected={handleImageSelected} />
              </div>
            ) : (
              <div className="relative w-full h-full shadow-soft rounded-2xl overflow-hidden bg-white border border-stone-100 group animate-scale-in">
                 {appState === 'RESULT' && generatedImage ? (
                    <ComparisonSlider originalImage={originalImage} generatedImage={generatedImage} />
                  ) : (
                    <>
                      <img src={originalImage} alt="Reference" className="w-full h-full object-contain p-6 md:p-12 animate-fade-in" />
                      <div className="absolute top-3 left-3 md:top-6 md:left-6 px-3 py-1 bg-white/90 backdrop-blur rounded-full text-[10px] font-bold tracking-widest text-stone-400 shadow-sm border border-stone-100 animate-fade-in-up delay-[200ms]">
                        ORIGINAL
                      </div>
                    </>
                  )}

                  {/* Sophisticated Loading Overlay */}
                  {isGenerating && (
                    <div className="absolute inset-0 bg-stone-50/80 backdrop-blur-md z-30 flex flex-col items-center justify-center animate-fade-in">
                       {/* Scanning Line Effect */}
                       <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
                          <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-champagne-400 to-transparent shadow-glow animate-scan absolute top-0"></div>
                       </div>
                       <div className="relative mb-8">
                         <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border border-stone-200 border-t-champagne-400 animate-spin-slow"></div>
                         <div className="absolute inset-0 m-2 rounded-full border border-dashed border-stone-300 animate-spin-slow" style={{ animationDirection: 'reverse' }}></div>
                         <div className="absolute inset-0 flex items-center justify-center">
                           <Gem className="w-8 h-8 md:w-10 md:h-10 text-champagne-500 animate-pulse-slow drop-shadow-lg" />
                         </div>
                       </div>
                       <div className="flex flex-col items-center space-y-2 h-16">
                         <span className="font-serif text-lg md:text-xl text-stone-800">
                           {LOADING_STEPS[loadingStepIndex]}
                         </span>
                         <div className="flex gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-champagne-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-champagne-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-champagne-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                         </div>
                       </div>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Optimized Action Bar (Visuals) */}
          {originalImage && (
             <div className={`
               absolute md:bottom-4 md:left-1/2 md:-translate-x-1/2 
               top-4 right-4 md:top-auto md:right-auto
               flex items-center gap-3 z-30 animate-fade-in-up delay-[400ms]
             `}>
               {/* Mobile Top-Right discrete actions to avoid blocking labels */}
               <div className="flex items-center gap-1 bg-white/95 backdrop-blur-xl border border-stone-100 p-1 md:p-1.5 rounded-full shadow-lg ring-1 ring-stone-100/50">
                  <button 
                    onClick={handleClear}
                    title="Clear Workspace"
                    className="p-2.5 md:p-3 rounded-full hover:bg-stone-100 text-stone-400 hover:text-red-400 transition-colors transform active:scale-95 duration-200"
                  >
                    <Trash2 className="w-4.5 h-4.5 md:w-5 md:h-5" />
                  </button>
                  
                  {appState === 'RESULT' && (
                    <>
                      <div className="w-px h-6 bg-stone-100 mx-0.5 md:mx-1"></div>
                      <button
                        onClick={handleToggleFavorite}
                        className={`
                          p-2.5 md:p-3 rounded-full transition-all duration-300 transform active:scale-95
                          ${isSaved ? 'text-red-500' : 'text-stone-400 hover:text-red-400'}
                        `}
                      >
                         <Heart className={`w-4.5 h-4.5 md:w-5 md:h-5 ${isSaved ? 'fill-current' : ''}`} />
                      </button>

                      <button 
                        onClick={handleDownload}
                        className="ml-1 px-3 py-2 md:px-5 md:py-2.5 rounded-full bg-stone-900 text-white hover:bg-stone-800 text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-md active:scale-95"
                      >
                        <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
                        <span className="hidden sm:inline">{isSaved ? '保存副本' : '立即保存'}</span>
                        <span className="sm:hidden">保存</span>
                      </button>
                    </>
                  )}
                  
                  <div className="w-px h-6 bg-stone-100 mx-0.5 md:mx-1"></div>
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden border border-stone-100 bg-stone-50 relative group cursor-pointer shadow-inner">
                     <ImageUploader onImageSelected={handleImageSelected} compact />
                  </div>
               </div>
             </div>
          )}

           {error && (
             <div className="absolute top-4 md:top-24 left-1/2 -translate-x-1/2 bg-red-50 text-red-600 px-4 py-3 rounded-xl shadow-lg border border-red-100 text-xs md:text-sm z-50 flex items-center gap-2 w-max max-w-[90%] animate-fade-in-up">
               <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse"></span>
               {error}
             </div>
           )}
        </div>

        {/* Bottom/Right Panel: Controls */}
        <div className={`
          z-20 bg-white
          md:w-[420px] md:relative md:border-l border-stone-100 md:shadow-[0_-10px_40px_rgba(0,0,0,0.03)]
          flex flex-col flex-1
          ${originalImage ? 'flex animate-slide-up' : 'hidden md:flex'}
          overflow-hidden
        `}>
          <div className="flex-1 overflow-hidden relative">
            <div className="h-full overflow-y-auto custom-scrollbar p-5 md:p-8 pb-32 md:pb-8">
               <ConfigPanel 
                 config={config} 
                 setConfig={setConfig} 
                 onGenerate={handleMainButtonClick}
                 isGenerating={isGenerating}
                 disabled={!originalImage}
                 generatedDescription={generatedDescription}
               />
            </div>
          </div>

          {/* Mobile Sticky Action Bar */}
          {originalImage && (
            <div className="md:hidden absolute bottom-0 left-0 right-0 p-4 pt-6 bg-gradient-to-t from-white via-white to-white/0 pb-safe z-40 animate-slide-up">
               <button
                onClick={handleMainButtonClick}
                disabled={isGenerating || !originalImage}
                className={`
                  w-full relative overflow-hidden rounded-xl py-4
                  ${(!originalImage || isGenerating) ? 'bg-stone-100 text-stone-400' : 'bg-stone-900 text-white active:scale-[0.98]'}
                  font-bold tracking-[0.2em] text-xs uppercase transition-all duration-300 shadow-xl
                `}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isGenerating ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4 text-champagne-400" />
                      CRAFTING...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-champagne-400" />
                      {appState === 'RESULT' ? 'REGENERATE DESIGN' : 'GENERATE DESIGN'}
                    </>
                  )}
                </span>
              </button>
            </div>
          )}
        </div>

      </main>

      <HistoryDrawer 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        history={history}
        onSelect={handleSelectHistoryItem}
        onDelete={handleDeleteHistoryItem}
      />
      
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
             <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-stone-600" />
                  <h3 className="font-serif text-lg text-stone-800">API Configuration</h3>
                </div>
                <button onClick={() => setIsSettingsOpen(false)} className="text-stone-400 hover:text-stone-800">
                  <X className="w-5 h-5" />
                </button>
             </div>
             <div className="p-6 space-y-5">
                <div className="space-y-2">
                   <label className="text-xs font-bold uppercase tracking-widest text-stone-500">API Key</label>
                   <input 
                    type="password" 
                    value={settings.apiKey}
                    onChange={(e) => setSettings({...settings, apiKey: e.target.value})}
                    placeholder="sk-..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-base md:text-sm focus:border-champagne-400 outline-none"
                   />
                </div>
                
                <div className="space-y-2">
                   <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Base URL (Proxy)</label>
                   <input 
                    type="text" 
                    value={settings.baseUrl}
                    onChange={(e) => setSettings({...settings, baseUrl: e.target.value})}
                    placeholder="https://api.apimart.ai"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-base md:text-sm focus:border-champagne-400 outline-none"
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Model Name</label>
                   <input 
                    type="text" 
                    value={settings.modelName || ''}
                    onChange={(e) => setSettings({...settings, modelName: e.target.value})}
                    placeholder="gemini-3-pro-image-preview"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-base md:text-sm focus:border-champagne-400 outline-none"
                   />
                </div>
             </div>
             <div className="p-6 pt-2 space-y-3">
               <button 
                onClick={handleSaveSettings}
                className="w-full bg-stone-900 text-white py-3 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-stone-800 transition-colors"
               >
                 <Save className="w-4 h-4" />
                 Save Configuration
               </button>
               <button 
                onClick={handleResetSettings}
                className="w-full bg-stone-100 text-stone-500 py-2.5 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-stone-200 transition-colors"
               >
                 恢复默认设置 (Reset Defaults)
               </button>
             </div>
          </div>
        </div>
      )}
      
      <style>{`
        .pb-safe {
          padding-bottom: max(16px, env(safe-area-inset-bottom));
        }
      `}</style>
    </div>
  );
}

export default App;
