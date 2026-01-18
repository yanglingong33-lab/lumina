
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Pencil, Eraser, Move, Undo2, Trash2, Check, X, Palette, Circle, Star, Heart, Sparkles, SlidersHorizontal } from 'lucide-react';

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
}

interface CreativeCanvasProps {
  onConfirm: (base64: string) => void;
  onCancel: () => void;
}

type Tool = 'pencil' | 'marker' | 'gold' | 'eraser' | 'move';
type BrushTip = 'round' | 'star' | 'heart' | 'sparkle';

const CreativeCanvas: React.FC<CreativeCanvasProps> = ({ onConfirm, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  
  // Tool State
  const [tool, setTool] = useState<Tool>('pencil');
  
  // Brush Settings
  const [brushSize, setBrushSize] = useState(2);
  const [opacity, setOpacity] = useState(1);
  const [brushTip, setBrushTip] = useState<BrushTip>('round');

  const [isDrawing, setIsDrawing] = useState(false);
  const [gems, setGems] = useState<GemObject[]>([]);
  const [selectedGemId, setSelectedGemId] = useState<string | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  
  // Dragging logic for gems
  const [isDraggingGem, setIsDraggingGem] = useState(false);
  
  // Drawing Interpolation
  const lastPos = useRef<{x: number, y: number} | null>(null);

  // Init Canvas
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      // Set resolution
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
      }
      
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
    } else if (tool === 'marker') {
      setBrushSize(6);
      setOpacity(0.9);
      setBrushTip('round');
    } else if (tool === 'gold') {
      setBrushSize(4);
      setOpacity(1);
      setBrushTip('round');
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
    // 4-point star
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

  // --- Drawing Handlers ---

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const getToolColor = () => {
    if (tool === 'eraser') return '#FFFFFF';
    if (tool === 'gold') return '#D4AF37';
    if (tool === 'marker') return '#292524';
    return '#57534E'; // Pencil
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'move' || !context) return;
    
    setIsDrawing(true);
    const pos = getPointerPos(e);
    lastPos.current = pos;

    context.globalAlpha = opacity;
    const color = getToolColor();

    if (tool === 'eraser') {
      context.globalCompositeOperation = 'destination-out'; // True erase
      context.beginPath();
      context.moveTo(pos.x, pos.y);
      context.lineWidth = brushSize;
      context.lineCap = 'round';
      context.lineJoin = 'round';
    } else {
      context.globalCompositeOperation = 'source-over';
      
      // If simple round brush, we can do initial dot
      if (brushTip === 'round' && opacity === 1) {
         context.beginPath();
         context.fillStyle = color;
         context.arc(pos.x, pos.y, brushSize / 2, 0, Math.PI * 2);
         context.fill();
         // Setup for lineTo
         context.beginPath();
         context.moveTo(pos.x, pos.y);
         context.strokeStyle = color;
         context.lineWidth = brushSize;
      } else {
         // Shape brushes or transparent round brushes use stamping
         drawShapePoint(context, pos.x, pos.y, brushTip, brushSize, color);
      }
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !context || !lastPos.current) return;
    e.preventDefault();
    const { x, y } = getPointerPos(e);

    const color = getToolColor();

    if (tool === 'eraser') {
      context.lineTo(x, y);
      context.stroke();
      lastPos.current = { x, y };
      return;
    }

    // Drawing Logic
    if (brushTip === 'round' && opacity === 1) {
       // High performance standard line
       context.lineTo(x, y);
       context.stroke();
    } else {
       // Interpolation for smooth stamping (Shapes or Transparent brushes)
       const dist = Math.hypot(x - lastPos.current.x, y - lastPos.current.y);
       const angle = Math.atan2(y - lastPos.current.y, x - lastPos.current.x);
       
       // Step size: smaller for round to be continuous, larger for shapes to distinguish them
       const step = brushTip === 'round' ? Math.max(1, brushSize * 0.1) : Math.max(5, brushSize * 0.8);
       
       for (let i = 0; i < dist; i += step) {
           const px = lastPos.current.x + Math.cos(angle) * i;
           const py = lastPos.current.y + Math.sin(angle) * i;
           drawShapePoint(context, px, py, brushTip, brushSize, color);
       }
    }

    lastPos.current = { x, y };
  };

  const stopDrawing = () => {
    if (isDrawing && context) {
      if (tool === 'eraser' || (brushTip === 'round' && opacity === 1)) {
        context.closePath();
      }
      setIsDrawing(false);
      lastPos.current = null;
      context.globalAlpha = 1; // Reset
      context.globalCompositeOperation = 'source-over';
      saveHistory(context);
    }
  };

  // --- Gem Handlers ---

  const addGem = (typeId: string) => {
    if (!containerRef.current) return;
    const newGem: GemObject = {
      uniqueId: Date.now().toString(),
      typeId,
      x: containerRef.current.offsetWidth / 2 - 20,
      y: containerRef.current.offsetHeight / 2 - 20,
      size: 40
    };
    setGems([...gems, newGem]);
    setSelectedGemId(newGem.uniqueId);
    setTool('move'); // Auto switch to move mode
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
    
    // Create a temp canvas to composite everything
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // 1. Draw the drawing layer
    tempCtx.drawImage(canvasRef.current, 0, 0);

    // 2. Draw the gems
    gems.forEach(gem => {
      const asset = GEM_ASSETS.find(a => a.id === gem.typeId);
      if (!asset) return;
      
      const cx = gem.x + gem.size / 2;
      const cy = gem.y + gem.size / 2;
      const r = gem.size / 2;

      tempCtx.save();
      tempCtx.fillStyle = asset.color;
      tempCtx.strokeStyle = asset.border;
      tempCtx.lineWidth = 2;

      tempCtx.translate(cx, cy);

      if (asset.shape === 'circle') {
        tempCtx.beginPath();
        tempCtx.arc(0, 0, r, 0, Math.PI * 2);
        tempCtx.fill();
        tempCtx.stroke();
        // Shine
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
        // Simplified pear
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
      <div className="flex items-center justify-between p-2 border-b border-stone-200 bg-white shadow-sm z-10">
         <div className="flex gap-1">
             <button onClick={onCancel} className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
             <button onClick={handleUndo} className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg"><Undo2 className="w-5 h-5" /></button>
             <button onClick={clearCanvas} className="p-2 text-stone-500 hover:bg-red-50 hover:text-red-500 rounded-lg"><Trash2 className="w-5 h-5" /></button>
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

      <div className="flex flex-1 relative overflow-hidden" ref={containerRef}>
         {/* Canvas Area */}
         <div className="relative flex-1 bg-stone-100 flex items-center justify-center p-4">
            <div className="relative w-full h-full bg-white shadow-sm rounded-lg overflow-hidden cursor-crosshair border border-stone-200">
                <canvas 
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="absolute inset-0 z-0 touch-none"
                />

                {/* Floating Brush Settings (Visible when using a brush tool) */}
                {tool !== 'move' && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full shadow-lg border border-stone-100 flex items-center gap-4 z-40 animate-fade-in-up">
                      
                      {/* Tips (Only for non-eraser) */}
                      {tool !== 'eraser' && (
                        <div className="flex items-center gap-1 border-r border-stone-200 pr-3">
                           {[
                             { id: 'round', icon: Circle },
                             { id: 'star', icon: Star },
                             { id: 'heart', icon: Heart },
                             { id: 'sparkle', icon: Sparkles }
                           ].map(t => (
                              <button 
                                key={t.id}
                                onClick={() => setBrushTip(t.id as BrushTip)}
                                className={`p-1.5 rounded-full transition-all ${brushTip === t.id ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100'}`}
                              >
                                <t.icon className="w-3.5 h-3.5" />
                              </button>
                           ))}
                        </div>
                      )}

                      {/* Size Slider */}
                      <div className="flex items-center gap-2">
                         <Circle className="w-3 h-3 text-stone-400" />
                         <input 
                            type="range" 
                            min="1" 
                            max="50" 
                            value={brushSize} 
                            onChange={(e) => setBrushSize(parseInt(e.target.value))}
                            className="w-20 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
                         />
                      </div>

                      {/* Opacity Slider */}
                      <div className="flex items-center gap-2 border-l border-stone-200 pl-3">
                         <div className="w-3 h-3 rounded-full border border-stone-400" style={{ opacity: opacity }}></div>
                         <input 
                            type="range" 
                            min="0.1" 
                            max="1" 
                            step="0.1"
                            value={opacity} 
                            onChange={(e) => setOpacity(parseFloat(e.target.value))}
                            className="w-16 h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-stone-900"
                         />
                      </div>
                  </div>
                )}

                {/* Gems Overlay */}
                {gems.map(gem => {
                  const asset = GEM_ASSETS.find(a => a.id === gem.typeId);
                  return (
                    <div
                      key={gem.uniqueId}
                      className={`absolute cursor-move group touch-none ${selectedGemId === gem.uniqueId ? 'z-50' : 'z-10'}`}
                      style={{ 
                        left: gem.x, 
                        top: gem.y, 
                        width: gem.size, 
                        height: gem.size,
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedGemId(gem.uniqueId);
                        setIsDraggingGem(true);
                        const startX = e.clientX - gem.x;
                        const startY = e.clientY - gem.y;
                        const handleMove = (moveEvent: MouseEvent) => {
                           setGems(prev => prev.map(g => g.uniqueId === gem.uniqueId ? { ...g, x: moveEvent.clientX - startX, y: moveEvent.clientY - startY } : g));
                        };
                        const handleUp = () => {
                           setIsDraggingGem(false);
                           window.removeEventListener('mousemove', handleMove);
                           window.removeEventListener('mouseup', handleUp);
                        };
                        window.addEventListener('mousemove', handleMove);
                        window.addEventListener('mouseup', handleUp);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        setSelectedGemId(gem.uniqueId);
                        const touch = e.touches[0];
                        const startX = touch.clientX - gem.x;
                        const startY = touch.clientY - gem.y;
                         const handleMove = (moveEvent: TouchEvent) => {
                           setGems(prev => prev.map(g => g.uniqueId === gem.uniqueId ? { ...g, x: moveEvent.touches[0].clientX - startX, y: moveEvent.touches[0].clientY - startY } : g));
                        };
                        const handleUp = () => {
                           window.removeEventListener('touchmove', handleMove);
                           window.removeEventListener('touchend', handleUp);
                        };
                        window.addEventListener('touchmove', handleMove);
                        window.addEventListener('touchend', handleUp);
                      }}
                    >
                      {/* Selection Box */}
                      {selectedGemId === gem.uniqueId && (
                        <div className="absolute -inset-2 border border-champagne-500 rounded-sm pointer-events-none">
                           <div className="absolute -top-1 -right-1 w-2 h-2 bg-champagne-500 rounded-full"></div>
                        </div>
                      )}
                      
                      {/* Gem Render */}
                      <div 
                        className="w-full h-full shadow-sm transition-transform active:scale-95"
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

         {/* Tools Sidebar */}
         <div className="w-16 md:w-20 bg-white border-l border-stone-100 flex flex-col items-center py-4 gap-4 z-20 shadow-[-5px_0_15px_-5px_rgba(0,0,0,0.05)]">
             
             {/* Brush Tools */}
             <div className="flex flex-col gap-2 w-full px-2">
                <span className="text-[9px] text-center text-stone-400 font-bold tracking-wider uppercase">Tools</span>
                {[
                  { id: 'pencil', icon: Pencil, label: '铅笔', color: 'text-stone-600' },
                  { id: 'gold', icon: Palette, label: '金笔', color: 'text-champagne-500' },
                  { id: 'marker', icon: SlidersHorizontal, label: '马克', color: 'text-stone-800' },
                  { id: 'eraser', icon: Eraser, label: '橡皮', color: 'text-stone-400' },
                  { id: 'move', icon: Move, label: '移动', color: 'text-stone-800' },
                ].map((t) => (
                   <button
                     key={t.id}
                     onClick={() => { setTool(t.id as Tool); setSelectedGemId(null); }}
                     className={`
                       relative flex flex-col items-center justify-center p-2 rounded-xl transition-all
                       ${tool === t.id ? 'bg-stone-100 shadow-inner' : 'hover:bg-stone-50'}
                     `}
                   >
                     <t.icon className={`w-5 h-5 ${t.color}`} />
                     {tool === t.id && <div className="absolute right-1 top-1 w-1.5 h-1.5 bg-champagne-500 rounded-full"></div>}
                   </button>
                ))}
             </div>

             <div className="w-full h-px bg-stone-100"></div>

             {/* Gem Palette */}
             <div className="flex flex-col gap-2 w-full px-2 overflow-y-auto custom-scrollbar flex-1">
                <span className="text-[9px] text-center text-stone-400 font-bold tracking-wider uppercase">Gems</span>
                {GEM_ASSETS.map(gem => (
                  <button
                    key={gem.id}
                    onClick={() => addGem(gem.id)}
                    className="w-full aspect-square rounded-lg border border-stone-100 hover:border-champagne-300 hover:bg-stone-50 flex items-center justify-center transition-all active:scale-90"
                    title={gem.name}
                  >
                     <div 
                        className="w-6 h-6 shadow-sm"
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
               <div className="mt-auto pt-4 border-t border-stone-100 w-full px-2">
                 <button onClick={removeSelectedGem} className="w-full p-2 bg-red-50 text-red-500 rounded-lg flex justify-center animate-fade-in">
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
