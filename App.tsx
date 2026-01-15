
import React, { useState, useEffect, useRef } from 'react';
import { DesignConfig, MetalType, GemstoneType, JewelryType, ViewAngle, ImageSize, AspectRatio, AppState, DesignHistoryItem, AppSettings, VariationMode, VariationItem } from './types';
import { generateJewelryDesign, generateJewelryVariation } from './services/geminiService';
import ComparisonSlider from './components/ComparisonSlider';
import ConfigPanel from './components/ConfigPanel';
import ImageUploader from './components/ImageUploader';
import HistoryDrawer from './components/HistoryDrawer';
import { Gem, Download, Trash2, Loader2, Sparkles, Heart, Settings, X, Save, Wand2, Layers, User, Camera, Send, Edit, History } from 'lucide-react';

const LOADING_STEPS = ["Analyzing Geometry...", "Refining Details...", "Simulating Light...", "Mastering Texture..."];

function App() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedDescription, setGeneratedDescription] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  
  // Settings
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>({ apiKey: '', baseUrl: '', modelName: '' });

  // Saved Collection (Manual)
  const [savedCollection, setSavedCollection] = useState<DesignHistoryItem[]>(() => {
    try { const s = localStorage.getItem('lumina_collection'); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  // Recent History (Automatic, max 10)
  const [recentHistory, setRecentHistory] = useState<DesignHistoryItem[]>(() => {
    try { const s = localStorage.getItem('lumina_history'); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [currentDesignId, setCurrentDesignId] = useState<string | null>(null);

  // Creative Studio (Variations) State
  const [variations, setVariations] = useState<VariationItem[]>([]);
  const [isRefining, setIsRefining] = useState(false);
  const [refineText, setRefineText] = useState("");
  const variationsEndRef = useRef<HTMLDivElement>(null);

  // Persist State
  useEffect(() => { localStorage.setItem('lumina_collection', JSON.stringify(savedCollection)); }, [savedCollection]);
  useEffect(() => { localStorage.setItem('lumina_history', JSON.stringify(recentHistory)); }, [recentHistory]);

  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      setLoadingStepIndex(0);
      interval = setInterval(() => setLoadingStepIndex(prev => (prev + 1) % LOADING_STEPS.length), 2500);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  // Load Settings
  useEffect(() => {
    const sysKey = process.env.API_KEY || '';
    try {
      const saved = localStorage.getItem('lumina_settings');
      if (saved) {
        const p = JSON.parse(saved);
        if (!p.apiKey && sysKey) setSettings({ apiKey: sysKey, baseUrl: p.baseUrl || 'https://api.apimart.ai', modelName: p.modelName || 'gemini-3-pro-image-preview' });
        else setSettings(p);
      } else setSettings({ apiKey: sysKey, baseUrl: 'https://api.apimart.ai', modelName: 'gemini-3-pro-image-preview' });
    } catch { setSettings({ apiKey: sysKey, baseUrl: 'https://api.apimart.ai', modelName: 'gemini-3-pro-image-preview' }); }
  }, []);

  const handleSaveSettings = () => { localStorage.setItem('lumina_settings', JSON.stringify(settings)); setIsSettingsOpen(false); setError(null); };
  
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
    setVariations([]); // Clear variations on new image
  };

  const addToRecentHistory = (resultImage: string, resultDesc: string) => {
    if (!originalImage) return;
    const newItem: DesignHistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      originalImage,
      generatedImage: resultImage,
      designDescription: resultDesc,
      config: { ...config }
    };

    setRecentHistory(prev => {
      // Add new item to start, slice to max 10
      const updated = [newItem, ...prev];
      return updated.slice(0, 10);
    });
    
    // Set current ID so we can toggle save on it if user wants
    setCurrentDesignId(newItem.id);
  };

  const handleGenerate = async () => {
    if (!originalImage) return;
    if (!settings.apiKey && !process.env.API_KEY) { setIsSettingsOpen(true); setError("请先配置 API Key"); return; }
    
    setIsGenerating(true);
    setError(null);
    setAppState('GENERATING');
    setGeneratedDescription(null);
    setIsSaved(false);
    setCurrentDesignId(null);
    setVariations([]); // New generation clears old variations

    try {
      const result = await generateJewelryDesign(originalImage, config);
      setGeneratedImage(result.image);
      setGeneratedDescription(result.description);
      setAppState('RESULT');
      
      // Auto-save to history
      addToRecentHistory(result.image, result.description);

    } catch (err: any) {
      setError(err.message.includes("AUTH_ERROR") ? err.message.replace("AUTH_ERROR: ", "") : (err.message || '生成失败'));
      if (err.message.includes("AUTH_ERROR")) setIsSettingsOpen(true);
      setAppState('CONFIGURING');
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Creative Studio Handlers ---

  const handleVariation = async (mode: VariationMode) => {
    if (!generatedImage) return;
    if (mode === VariationMode.REFINE && !refineText.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateJewelryVariation(generatedImage, mode, refineText);
      
      const newVariation: VariationItem = {
        id: Date.now().toString(),
        mode,
        image: result.image,
        description: mode === VariationMode.REFINE ? `修改: ${refineText}` : result.description
      };

      setVariations(prev => [...prev, newVariation]);
      
      if (mode === VariationMode.REFINE) {
        setGeneratedImage(result.image);
        setGeneratedDescription(result.description);
        setRefineText("");
        setIsRefining(false);
        // Also add refinements to history? Optional. 
        // Let's add significant refinements (text edits) to history as well
        addToRecentHistory(result.image, result.description);
      } else {
        setTimeout(() => variationsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }

    } catch (err: any) {
      setError("变体生成失败: " + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectVariation = (item: VariationItem) => {
    setGeneratedImage(item.image);
    setGeneratedDescription(item.description);
  };

  const handleToggleFavorite = (targetId?: string) => {
    // If saving from current view
    if (!targetId && (!originalImage || !generatedImage)) return;

    // Use current ID or create a new one if it's a fresh state not yet in history (edge case)
    const idToUse = targetId || currentDesignId || Date.now().toString();
    
    // Check if already in Saved Collection
    const existingIndex = savedCollection.findIndex(item => item.id === idToUse);

    if (existingIndex >= 0) {
      // Remove from Saved
      setSavedCollection(prev => prev.filter(item => item.id !== idToUse));
      if (idToUse === currentDesignId) setIsSaved(false);
    } else {
      // Add to Saved
      // We need the data. If it's the current view:
      if (idToUse === currentDesignId && originalImage && generatedImage) {
         const newItem: DesignHistoryItem = { 
            id: idToUse, 
            timestamp: Date.now(), 
            originalImage, 
            generatedImage, 
            designDescription: generatedDescription || undefined, 
            config: { ...config } 
         };
         setSavedCollection(prev => [newItem, ...prev]);
         setIsSaved(true);
      } else {
         // If toggling from history drawer (not current view), find it in history
         const historyItem = recentHistory.find(h => h.id === idToUse);
         if (historyItem) {
            setSavedCollection(prev => [historyItem, ...prev]);
         }
      }
    }
  };

  // Check if current design is saved when it changes
  useEffect(() => {
    if (currentDesignId) {
      setIsSaved(savedCollection.some(item => item.id === currentDesignId));
    } else {
      setIsSaved(false);
    }
  }, [currentDesignId, savedCollection]);

  const handleDownload = (imgUrl?: string) => {
    const target = imgUrl || generatedImage;
    if (target) {
      const link = document.createElement('a');
      link.href = target;
      link.download = `lumina-${Date.now()}.png`;
      link.click();
    }
  };

  const handleSelectHistoryItem = (item: DesignHistoryItem) => {
    setOriginalImage(item.originalImage);
    setGeneratedImage(item.generatedImage);
    setGeneratedDescription(item.designDescription || null);
    setConfig({ ...item.config, imageSize: item.config.imageSize || ImageSize.S_2K, aspectRatio: item.config.aspectRatio || AspectRatio.Square });
    setAppState('RESULT');
    setIsHistoryOpen(false);
    setCurrentDesignId(item.id);
    setVariations([]);
  };

  return (
    <div className="h-[100dvh] w-full bg-stone-50 text-stone-800 flex flex-col font-sans overflow-hidden">
      {/* Header - Changed to Sticky to prevent content overlap */}
      <header className="flex-none h-14 md:h-20 sticky top-0 z-40 flex items-center justify-between px-4 md:px-10 bg-white/90 backdrop-blur-md border-b border-stone-100 shadow-sm">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="text-champagne-400 p-1.5 rounded-full bg-stone-50 border border-stone-200"><Gem className="w-5 h-5 md:w-6 md:h-6" /></div>
          <div className="flex flex-col md:flex-row md:items-baseline md:gap-3">
            <h1 className="text-lg md:text-2xl font-serif font-bold text-stone-900 tracking-wide">LUMINA</h1>
            <span className="text-[10px] text-stone-400 uppercase tracking-[0.2em] font-medium hidden md:inline-block">Haute Joaillerie AI</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsSettingsOpen(true)} className="p-2.5 rounded-full hover:bg-stone-100 text-stone-500 hover:text-stone-800"><Settings className="w-5 h-5" /></button>
          <button onClick={() => setIsHistoryOpen(true)} className="group flex items-center gap-2 px-3 py-2 md:px-4 rounded-full hover:bg-stone-100 text-stone-500 hover:text-stone-800">
            <History className="w-5 h-5 group-hover:text-stone-800 transition-all" />
            <span className="hidden md:inline text-xs font-bold uppercase tracking-widest">历史 / 收藏</span>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex flex-col md:flex-row min-h-0">
        
        {/* Left Panel: Visual Workspace 
            Mobile: h-[40vh] to leave 60% for controls. 
            Desktop: flex-1
        */}
        <div className={`
          relative transition-all duration-700 w-full md:flex-1 bg-stone-50 
          ${originalImage ? 'h-[40vh] md:h-auto shrink-0 border-b md:border-b-0 md:border-r border-stone-100' : 'h-full'} 
          flex flex-col z-10
        `}>
          <div className="relative w-full h-full p-2 md:p-8 flex flex-col items-center justify-center overflow-hidden">
            {!originalImage ? (
              <div className="w-full max-w-sm aspect-square animate-fade-in-up px-4"><ImageUploader onImageSelected={handleImageSelected} /></div>
            ) : (
              <div className="flex flex-col w-full h-full gap-3 md:gap-4">
                 {/* Main Image Area */}
                 <div className="relative flex-1 w-full min-h-0 shadow-soft rounded-xl md:rounded-2xl overflow-hidden bg-white border border-stone-100 group">
                    {appState === 'RESULT' && generatedImage ? (
                        <ComparisonSlider originalImage={originalImage} generatedImage={generatedImage} />
                    ) : (
                      <>
                        <img src={originalImage} alt="Reference" className="w-full h-full object-contain p-4 md:p-6" />
                        <div className="absolute top-3 left-3 px-2 py-0.5 bg-white/90 backdrop-blur rounded-full text-[9px] font-bold tracking-widest text-stone-400 shadow-sm border border-stone-100">ORIGINAL</div>
                      </>
                    )}

                    {isGenerating && (
                      <div className="absolute inset-0 bg-stone-50/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                        <div className="relative mb-4 md:mb-6">
                           <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-stone-200 border-t-champagne-400 animate-spin"></div>
                           <Gem className="absolute inset-0 m-auto w-6 h-6 md:w-8 md:h-8 text-champagne-500 animate-pulse" />
                        </div>
                        <span className="font-serif text-sm md:text-lg text-stone-800 animate-pulse">{LOADING_STEPS[loadingStepIndex]}</span>
                      </div>
                    )}

                    {generatedImage && !isGenerating && (
                      <div className="absolute top-3 right-3 flex flex-col gap-2">
                         <button onClick={() => setOriginalImage(null)} className="p-2 bg-white/90 backdrop-blur rounded-full text-stone-400 hover:text-red-500 shadow-sm"><Trash2 className="w-4 h-4" /></button>
                         <button onClick={() => handleDownload()} className="p-2 bg-stone-900 text-white rounded-full hover:bg-stone-700 shadow-sm"><Download className="w-4 h-4" /></button>
                      </div>
                    )}
                 </div>

                 {/* Creative Studio / Variations Gallery - Fixed height on mobile */}
                 {appState === 'RESULT' && !isGenerating && (
                   <div className="h-20 md:h-32 w-full flex-shrink-0 flex gap-2 md:gap-3 overflow-x-auto custom-scrollbar px-1 pb-1">
                      {variations.map((v) => (
                        <div key={v.id} onClick={() => handleSelectVariation(v)} className="relative h-full aspect-square flex-shrink-0 rounded-lg overflow-hidden border-2 border-transparent hover:border-champagne-400 cursor-pointer group">
                           <img src={v.image} className="w-full h-full object-cover" />
                           <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-[8px] md:text-[9px] text-white text-center truncate">{v.description || v.mode}</div>
                        </div>
                      ))}
                      <div ref={variationsEndRef} />
                   </div>
                 )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Controls & Creative Studio 
            Mobile: flex-1 (taking remaining 60vh)
            Desktop: Fixed width
        */}
        <div className={`
          z-20 bg-white md:w-[400px] md:border-l border-stone-100 flex flex-col 
          ${originalImage ? 'flex-1 flex' : 'hidden md:flex flex-1'} 
          overflow-hidden
        `}>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            {appState === 'RESULT' && !isGenerating ? (
               /* Creative Studio Mode */
               <div className="p-5 md:p-6 space-y-6 md:space-y-8 animate-fade-in-up pb-24 md:pb-6">
                  <div className="space-y-1 md:space-y-2">
                    <h2 className="text-xl md:text-2xl font-serif text-stone-900 flex items-center gap-2">
                       <Wand2 className="w-5 h-5 text-champagne-500" /> 创意工坊
                    </h2>
                    <p className="text-[10px] md:text-xs text-stone-500">CREATIVE STUDIO & REFINEMENT</p>
                  </div>

                  <div className="space-y-3">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">智能修改 (Refine)</label>
                     <div className="flex gap-2">
                        <div className="relative flex-1">
                           <input 
                             type="text" 
                             value={refineText}
                             onChange={(e) => setRefineText(e.target.value)}
                             onKeyDown={(e) => e.key === 'Enter' && handleVariation(VariationMode.REFINE)}
                             placeholder="例如：改为玫瑰金..."
                             className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-4 pr-10 py-3 text-sm focus:border-champagne-400 outline-none"
                           />
                           <Edit className="absolute right-3 top-3 w-4 h-4 text-stone-400" />
                        </div>
                        <button 
                          onClick={() => handleVariation(VariationMode.REFINE)}
                          disabled={!refineText.trim()}
                          className="bg-stone-900 text-white p-3 rounded-xl disabled:opacity-50 hover:bg-stone-700 flex-shrink-0"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">一键生成 (Quick Gen)</label>
                     <div className="grid grid-cols-3 gap-2 md:gap-3">
                        <button onClick={() => handleVariation(VariationMode.VIEWS)} className="flex flex-col items-center justify-center gap-2 p-3 md:p-4 rounded-xl border border-stone-100 bg-stone-50 hover:border-champagne-400 hover:bg-white transition-all group">
                           <Layers className="w-5 h-5 md:w-6 md:h-6 text-stone-400 group-hover:text-champagne-500" />
                           <span className="text-[10px] font-bold text-stone-600">三视图</span>
                        </button>
                        <button onClick={() => handleVariation(VariationMode.MODEL)} className="flex flex-col items-center justify-center gap-2 p-3 md:p-4 rounded-xl border border-stone-100 bg-stone-50 hover:border-champagne-400 hover:bg-white transition-all group">
                           <User className="w-5 h-5 md:w-6 md:h-6 text-stone-400 group-hover:text-champagne-500" />
                           <span className="text-[10px] font-bold text-stone-600">模特试戴</span>
                        </button>
                        <button onClick={() => handleVariation(VariationMode.PHOTO)} className="flex flex-col items-center justify-center gap-2 p-3 md:p-4 rounded-xl border border-stone-100 bg-stone-50 hover:border-champagne-400 hover:bg-white transition-all group">
                           <Camera className="w-5 h-5 md:w-6 md:h-6 text-stone-400 group-hover:text-champagne-500" />
                           <span className="text-[10px] font-bold text-stone-600">摄影大片</span>
                        </button>
                     </div>
                  </div>

                  <div className="pt-4 border-t border-stone-100 flex flex-col gap-3">
                     <button onClick={() => handleToggleFavorite()} className={`w-full py-3 rounded-xl border font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isSaved ? 'bg-red-50 border-red-200 text-red-500' : 'border-stone-200 text-stone-600 hover:border-stone-400'}`}>
                        <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} /> {isSaved ? '已收藏' : '收藏设计'}
                     </button>
                     <button onClick={() => { setAppState('CONFIGURING'); setVariations([]); }} className="w-full py-3 text-stone-400 text-xs hover:text-stone-600">返回参数配置</button>
                  </div>
               </div>
            ) : (
               /* Config Mode */
               <div className="p-5 md:p-8 pb-32 md:pb-8">
                 <ConfigPanel config={config} setConfig={setConfig} onGenerate={handleGenerate} isGenerating={isGenerating} disabled={!originalImage} generatedDescription={generatedDescription} />
                 
                 {/* Mobile Sticky Button - Positioned absolute to the scroll container or fixed to bottom of panel */}
                 {originalImage && (
                    <div className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur border-t border-stone-100 z-50">
                      <button onClick={handleGenerate} disabled={isGenerating} className="w-full bg-stone-900 text-white py-3.5 rounded-xl font-bold tracking-[0.2em] uppercase flex items-center justify-center gap-2 shadow-xl disabled:opacity-50">
                        {isGenerating ? <Loader2 className="animate-spin w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                        {isGenerating ? 'GENERATING...' : 'GENERATE DESIGN'}
                      </button>
                    </div>
                 )}
               </div>
            )}
          </div>
        </div>

      </main>

      <HistoryDrawer 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        savedHistory={savedCollection}
        recentHistory={recentHistory}
        onSelect={handleSelectHistoryItem} 
        onDelete={(id, e) => { 
           e.stopPropagation(); 
           setSavedCollection(h => h.filter(i => i.id !== id)); 
        }}
        onToggleSave={(id, e) => {
           e.stopPropagation();
           handleToggleFavorite(id);
        }}
        savedIds={new Set(savedCollection.map(i => i.id))}
      />
      
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
             <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                <h3 className="font-serif text-lg text-stone-800">API Configuration</h3>
                <button onClick={() => setIsSettingsOpen(false)} className="text-stone-400 hover:text-stone-800"><X className="w-5 h-5" /></button>
             </div>
             <div className="p-6 space-y-4">
                <input type="password" value={settings.apiKey} onChange={(e) => setSettings({...settings, apiKey: e.target.value})} placeholder="API Key (sk-...)" className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm focus:border-champagne-400 outline-none" />
                <input type="text" value={settings.baseUrl} onChange={(e) => setSettings({...settings, baseUrl: e.target.value})} placeholder="Base URL" className="w-full bg-stone-50 border border-stone-200 rounded-lg px-4 py-3 text-sm focus:border-champagne-400 outline-none" />
                <button onClick={handleSaveSettings} className="w-full bg-stone-900 text-white py-3 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2"><Save className="w-4 h-4" /> Save Configuration</button>
             </div>
          </div>
        </div>
      )}
      
      {error && <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-50 text-red-600 px-6 py-3 rounded-full shadow-lg border border-red-100 text-sm z-50 animate-fade-in-up flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>{error}</div>}
    </div>
  );
}

export default App;
