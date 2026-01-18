import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Pencil, Eraser, Move, Undo2, Trash2, Check, X, Palette, Circle, Star, Heart, Sparkles, SlidersHorizontal, ZoomIn, ZoomOut, Hand, Maximize, GripVertical, RotateCw } from 'lucide-react';

// --- Assets / Icons for Gems ---
const GEM_ASSETS = [
  { id: 'diamond_round', name: '圆钻', color: '#E2E8F0', border: '#94A3B8', shape: 'circle' },
  { id: 'ruby_pear', name: '红宝', color: '#DC2626', border: '#991B1B', shape: 'pear' },
  { id: 'sapphire_oval', name: '蓝宝', color: '#2563EB', border: '#1E40AF', shape: 'oval' },
  { id: 'emerald_rect', name: '祖母绿', color: '#059669', border: '#065F46', shape: 'rect' },
  { id: 'pearl', name: '珍珠', color: '#FDF4FF', border: '#E8D5C4', shape: 'circle' },
  { id: 'gold_bead', name: '金珠', color: '#FCD34D', border: '#B45309', shape: 'circle' },
];

interface GemObject {
  uniqueId: string;
  typeId: string;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

interface CreativeCanvasProps {
  onConfirm: (base64: string) => void;
  onCancel: () => void;
}

type Tool = 'pencil' | 'marker' | 'gold' | 'eraser' | 'move' | 'hand';
type BrushTip = 'round' | 'star' | 'heart' | 'sparkle';

const CreativeCanvas: React.FC<CreativeCanvasProps> = ({ onConfirm, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null); // Refers to the canvas wrapper div specifically
  const transformLayerRef = useRef<HTMLDivElement>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  
  // Tool State
  const [tool, setTool] = useState<Tool>('pencil');
  
  // Brush Settings
  const [brushSize, setBrushSize] = useState(2);
  const [opacity, setOpacity] = useState(1);
  const [brushTip, setBrushTip] = useState<BrushTip>('round');
  const [brushColor, setBrushColor] = useState('#57534E');

  // Floating Panel State
  const [settingsOffset, setSettingsOffset] = useState({ x: 0, y: 0 });

  // Canvas View State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Interaction State
  const [isDrawing, setIsDrawing] = useState(false);
  const [gems, setGems] = useState<GemObject[]>([]);
  const [selectedGemId, setSelectedGemId] = useState<string | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  
  // Dragging/Resizing/Rotating Logic
  const [isDraggingGem, setIsDraggingGem] = useState(false);
  const [isResizingGem, setIsResizingGem] = useState(false);
  const [isRotatingGem, setIsRotatingGem] = useState(false);
  
  // Drawing Interpolation
  const lastPos = useRef<{x: number, y: number} | null>(null);
  const panStart = useRef<{x: number, y: number} | null>(null);

  // Init Canvas
  useEffect(() => {
    // Use containerRef to get the actual visual size of the canvas area
    if (canvasRef.current && containerRef.current) {
      const canvas = canvasRef.current;
      const parent = containerRef.current;
      
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
      
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height); // White bg
        setContext(ctx);
        saveHistory(ctx); // Save initial blank state
      }
    }
  }, []);

  // Update brush defaults when tool changes
  useEffect(() => {
    if (tool === 'pencil') {
      setBrushSize(2);
      setOpacity(0.8);
      setBrushTip('round');
      setBrushColor('#57534E');
    } else if (tool === 'marker') {
      setBrushSize(6);
      setOpacity(0.9);
      setBrushTip('round');
      setBrushColor('#292524');
    } else if (tool === 'gold') {
      setBrushSize(4);
      setOpacity(1);
      setBrushTip('round');
      setBrushColor('#D4AF37');
    } else if (tool === 'eraser') {
      setBrushSize(20);
      setOpacity(1);
      setBrushTip('round');
    }
  }, [tool]);

  const saveHistory = (ctx: CanvasRenderingContext2D) => {
    if (!canvasRef.current) return;
    const data = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHistory(prev => [...prev.slice(-19), data]); // Keep last 20
  };

  const handleUndo = () => {
    if (history.length <= 1 || !context || !canvasRef.current) return;
    const newHistory = [...history];
    newHistory.pop(); // Remove current state
    const previousState = newHistory[newHistory.length - 1];
    context.putImageData(previousState, 0, 0);
    setHistory(newHistory);
  };

  const clearCanvas = () => {
    if (!context || !canvasRef.current) return;
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setGems([]);
    saveHistory(context);
    // Reset view
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // --- Geometry Helpers ---
  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  };

  const drawHeart = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number) => {
    const height = width; 
    const topY = y - height/3;
    ctx.beginPath();
    ctx.moveTo(x, topY);
    ctx.bezierCurveTo(x, topY - height/4, x - width/2, topY - height/4, x - width/2, topY + height/4);
    ctx.bezierCurveTo(x - width/2, topY + height/2, x, y + height/2, x, y + height/2);
    ctx.bezierCurveTo(x, y + height/2, x + width/2, topY + height/2, x + width/2, topY + height/4);
    ctx.bezierCurveTo(x + width/2, topY - height/4, x, topY - height/4, x, topY);
    ctx.fill();
  };

  const drawSparkle = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    drawStar(ctx, x, y, 4, size/2, size/8);
  };

  const drawShapePoint = (ctx: CanvasRenderingContext2D, x: number, y: number, tip: BrushTip, size: number, color: string) => {
     ctx.fillStyle = color;
     if (tip === 'round') {
        ctx.beginPath();
        ctx.arc(x, y, size/2, 0, Math.PI * 2);
        ctx.fill();
     } else if (tip === 'star') {
        drawStar(ctx, x, y, 5, size/2, size/4);
     } else if (tip === 'heart') {
        drawHeart(ctx, x, y, size);
     } else if (tip === 'sparkle') {
        drawSparkle(ctx, x, y, size);
     }
  };

  // --- Zoom & Pan Helpers ---

  const handleZoom = (delta: number) => {
    setZoom(prev => {
      const newZoom = Math.max(0.5, Math.min(5, prev + delta));
      return newZoom;
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    // If holding Ctrl, zoom
    if (e.ctrlKey || e.metaKey || (tool as string) === 'hand') {
       e.preventDefault();
       const delta = e.deltaY > 0 ? -0.1 : 0.1;
       handleZoom(delta);
    } 
    // Otherwise standard scroll if overflow exists (but we are using transform translate, so we can manual pan with wheel too if needed)
    // For now, let's keep wheel for zoom mainly when intention is clear, or panning if in Hand tool
    else if (tool === 'hand') {
       // Pan
       setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  // --- Pointer Coordinates Mapping ---

  const getCanvasPoint = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    // Use getBoundingClientRect which accounts for the CSS transform (scale/translate) on the parent or itself
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Scale factors (should be 1 if 1:1 pixel mapping, but good for robustness)
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const getToolColor = () => {
    if (tool === 'eraser') return '#FFFFFF';
    return brushColor; 
  };

  // --- Interaction Handlers ---

  const startInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    // Handle Hand Tool Pan Start
    if (tool === 'hand') {
      setIsPanning(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      panStart.current = { x: clientX - pan.x, y: clientY - pan.y };
      return;
    }

    // Handle Gem Move/Resize/Rotate is handled in the Gem element events directly
    if (isDraggingGem || isResizingGem || isRotatingGem) return;
    
    // Handle Drawing
    if (tool !== 'move' && context) {
      setIsDrawing(true);
      const pos = getCanvasPoint(e);
      lastPos.current = pos;

      context.globalAlpha = opacity;
      const color = getToolColor();

      if (tool === 'eraser') {
        context.globalCompositeOperation = 'destination-out'; 
        context.beginPath();
        context.moveTo(pos.x, pos.y);
        context.lineWidth = brushSize; // Eraser size independent of zoom usually, but here scaled with canvas
        context.lineCap = 'round';
        context.lineJoin = 'round';
      } else {
        context.globalCompositeOperation = 'source-over';
        if (brushTip === 'round' && opacity === 1) {
           context.beginPath();
           context.fillStyle = color;
           context.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
           context.fill();
           context.beginPath();
           context.moveTo(pos.x, pos.y);
           context.strokeStyle = color;
           context.lineWidth = brushSize;
        } else {
           drawShapePoint(context, pos.x, pos.y, brushTip, brushSize, color);
        }
      }
    }
  };

  const moveInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();

    // Pan
    if (isPanning && panStart.current) {
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      setPan({
        x: clientX - panStart.current.x,
        y: clientY - panStart.current.y
      });
      return;
    }

    if (isDrawing && context && lastPos.current) {
      const { x, y } = getCanvasPoint(e);
      const color = getToolColor();

      if (tool === 'eraser') {
        context.lineTo(x, y);
        context.stroke();
        lastPos.current = { x, y };
        return;
      }

      if (brushTip === 'round' && opacity === 1) {
         context.lineTo(x, y);
         context.stroke();
      } else {
         const dist = Math.hypot(x - lastPos.current.x, y - lastPos.current.y);
         const angle = Math.atan2(y - lastPos.current.y, x - lastPos.current.x);
         const step = brushTip === 'round' ? Math.max(1, brushSize * 0.1) : Math.max(5, brushSize * 0.8);
         
         for (let i = 0; i < dist; i += step) {
             const px = lastPos.current.x + Math.cos(angle) * i;
             const py = lastPos.current.y + Math.sin(angle) * i;
             drawShapePoint(context, px, py, brushTip, brushSize, color);
         }
      }
      lastPos.current = { x, y };
    }
  };

  const endInteraction = () => {
    if (isPanning) {
      setIsPanning(false);
      panStart.current = null;
    }

    if (isDrawing && context) {
      if (tool === 'eraser' || (brushTip === 'round' && opacity === 1)) {
        context.closePath();
      }
      setIsDrawing(false);
      lastPos.current = null;
      context.globalAlpha = 1; 
      context.globalCompositeOperation = 'source-over';
      saveHistory(context);
    }
  };

  // --- Dragging Logic for Panel ---
  const handlePanelDragStart = (e: React.PointerEvent) => {
    // Avoid dragging when clicking on inputs or buttons
    if ((e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('button')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startOffset = { ...settingsOffset };
    
    // Explicitly type events for window listeners
    const handleMove = (ev: PointerEvent) => {
      ev.preventDefault();
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setSettingsOffset({ x: startOffset.x + dx, y: startOffset.y + dy });
    };

    const handleUp = (ev: PointerEvent) => {
      ev.preventDefault();
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  // --- Gem Handlers ---

  const addGem = (typeId: string) => {
    if (!canvasRef.current) return;
    // Add gem to center of current view
    // Reverse project from center of container to canvas coords
    const rect = canvasRef.current.getBoundingClientRect();
    const centerX = rect.width / 2; // Relative to canvas visual
    const centerY = rect.height / 2;
    
    // Map back to internal coordinates
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    const newGem: GemObject = {
      uniqueId: Date.now().toString(),
      typeId,
      x: centerX * scaleX - 20, // Centered
      y: centerY * scaleY - 20,
      size: 40,
      rotation: 0
    };
    setGems([...gems, newGem]);
    setSelectedGemId(newGem.uniqueId);
    setTool('move'); 
  };

  const removeSelectedGem = () => {
    if (selectedGemId) {
      setGems(gems.filter(g => g.uniqueId !== selectedGemId));
      setSelectedGemId(null);
    }
  };

  // --- Export ---
  
  const handleExport = async () => {
    if (!canvasRef.current) return;
    
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(canvasRef.current, 0, 0);

    gems.forEach(gem => {
      const asset = GEM_ASSETS.find(a => a.id === gem.typeId);
      if (!asset) return;
      
      const cx = gem.x + gem.size / 2;
      const cy = gem.y + gem.size / 2;
      const r = gem.size / 2;

      tempCtx.save();
      tempCtx.translate(cx, cy);
      tempCtx.rotate((gem.rotation || 0) * Math.PI / 180);

      tempCtx.fillStyle = asset.color;
      tempCtx.strokeStyle = asset.border;
      tempCtx.lineWidth = 2;
      // Drawing logic assumes center is at (0,0) after translation
      
      if (asset.shape === 'circle') {
        tempCtx.beginPath();
        tempCtx.arc(0, 0, r, 0, Math.PI * 2);
        tempCtx.fill();
        tempCtx.stroke();
        tempCtx.fillStyle = 'rgba(255,255,255,0.6)';
        tempCtx.beginPath();
        tempCtx.arc(-r/3, -r/3, r/4, 0, Math.PI * 2);
        tempCtx.fill();
      } else if (asset.shape === 'rect') {
        tempCtx.fillRect(-r, -r, gem.size, gem.size);
        tempCtx.strokeRect(-r, -r, gem.size, gem.size);
        tempCtx.strokeRect(-r * 0.6, -r * 0.6, gem.size * 0.6, gem.size * 0.6);
      } else if (asset.shape === 'oval') {
        tempCtx.beginPath();
        tempCtx.ellipse(0, 0, r, r * 1.3, 0, 0, Math.PI * 2);
        tempCtx.fill();
        tempCtx.stroke();
      } else if (asset.shape === 'pear') {
        tempCtx.beginPath();
        tempCtx.arc(0, r/2, r, 0, Math.PI, false);
        tempCtx.lineTo(0, -r * 1.5);
        tempCtx.closePath();
        tempCtx.fill();
        tempCtx.stroke();
      }
      tempCtx.restore();
    });

    const base64 = tempCanvas.toDataURL('image/png');
    onConfirm(base64);
  };

  return (
    <div className="flex flex-col h-full bg-stone-50 select-none">
      {/* Toolbar Top */}
      <div className="flex items-center justify-between p-2 border-b border-stone-200 bg-white shadow-sm z-10 shrink-0">
         <div className="flex gap-1">
             <button onClick={onCancel} className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
             <button onClick={handleUndo} className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg"><Undo2 className="w-5 h-5" /></button>
             <button onClick={clearCanvas} className="p-2 text-stone-500 hover:bg-red-50 hover:text-red-500 rounded-lg"><Trash2 className="w-5 h-5" /></button>
             
             {/* Divider */}
             <div className="w-px h-6 bg-stone-200 mx-2 hidden md:block"></div>
             
             {/* Zoom Controls */}
             <div className="hidden md:flex items-center">
                <button onClick={() => handleZoom(-0.2)} className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg"><ZoomOut className="w-5 h-5" /></button>
                <span className="text-xs font-mono w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => handleZoom(0.2)} className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg"><ZoomIn className="w-5 h-5" /></button>
                <button onClick={() => { setZoom(1); setPan({x:0, y:0}); }} className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg" title="Reset View"><Maximize className="w-4 h-4" /></button>
             </div>
         </div>
         <div className="flex items-center gap-2">
            <button 
              onClick={handleExport}
              className="bg-stone-900 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-stone-700 shadow-md transition-all active:scale-95"
            >
              <Check className="w-4 h-4" /> 使用设计
            </button>
         </div>
      </div>

      {/* Main Content Area - Flex Col on Mobile, Row on Desktop */}
      <div className="flex flex-col md:flex-row flex-1 relative overflow-hidden">
         
         {/* Main Canvas Container */}
         <div 
            className={`flex flex-1 relative overflow-hidden bg-stone-100 ${tool === 'hand' ? 'cursor-grab active:cursor-grabbing' : ''}`}
            ref={containerRef}
            onWheel={handleWheel}
         >
             {/* Floating Brush Settings - Draggable */}
             {tool !== 'move' && tool !== 'hand' && (
               <div 
                  className="absolute top-4 left-1/2 bg-white/95 backdrop-blur-md pl-2 pr-4 py-2 rounded-full shadow-lg border border-stone-100 flex items-center gap-3 z-[60] animate-fade-in touch-none cursor-move select-none"
                  style={{
                    transform: `translateX(-50%) translate(${settingsOffset.x}px, ${settingsOffset.y}px)`,
                  }}
                  onPointerDown={handlePanelDragStart}
               >
                   <div className="text-stone-300 cursor-move flex-shrink-0"><GripVertical className="w-4 h-4" /></div>
                   
                   {/* Divider */}
                   <div className="w-px h-4 bg-stone-200"></div>

                   {tool !== 'eraser' && (
                     <div className="flex items-center gap-3 border-r border-stone-200 pr-3 mr-3">
                        <div className="flex items-center gap-1">
                          {[ { id: 'round', icon: Circle }, { id: 'star', icon: Star }, { id: 'heart', icon: Heart }, { id: 'sparkle', icon: Sparkles } ].map(t => (
                             <button key={t.id} onClick={() => setBrushTip(t.id as BrushTip)} className={`p-1.5 rounded-full transition-all ${brushTip === t.id ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`}><t.icon className="w-3.5 h-3.5" /></button>
                          ))}
                        </div>
                        <div className="w-px h-4 bg-stone-200"></div>
                        <div className="relative w-6 h-6 rounded-full overflow-hidden border border-stone-200 shadow-sm shrink-0 hover:scale-105 transition-transform" title="Color">
                           <input 
                              type="color" 
                              value={brushColor} 
                              onChange={(e) => setBrushColor(e.target.value)} 
                              onPointerDown={(e) => e.stopPropagation()} 
                              className="absolute -top-2 -left-2 w-10 h-10 p-0 border-0 cursor-pointer"
                           />
                        </div>
                     </div>
                   )}
                   <div className="flex items-center gap-2">
                      <Circle className="w-3 h-3 text-stone-400" />
                      <input 
                        type="range" 
                        min="1" 
                        max="50" 
                        value={brushSize} 
                        onChange={(e) => setBrushSize(parseInt(e.target.value))} 
                        onPointerDown={(e) => e.stopPropagation()} 
                        className="w-20 md:w-20 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900" 
                      />
                   </div>
                   <div className="flex items-center gap-2 border-l border-stone-200 pl-3">
                      <div className="w-3 h-3 rounded-full border border-stone-400" style={{ opacity: opacity }}></div>
                      <input 
                        type="range" 
                        min="0.1" 
                        max="1" 
                        step="0.1" 
                        value={opacity} 
                        onChange={(e) => setOpacity(parseFloat(e.target.value))} 
                        onPointerDown={(e) => e.stopPropagation()} 
                        className="w-16 md:w-16 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900" 
                      />
                   </div>
               </div>
             )}

            {/* Transform Layer */}
            <div
               ref={transformLayerRef}
               className="absolute inset-0 flex items-center justify-center origin-center"
               style={{ 
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transition: isPanning || isDrawing ? 'none' : 'transform 0.1s ease-out'
               }}
            >
               <div className="relative w-full h-full bg-white shadow-lg overflow-visible border border-stone-200">
                   <canvas 
                     ref={canvasRef}
                     onMouseDown={startInteraction}
                     onMouseMove={moveInteraction}
                     onMouseUp={endInteraction}
                     onMouseLeave={endInteraction}
                     onTouchStart={startInteraction}
                     onTouchMove={moveInteraction}
                     onTouchEnd={endInteraction}
                     className={`absolute inset-0 z-0 touch-none ${tool !== 'move' && tool !== 'hand' ? 'cursor-crosshair' : ''}`}
                   />

                   {/* Gems Overlay */}
                   {gems.map(gem => {
                     const asset = GEM_ASSETS.find(a => a.id === gem.typeId);
                     const isSelected = selectedGemId === gem.uniqueId;
                     
                     return (
                       <div
                         key={gem.uniqueId}
                         className={`absolute group touch-none ${isSelected ? 'z-50' : 'z-10'}`}
                         style={{ 
                           left: gem.x, 
                           top: gem.y, 
                           width: gem.size, 
                           height: gem.size,
                           cursor: tool === 'move' ? 'move' : 'default',
                           transform: `rotate(${gem.rotation || 0}deg)`
                         }}
                         onMouseDown={(e) => {
                           if (tool !== 'move') return;
                           e.stopPropagation();
                           setSelectedGemId(gem.uniqueId);
                           setIsDraggingGem(true);
                           const initX = e.clientX;
                           const initY = e.clientY;
                           const initGemX = gem.x;
                           const initGemY = gem.y;
                           
                           const handleMove = (ev: MouseEvent) => {
                              const deltaX = (ev.clientX - initX) / zoom;
                              const deltaY = (ev.clientY - initY) / zoom;
                              setGems(prev => prev.map(g => g.uniqueId === gem.uniqueId ? { ...g, x: initGemX + deltaX, y: initGemY + deltaY } : g));
                           };
                           const handleUp = () => { setIsDraggingGem(false); window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
                           window.addEventListener('mousemove', handleMove); window.addEventListener('mouseup', handleUp);
                         }}
                         onTouchStart={(e) => {
                           if (tool !== 'move') return;
                           e.stopPropagation();
                           setSelectedGemId(gem.uniqueId);
                           const initX = e.touches[0].clientX;
                           const initY = e.touches[0].clientY;
                           const initGemX = gem.x;
                           const initGemY = gem.y;
                            const handleMove = (ev: TouchEvent) => {
                              const deltaX = (ev.touches[0].clientX - initX) / zoom;
                              const deltaY = (ev.touches[0].clientY - initY) / zoom;
                              setGems(prev => prev.map(g => g.uniqueId === gem.uniqueId ? { ...g, x: initGemX + deltaX, y: initGemY + deltaY } : g));
                           };
                           const handleUp = () => { window.removeEventListener('touchmove', handleMove); window.removeEventListener('touchend', handleUp); };
                           window.addEventListener('touchmove', handleMove); window.addEventListener('touchend', handleUp);
                         }}
                       >
                         {/* Selection Controls */}
                         {isSelected && (
                           <>
                              {/* Selection Box */}
                              <div className="absolute -inset-1 border border-champagne-500 rounded-sm pointer-events-none"></div>
                              
                              {/* Rotation Handle (Top Center) */}
                              <div 
                                className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-champagne-500 rounded-full shadow-sm z-50 flex items-center justify-center cursor-grab active:cursor-grabbing pointer-events-auto"
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  setIsRotatingGem(true);
                                  const center = { x: gem.x + gem.size / 2, y: gem.y + gem.size / 2 };
                                  
                                  const handleRotate = (ev: MouseEvent) => {
                                      const pos = getCanvasPoint(ev);
                                      const angle = Math.atan2(pos.y - center.y, pos.x - center.x);
                                      // Convert to degrees, add 90 because handle is at top (-90 deg from x-axis)
                                      const deg = angle * (180 / Math.PI) + 90;
                                      setGems(prev => prev.map(g => g.uniqueId === gem.uniqueId ? { ...g, rotation: deg } : g));
                                  };
                                  
                                  const stopRotate = () => { setIsRotatingGem(false); window.removeEventListener('mousemove', handleRotate); window.removeEventListener('mouseup', stopRotate); };
                                  window.addEventListener('mousemove', handleRotate); window.addEventListener('mouseup', stopRotate);
                                }}
                                onTouchStart={(e) => {
                                  e.stopPropagation();
                                  setIsRotatingGem(true);
                                  const center = { x: gem.x + gem.size / 2, y: gem.y + gem.size / 2 };
                                  
                                  const handleRotate = (ev: TouchEvent) => {
                                      const pos = getCanvasPoint(ev);
                                      const angle = Math.atan2(pos.y - center.y, pos.x - center.x);
                                      const deg = angle * (180 / Math.PI) + 90;
                                      setGems(prev => prev.map(g => g.uniqueId === gem.uniqueId ? { ...g, rotation: deg } : g));
                                  };
                                  
                                  const stopRotate = () => { setIsRotatingGem(false); window.removeEventListener('touchmove', handleRotate); window.removeEventListener('touchend', stopRotate); };
                                  window.addEventListener('touchmove', handleRotate); window.addEventListener('touchend', stopRotate);
                                }}
                              >
                                  <RotateCw className="w-3 h-3 text-champagne-500" />
                              </div>
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 h-8 w-px bg-champagne-500 pointer-events-none"></div>

                              {/* Resize Handle (Bottom Right) */}
                              <div 
                                 className="absolute -bottom-2 -right-2 w-5 h-5 bg-white border border-champagne-500 rounded-full shadow-sm z-50 flex items-center justify-center cursor-nwse-resize pointer-events-auto"
                                 onMouseDown={(e) => {
                                    e.stopPropagation();
                                    setIsResizingGem(true);
                                    const center = { x: gem.x + gem.size / 2, y: gem.y + gem.size / 2 };
                                    const initPos = getCanvasPoint(e);
                                    const initDist = Math.hypot(initPos.x - center.x, initPos.y - center.y);
                                    const initSize = gem.size;
                                    
                                    const handleResize = (ev: MouseEvent) => {
                                       const pos = getCanvasPoint(ev);
                                       const currDist = Math.hypot(pos.x - center.x, pos.y - center.y);
                                       const scale = currDist / initDist;
                                       const newSize = Math.max(10, initSize * scale);
                                       // Resize from center
                                       setGems(prev => prev.map(g => g.uniqueId === gem.uniqueId ? { 
                                          ...g, 
                                          size: newSize,
                                          x: center.x - newSize / 2,
                                          y: center.y - newSize / 2
                                       } : g));
                                    };
                                    const stopResize = () => { setIsResizingGem(false); window.removeEventListener('mousemove', handleResize); window.removeEventListener('mouseup', stopResize); };
                                    window.addEventListener('mousemove', handleResize); window.addEventListener('mouseup', stopResize);
                                 }}
                                 onTouchStart={(e) => {
                                    e.stopPropagation();
                                    setIsResizingGem(true);
                                    const center = { x: gem.x + gem.size / 2, y: gem.y + gem.size / 2 };
                                    const initPos = getCanvasPoint(e);
                                    const initDist = Math.hypot(initPos.x - center.x, initPos.y - center.y);
                                    const initSize = gem.size;

                                    const handleResize = (ev: TouchEvent) => {
                                       const pos = getCanvasPoint(ev);
                                       const currDist = Math.hypot(pos.x - center.x, pos.y - center.y);
                                       const scale = currDist / initDist;
                                       const newSize = Math.max(10, initSize * scale);
                                       setGems(prev => prev.map(g => g.uniqueId === gem.uniqueId ? { 
                                          ...g, 
                                          size: newSize,
                                          x: center.x - newSize / 2,
                                          y: center.y - newSize / 2
                                       } : g));
                                    };
                                    const stopResize = () => { setIsResizingGem(false); window.removeEventListener('touchmove', handleResize); window.removeEventListener('touchend', stopResize); };
                                    window.addEventListener('touchmove', handleResize); window.addEventListener('touchend', stopResize);
                                 }}
                              >
                                 <div className="w-2 h-2 bg-champagne-500 rounded-full"></div>
                              </div>
                           </>
                         )}
                         
                         {/* Gem Render */}
                         <div 
                           className="w-full h-full shadow-sm transition-transform active:scale-95 pointer-events-none"
                           style={{ 
                             backgroundColor: asset?.color, 
                             borderColor: asset?.border,
                             borderWidth: '1px',
                             borderRadius: asset?.shape === 'circle' ? '50%' : asset?.shape === 'rect' ? '2px' : asset?.shape === 'oval' ? '45%' : '50% 50% 50% 50% / 60% 60% 40% 40%',
                             clipPath: asset?.shape === 'pear' ? 'polygon(50% 0%, 100% 65%, 50% 100%, 0% 65%)' : undefined 
                           }}
                         >
                            <div className="absolute top-[20%] left-[20%] w-[30%] h-[30%] bg-white/40 rounded-full blur-[1px]"></div>
                         </div>
                       </div>
                     );
                   })}
               </div>
            </div>
         </div>

         {/* Tools Sidebar/Bottom Bar */}
         <div className="flex-none w-full md:w-20 h-auto md:h-full bg-white border-t md:border-t-0 md:border-l border-stone-100 flex flex-row md:flex-col items-center py-2 md:py-4 px-4 md:px-0 gap-3 md:gap-4 z-20 shadow-[-5px_0_15px_-5px_rgba(0,0,0,0.05)] overflow-x-auto md:overflow-x-hidden md:overflow-y-auto">
             
             {/* Brush Tools */}
             <div className="flex flex-row md:flex-col gap-2 shrink-0">
                {[
                  { id: 'move', icon: Move, label: '移动', color: 'text-stone-800' },
                  { id: 'hand', icon: Hand, label: '抓手', color: 'text-stone-800' },
                  { id: 'pencil', icon: Pencil, label: '铅笔', color: 'text-stone-600' },
                  { id: 'gold', icon: Palette, label: '金笔', color: 'text-champagne-500' },
                  { id: 'marker', icon: SlidersHorizontal, label: '马克', color: 'text-stone-800' },
                  { id: 'eraser', icon: Eraser, label: '橡皮', color: 'text-stone-400' },
                ].map((t) => (
                   <button
                     key={t.id}
                     onClick={() => { setTool(t.id as Tool); setSelectedGemId(null); }}
                     className={`
                       relative flex flex-col items-center justify-center p-2 rounded-xl transition-all shrink-0
                       ${tool === t.id ? 'bg-stone-100 shadow-inner' : 'hover:bg-stone-50'}
                     `}
                     title={t.label}
                   >
                     <t.icon className={`w-5 h-5 ${t.color}`} />
                     {tool === t.id && <div className="absolute right-1 top-1 w-1.5 h-1.5 bg-champagne-500 rounded-full"></div>}
                   </button>
                ))}
             </div>

             <div className="w-px h-6 md:w-full md:h-px bg-stone-100 shrink-0"></div>

             {/* Gem Palette */}
             <div className="flex flex-row md:flex-col gap-2 flex-1 md:w-full md:px-2 overflow-x-auto md:overflow-y-auto custom-scrollbar">
                {GEM_ASSETS.map(gem => (
                  <button
                    key={gem.id}
                    onClick={() => addGem(gem.id)}
                    className="w-8 h-8 md:w-full md:aspect-square rounded-lg border border-stone-100 hover:border-champagne-300 hover:bg-stone-50 flex items-center justify-center transition-all active:scale-90 shrink-0"
                    title={gem.name}
                  >
                     <div 
                        className="w-5 h-5 md:w-6 md:h-6 shadow-sm"
                        style={{ 
                          backgroundColor: gem.color, 
                          borderColor: gem.border,
                          borderWidth: '1px',
                          borderRadius: gem.shape === 'circle' ? '50%' : gem.shape === 'rect' ? '2px' : gem.shape === 'oval' ? '45%' : '50% 50% 50% 50% / 60% 60% 40% 40%',
                          clipPath: gem.shape === 'pear' ? 'polygon(50% 0%, 100% 65%, 50% 100%, 0% 65%)' : undefined 
                        }}
                     ></div>
                  </button>
                ))}
             </div>

             {/* Delete Selected Action */}
             {selectedGemId && (
               <div className="md:mt-auto md:pt-4 md:border-t md:border-stone-100 md:w-full md:px-2 shrink-0 border-l md:border-l-0 border-stone-100 pl-2 md:pl-0">
                 <button onClick={removeSelectedGem} className="w-10 h-10 md:w-full md:p-2 bg-red-50 text-red-500 rounded-lg flex items-center justify-center animate-fade-in">
                    <Trash2 className="w-5 h-5" />
                 </button>
               </div>
             )}
         </div>
      </div>
    </div>
  );
};

export default CreativeCanvas;