
import React, { useState, useEffect } from 'react';
import { DesignConfig, MetalType, GemstoneType, JewelryType, ViewAngle, ImageSize, AspectRatio, AppState, DesignHistoryItem, AppSettings } from './types';
import { generateJewelryDesign } from './services/geminiService';
import ComparisonSlider from './components/ComparisonSlider';
import ConfigPanel from './components/ConfigPanel';
import ImageUploader from './components/ImageUploader';
import HistoryDrawer from './components/HistoryDrawer';
import { Gem, Download, Trash2, Loader2, Sparkles, Heart, Settings, X, Save } from 'lucide-react';

function App() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedDescription, setGeneratedDescription] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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

  // Load settings on mount
  useEffect(() => {
    const systemKey = process.env.API_KEY || '';
    const defaultBaseUrl = 'https://api.apimart.ai';
    const defaultModel = 'gemini-3-pro-image-preview'; // Default fallback

    try {
      const savedSettings = localStorage.getItem('lumina_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        // If the saved key is empty OR the user is clearly using a dev build where we hardcoded a new key
        // We gently suggest/update the key if it looks empty in storage but present in env
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
        // Initialize with default/env values
        setSettings({
          apiKey: systemKey,
          baseUrl: defaultBaseUrl,
          modelName: defaultModel
        });
      }
    } catch (e) {
      console.warn("Failed to load settings", e);
      // Fallback
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
    
    // Check key presence
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
    
    // Reset save state for new generation
    setIsSaved(false);
    setCurrentDesignId(null);

    try {
      const result = await generateJewelryDesign(originalImage, config);
      setGeneratedImage(result.image);
      setGeneratedDescription(result.description);
      setAppState('RESULT');
    } catch (err: any) {
      let msg = err.message || '生成设计时出现问题，请重试。';
      
      // Auto-open settings if specific AUTH error occurs
      if (msg.includes("AUTH_ERROR")) {
        setIsSettingsOpen(true);
        // Clean message for display
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
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 rounded-full hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-all mr-1"
            title="API 设置"
          >
            <Settings className="w-5 h-5" />
          </button>
          
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

      {/* Favorites Drawer */}
      <HistoryDrawer 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        history={history}
        onSelect={handleSelectHistoryItem}
        onDelete={handleDeleteHistoryItem}
      />
      
      {/* Settings Modal */}
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
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm focus:border-champagne-400 focus:ring-1 focus:ring-champagne-400/20 outline-none"
                   />
                </div>
                
                <div className="space-y-2">
                   <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Base URL (Proxy)</label>
                   <input 
                    type="text" 
                    value={settings.baseUrl}
                    onChange={(e) => setSettings({...settings, baseUrl: e.target.value})}
                    placeholder="https://api.apimart.ai"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm focus:border-champagne-400 focus:ring-1 focus:ring-champagne-400/20 outline-none"
                   />
                   <p className="text-[10px] text-stone-400">中转代理地址。留空则使用官方地址。</p>
                </div>

                <div className="space-y-2">
                   <label className="text-xs font-bold uppercase tracking-widest text-stone-500">Model Name</label>
                   <input 
                    type="text" 
                    value={settings.modelName || ''}
                    onChange={(e) => setSettings({...settings, modelName: e.target.value})}
                    placeholder="gemini-3-pro-image-preview"
                    className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm focus:border-champagne-400 focus:ring-1 focus:ring-champagne-400/20 outline-none"
                   />
                   <p className="text-[10px] text-stone-400">
                     推荐: gemini-3-pro-image-preview 或 gemini-2.0-flash-exp。<br/>
                     系统会自动尝试多个模型以确保成功。
                   </p>
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
