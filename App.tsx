
import React, { useState, useEffect, useRef } from 'react';
import { DesignConfig, MetalType, GemstoneType, JewelryType, ViewAngle, ImageSize, AspectRatio, AppState, DesignHistoryItem, AppSettings, VariationMode, VariationItem } from './types';
import { generateJewelryDesign, generateJewelryVariation, generateDesignConcept } from './services/geminiService';
import ComparisonSlider from './components/ComparisonSlider';
import ConfigPanel from './components/ConfigPanel';
import ImageUploader from './components/ImageUploader';
import CreativeCanvas from './components/CreativeCanvas';
import HistoryDrawer from './components/HistoryDrawer';
import { Gem, Download, Trash2, Loader2, Sparkles, Heart, Settings, X, Save, Wand2, Layers, User, Camera, Send, Edit, History, ArrowLeft, Feather, ChevronDown, ChevronUp, PauseCircle, AlertTriangle, Maximize2, Eye, PenTool, Image as ImageIcon } from 'lucide-react';

const LOADING_STEPS = ["Analyzing Geometry...", "Refining Details...", "Simulating Light...", "Mastering Texture..."];

function App() {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedDescription, setGeneratedDescription] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStepIndex, setLoadingStepIndex] = useState(0);
  
  // Input Mode: Upload vs Canvas
  const [inputMode, setInputMode] = useState<'upload' | 'canvas'>('upload');

  // Task Control
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showStopWarning, setShowStopWarning] = useState(false);

  // Zoom/Lightbox Control
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [showOriginalInZoom, setShowOriginalInZoom] = useState(false); // Press to compare logic

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
  const [showDescription, setShowDescription] = useState(true);

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
    setShowDescription(true);
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

  // --- Task Control Handlers ---

  const handleStopRequest = () => {
    setShowStopWarning(true);
  };

  const confirmStopTask = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
    setShowStopWarning(false);
    // Don't modify image state, just leave it as is (or keep previous result)
  };

  const cancelStopTask = () => {
    setShowStopWarning(false);
  };

  const handleGenerate = async () => {
    if (!originalImage) return;
    if (!settings.apiKey && !process.env.API_KEY) { setIsSettingsOpen(true); setError("请先配置 API Key"); return; }
    
    // Reset Abort Controller
    abortControllerRef.current = new AbortController();

    setIsGenerating(true);
    setError(null);
    setAppState('GENERATING');
    setGeneratedDescription(null);
    setIsSaved(false);
    setCurrentDesignId(null);
    setVariations([]); 
    setShowDescription(true);

    try {
      // Step 1: Generate Image
      // Note: We are not passing signal to service yet, but we check logic after await
      const imageResult = await generateJewelryDesign(originalImage, config);
      if (abortControllerRef.current?.signal.aborted) return;

      setGeneratedImage(imageResult.image);
      setGeneratedDescription("正在撰写设计理念..."); // Placeholder
      setAppState('RESULT'); // Show result immediately

      // Create the Base Variation Item Immediately
      const baseId = Date.now().toString();
      const baseItem: VariationItem = {
        id: baseId,
        mode: VariationMode.ORIGINAL,
        image: imageResult.image,
        description: "正在撰写设计理念..."
      };
      setVariations([baseItem]);

      // Step 2: Generate Concept Text (using original image as context)
      const conceptText = await generateDesignConcept(originalImage, config);
      if (abortControllerRef.current?.signal.aborted) return;

      setGeneratedDescription(conceptText);
      
      // Update the base item with the actual description
      setVariations(prev => prev.map(v => v.id === baseId ? { ...v, description: conceptText } : v));
      
      // Save history with full data
      addToRecentHistory(imageResult.image, conceptText);

    } catch (err: any) {
      if (abortControllerRef.current?.signal.aborted) return;
      setError(err.message.includes("AUTH_ERROR") ? err.message.replace("AUTH_ERROR: ", "") : (err.message || '生成失败'));
      if (err.message.includes("AUTH_ERROR")) setIsSettingsOpen(true);
      setAppState('CONFIGURING');
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsGenerating(false);
      }
    }
  };

  // --- Creative Studio Handlers ---

  const handleVariation = async (mode: VariationMode) => {
    if (!generatedImage) return;
    if (mode === VariationMode.REFINE && !refineText.trim()) return;

    // Reset Abort Controller
    abortControllerRef.current = new AbortController();

    setIsGenerating(true);
    setError(null);

    try {
      const result = await generateJewelryVariation(generatedImage, mode, refineText);
      if (abortControllerRef.current?.signal.aborted) return;
      
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
        addToRecentHistory(result.image, result.description);
      } else {
        setTimeout(() => variationsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }

    } catch (err: any) {
      if (abortControllerRef.current?.signal.aborted) return;
      setError("变体生成失败: " + err.message);
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setIsGenerating(false);
      }
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
    setVariations([{
      id: item.id,
      mode: VariationMode.ORIGINAL,
      image: item.generatedImage,
      description: item.designDescription || '历史记录'
    }]);

    setShowDescription(true);
  };

  const getVariationLabel = (v: VariationItem) => {
    if (v.mode === VariationMode.ORIGINAL) return "原创设计";
    if (v.mode === VariationMode.REFINE) return "细节调整";
    if (v.mode === VariationMode.VIEWS) return "三视图";
    if (v.mode === VariationMode.MODEL) return "模特佩戴";
    if (v.mode === VariationMode.PHOTO) return "摄影大片";
    return v.description || "变体";
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
        
        {/* Left Panel: Visual Workspace */}
        <div className={`
          relative transition-all duration-700 w-full md:flex-1 bg-stone-50 
          ${originalImage ? 'h-[40vh] md:h-auto shrink-0 border-b md:border-b-0 md:border-r border-stone-100' : 'h-full'} 
          flex flex-col z-10
        `}>
          <div className="relative w-full h-full p-2 md:p-8 flex flex-col items-center justify-center overflow-hidden">
            {!originalImage ? (
              <div className="w-full h-full flex flex-col">
                {/* Input Mode Toggle */}
                <div className="flex-none flex justify-center pb-4 z-20">
                   <div className="flex bg-white/80 backdrop-blur rounded-full p-1 border border-stone-200 shadow-sm">
                      <button 
                        onClick={() => setInputMode('upload')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${inputMode === 'upload' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:text-stone-800'}`}
                      >
                         <ImageIcon className="w-3.5 h-3.5" /> 上传照片
                      </button>
                      <button 
                        onClick={() => setInputMode('canvas')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${inputMode === 'canvas' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:text-stone-800'}`}
                      >
                         <PenTool className="w-3.5 h-3.5" /> 手绘草图
                      </button>
                   </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 min-h-0 w-full max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-soft border border-stone-100 bg-white animate-fade-in-up">
                   {inputMode === 'upload' ? (
                      <ImageUploader onImageSelected={handleImageSelected} />
                   ) : (
                      <CreativeCanvas 
                        onConfirm={handleImageSelected} 
                        onCancel={() => setInputMode('upload')}
                      />
                   )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col w-full h-full gap-3 md:gap-4">
                 {/* Main Image Area */}
                 <div className="relative flex-1 w-full min-h-0 shadow-soft rounded-xl md:rounded-2xl overflow-hidden bg-white border border-stone-100 group">
                    {generatedImage ? (
                        <ComparisonSlider 
                          originalImage={originalImage} 
                          generatedImage={generatedImage} 
                          onImageClick={() => setIsImageZoomed(true)}
                        />
                    ) : (
                      <>
                        <img src={originalImage} alt="Reference" className="w-full h-full object-contain p-4 md:p-6" />
                        <div className="absolute top-3 left-3 px-2 py-0.5 bg-white/90 backdrop-blur rounded-full text-[9px] font-bold tracking-widest text-stone-400 shadow-sm border border-stone-100">ORIGINAL</div>
                      </>
                    )}

                    {/* REFINED LOADING OVERLAY */}
                    {isGenerating && (
                      <div className="absolute inset-0 bg-white/85 backdrop-blur-md z-50 flex flex-col items-center justify-center animate-fade-in transition-all duration-500">
                        <div className="relative mb-10 p-10 animate-float">
                          <div className="absolute inset-0 bg-champagne-400/20 blur-[60px] rounded-full animate-pulse-slow"></div>
                          <div className="absolute inset-0 rounded-full border border-stone-100/50"></div>
                          <div className="absolute inset-0 rounded-full border border-t-champagne-300/50 border-r-transparent border-b-transparent border-l-transparent animate-spin-slow"></div>
                          <div className="absolute inset-3 rounded-full border border-b-champagne-500/80 border-t-transparent border-r-transparent border-l-transparent animate-spin-reverse-slower"></div>
                          <div className="relative z-10 flex items-center justify-center w-full h-full">
                            <Gem className="w-10 h-10 md:w-12 md:h-12 text-champagne-500 drop-shadow-[0_4px_10px_rgba(212,175,55,0.4)] animate-pulse-gold" strokeWidth={1} />
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-4 relative z-10 h-20">
                          <span key={loadingStepIndex} className="font-serif text-lg md:text-xl text-stone-800 tracking-wide animate-fade-in-up">{LOADING_STEPS[loadingStepIndex]}</span>
                          <div className="w-40 md:w-56 h-[2px] bg-stone-100 rounded-full overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-champagne-500 to-transparent w-1/2 animate-[shimmer_1.5s_infinite]"></div>
                          </div>
                        </div>
                        <button onClick={handleStopRequest} className="mt-6 flex items-center gap-2 px-6 py-2.5 rounded-full border border-stone-200 bg-white/80 hover:bg-stone-50 text-stone-400 hover:text-red-500 transition-all shadow-sm text-[10px] font-bold uppercase tracking-widest group opacity-0 animate-fade-in delay-700 fill-mode-forwards">
                          <PauseCircle className="w-4 h-4 group-hover:text-red-500 transition-colors" /> Stop Generation
                        </button>
                      </div>
                    )}

                    {generatedImage && !isGenerating && (
                      <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
                         <button onClick={() => setOriginalImage(null)} className="p-2 bg-white/90 backdrop-blur rounded-full text-stone-400 hover:text-red-500 shadow-sm" title="Delete"><Trash2 className="w-4 h-4" /></button>
                         <button onClick={() => handleDownload()} className="p-2 bg-stone-900 text-white rounded-full hover:bg-stone-700 shadow-sm" title="Download"><Download className="w-4 h-4" /></button>
                         <button onClick={() => setIsImageZoomed(true)} className="p-2 bg-white/90 backdrop-blur rounded-full text-stone-600 hover:text-champagne-500 shadow-sm" title="Full Screen"><Maximize2 className="w-4 h-4" /></button>
                      </div>
                    )}
                 </div>

                 {/* Creative Studio / Variations Gallery */}
                 {appState === 'RESULT' && !isGenerating && (
                   <div className="h-20 md:h-32 w-full flex-shrink-0 flex gap-2 md:gap-3 overflow-x-auto custom-scrollbar px-1 pb-1">
                      {variations.map((v) => (
                        <div key={v.id} onClick={() => handleSelectVariation(v)} className={`relative h-full aspect-square flex-shrink-0 rounded-lg overflow-hidden cursor-pointer group transition-all duration-300 ${generatedImage === v.image ? 'border-2 border-champagne-500 ring-2 ring-champagne-200' : 'border border-stone-200 hover:border-champagne-300'}`}>
                           <img src={v.image} className="w-full h-full object-cover" />
                           <div className={`absolute bottom-0 inset-x-0 p-1 text-[8px] md:text-[9px] text-white text-center truncate ${generatedImage === v.image ? 'bg-champagne-600/90' : 'bg-black/60'}`}>{getVariationLabel(v)}</div>
                        </div>
                      ))}
                      <div ref={variationsEndRef} />
                   </div>
                 )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Controls & Creative Studio */}
        <div className={`
          z-20 bg-white md:w-[400px] md:border-l border-stone-100 flex flex-col 
          ${originalImage ? 'flex-1 flex' : 'hidden md:flex flex-1'} 
          overflow-hidden
        `}>
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            {appState === 'RESULT' ? (
               <div className="p-5 md:p-6 space-y-6 md:space-y-8 animate-fade-in-up pb-24 md:pb-6">
                  {/* ... (Existing Creative Studio Content) ... */}
                  <div className="space-y-1 md:space-y-2">
                    <h2 className="text-xl md:text-2xl font-serif text-stone-900 flex items-center gap-2"><Wand2 className="w-5 h-5 text-champagne-500" /> 创意工坊</h2>
                    <p className="text-[10px] md:text-xs text-stone-500">CREATIVE STUDIO & REFINEMENT</p>
                  </div>

                  {generatedDescription && (
                    <div className="animate-fade-in-up delay-100">
                      <button onClick={() => setShowDescription(!showDescription)} className="w-full flex items-center justify-between mb-2 group">
                         <div className="flex items-center gap-2"><div className="h-px w-6 bg-champagne-400"></div><span className="font-serif text-stone-900 text-sm tracking-wide italic">Design Concept</span></div>
                         <div className="text-stone-400 group-hover:text-champagne-500 transition-colors">{showDescription ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</div>
                      </button>
                      {showDescription && (
                        <div className="relative bg-[#FFFCF9] border border-stone-200 rounded-lg shadow-[0_15px_30px_-10px_rgba(0,0,0,0.08)] overflow-hidden transition-all duration-300">
                          <div className="h-1 w-full bg-gradient-to-r from-stone-200 via-champagne-400 to-stone-200 opacity-50"></div>
                          <div className="p-5 md:p-6 relative">
                             <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] pointer-events-none transform rotate-12"><Feather className="w-32 h-32 text-stone-900" /></div>
                             <div className="relative z-10"><p className="font-serif text-stone-600 text-sm md:text-[15px] leading-7 text-justify tracking-wide first-letter:text-2xl first-letter:font-serif first-letter:text-champagne-500 first-letter:float-left first-letter:mr-1.5 first-letter:mt-[-2px]">{generatedDescription}</p></div>
                             <div className="mt-4 flex justify-between items-end border-t border-stone-100 pt-3">
                                <div className="flex flex-col"><span className="text-[9px] text-stone-400 uppercase tracking-widest font-sans">Date</span><span className="text-[10px] text-stone-600 font-serif">{new Date().toLocaleDateString()}</span></div>
                                <div className="flex flex-col items-end"><span className="text-[9px] text-stone-400 uppercase tracking-widest font-sans">Designed by</span><span className="font-serif text-stone-800 text-xs italic">Lumina AI Atelier</span></div>
                             </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-3">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">智能修改 (Refine)</label>
                     <div className="flex gap-2">
                        <div className="relative flex-1">
                           <input type="text" value={refineText} onChange={(e) => setRefineText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleVariation(VariationMode.REFINE)} disabled={isGenerating} placeholder="例如：改为玫瑰金..." className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-4 pr-10 py-3 text-sm focus:border-champagne-400 outline-none disabled:opacity-50 disabled:cursor-not-allowed" />
                           <Edit className="absolute right-3 top-3 w-4 h-4 text-stone-400" />
                        </div>
                        <button onClick={() => handleVariation(VariationMode.REFINE)} disabled={!refineText.trim() || isGenerating} className="bg-stone-900 text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-stone-700 flex-shrink-0 transition-all"><Send className="w-4 h-4" /></button>
                     </div>
                  </div>

                  <div className="space-y-3">
                     <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400">一键生成 (Quick Gen)</label>
                     <div className="grid grid-cols-3 gap-2 md:gap-3">
                        {[
                          { mode: VariationMode.VIEWS, icon: Layers, label: '三视图' },
                          { mode: VariationMode.MODEL, icon: User, label: '模特试戴' },
                          { mode: VariationMode.PHOTO, icon: Camera, label: '摄影大片' }
                        ].map((btn) => (
                           <button key={btn.mode} onClick={() => handleVariation(btn.mode)} disabled={isGenerating} className="flex flex-col items-center justify-center gap-2 p-3 md:p-4 rounded-xl border border-stone-100 bg-stone-50 hover:border-champagne-400 hover:bg-white transition-all group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-stone-50 disabled:hover:border-stone-100">
                              <btn.icon className="w-5 h-5 md:w-6 md:h-6 text-stone-400 group-hover:text-champagne-500 disabled:group-hover:text-stone-400" />
                              <span className="text-[10px] font-bold text-stone-600">{btn.label}</span>
                           </button>
                        ))}
                     </div>
                  </div>

                  <div className="pt-4 border-t border-stone-100 flex flex-col gap-3">
                     <button onClick={() => handleToggleFavorite()} disabled={isGenerating} className={`w-full py-3 rounded-xl border font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${isSaved ? 'bg-red-50 border-red-200 text-red-500' : 'border-stone-200 text-stone-600 hover:border-stone-400'} disabled:opacity-50 disabled:cursor-not-allowed`}>
                        <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} /> {isSaved ? '已收藏' : '收藏设计'}
                     </button>
                     <button onClick={() => setAppState('CONFIGURING')} disabled={isGenerating} className="w-full py-3 text-stone-400 text-xs hover:text-stone-600 disabled:opacity-50 disabled:cursor-not-allowed">返回参数配置</button>
                  </div>
               </div>
            ) : (
               /* Config Mode */
               <div className="p-5 md:p-8 pb-32 md:pb-8">
                 {generatedImage && (
                    <button onClick={() => setAppState('RESULT')} className="w-full mb-6 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-stone-200 transition-all border border-stone-200 hover:border-stone-300">
                       <Wand2 className="w-4 h-4 text-champagne-500" /> 返回创意工坊
                    </button>
                 )}
                 <ConfigPanel config={config} setConfig={setConfig} onGenerate={handleGenerate} isGenerating={isGenerating} disabled={!originalImage} />
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

      {/* History Drawer */}
      <HistoryDrawer 
        isOpen={isHistoryOpen} 
        onClose={() => setIsHistoryOpen(false)} 
        savedHistory={savedCollection}
        recentHistory={recentHistory}
        onSelect={handleSelectHistoryItem} 
        onDelete={(id, e) => { e.stopPropagation(); setSavedCollection(h => h.filter(i => i.id !== id)); }}
        onToggleSave={(id, e) => { e.stopPropagation(); handleToggleFavorite(id); }}
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

      {/* Stop Warning Modal */}
      {showStopWarning && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
              <div className="p-6 text-center space-y-4">
                 <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto"><AlertTriangle className="w-6 h-6 text-red-500" /></div>
                 <h3 className="text-lg font-serif font-bold text-stone-900">确认停止生成？</h3>
                 <p className="text-sm text-stone-600 leading-relaxed">停止当前任务将无法获得结果，但系统<span className="font-bold text-red-500">依然会扣除</span>本次生成的算力费用。</p>
                 <div className="flex gap-3 pt-2">
                    <button onClick={cancelStopTask} className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold uppercase tracking-wider">继续生成</button>
                    <button onClick={confirmStopTask} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider">确认停止</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Full Screen Image Modal */}
      {isImageZoomed && generatedImage && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl animate-fade-in flex flex-col">
          <div className="flex-none p-4 md:p-6 flex justify-between items-center text-white/80">
             <div className="flex items-center gap-3"><span className="text-xs font-bold tracking-[0.2em] uppercase text-champagne-400">Preview Mode</span></div>
             <button onClick={() => setIsImageZoomed(false)} className="p-2 rounded-full hover:bg-white/10 transition-colors"><X className="w-6 h-6" /></button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-hidden relative select-none">
             <img src={showOriginalInZoom && originalImage ? originalImage : generatedImage} className="max-w-full max-h-full object-contain shadow-2xl transition-opacity duration-200" style={{ opacity: 1 }} />
             {originalImage && (
               <button onMouseDown={() => setShowOriginalInZoom(true)} onMouseUp={() => setShowOriginalInZoom(false)} onMouseLeave={() => setShowOriginalInZoom(false)} onTouchStart={() => setShowOriginalInZoom(true)} onTouchEnd={() => setShowOriginalInZoom(false)} className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-2.5 rounded-full text-xs font-bold tracking-widest hover:bg-white/20 transition-all flex items-center gap-2 select-none active:scale-95">
                 <Eye className="w-4 h-4" /> {showOriginalInZoom ? '松开恢复' : '按住对比原图'}
               </button>
             )}
          </div>
        </div>
      )}
      
      {error && <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-50 text-red-600 px-6 py-3 rounded-full shadow-lg border border-red-100 text-sm z-50 animate-fade-in-up flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>{error}</div>}
    </div>
  );
}

export default App;
