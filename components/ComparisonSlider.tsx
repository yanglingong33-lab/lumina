
import React, { useState, useRef, useCallback } from 'react';
import { ChevronsLeftRight, ScanLine } from 'lucide-react';

interface ComparisonSliderProps {
  originalImage: string;
  generatedImage: string;
  onImageClick?: () => void;
}

const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ originalImage, generatedImage, onImageClick }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track drag start to distinguish click from drag
  const dragStartPos = useRef<{x: number, y: number} | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsResizing(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsResizing(false);
    e.currentTarget.releasePointerCapture(e.pointerId);

    // Check if it was a click (minimal movement)
    if (dragStartPos.current && onImageClick) {
      const deltaX = Math.abs(e.clientX - dragStartPos.current.x);
      const deltaY = Math.abs(e.clientY - dragStartPos.current.y);
      
      // Threshold for "Click" vs "Drag"
      if (deltaX < 5 && deltaY < 5) {
        onImageClick();
      }
    }
    dragStartPos.current = null;
  }, [onImageClick]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isResizing || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    // Allow dragging slightly off-screen to reach 0 or 100 easily
    const percentage = Math.max(0, Math.min(100, (x / width) * 100));
    setSliderPosition(percentage);
  }, [isResizing]);

  // Reduced padding to maximize image size
  const imagePaddingClass = "p-2 md:p-6"; 

  return (
    <div 
      className="relative w-full h-full overflow-hidden bg-stone-50 select-none group touch-none cursor-ew-resize"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      title="拖拽对比 / 点击放大"
    >
      {/* 
        Background Pattern 
        Subtle grid to help distinguish transparent areas 
      */}
      <div className="absolute inset-0 z-0 opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
      </div>

      {/* 
         LAYER 1: Generated Image (Bottom / Background) 
         Use object-contain to ensure the whole jewelry is visible without cropping.
      */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <img 
          src={generatedImage} 
          alt="Generated Jewelry" 
          className={`w-full h-full object-contain ${imagePaddingClass} transition-transform duration-700 ease-out ${isResizing ? 'scale-100' : 'group-hover:scale-[1.01]'}`}
          draggable={false}
        />
        
        {/* Label: Designed (Bottom Right) */}
        <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 pointer-events-none transition-all duration-500 opacity-80 group-hover:opacity-100 group-hover:translate-x-0 translate-x-2">
          <div className="flex items-center gap-2">
            <span className="bg-stone-900/80 backdrop-blur-md text-champagne-300 px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold tracking-widest shadow-lg border border-white/10 uppercase">
              AI Design
            </span>
          </div>
        </div>
      </div>

      {/* 
         LAYER 2: Original Image (Top / Foreground) 
         Using clip-path is much more performant than resizing a div width 
         and eliminates the need for JS width calculation syncing.
      */}
      <div 
        className="absolute inset-0 z-20 overflow-hidden"
        style={{ 
          clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
          transition: isResizing ? 'none' : 'clip-path 0.1s ease-out'
        }}
      >
        <div className="relative w-full h-full bg-stone-50/50 backdrop-blur-[2px]"> 
          {/* Slight backdrop blur on original side helps distinguish if backgrounds are similar */}
          <img 
            src={originalImage} 
            alt="Original Object" 
            className={`w-full h-full object-contain ${imagePaddingClass} opacity-90`}
            draggable={false}
          />
        </div>
        
        {/* Label: Original (Bottom Left) */}
        <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 pointer-events-none transition-all duration-500 opacity-80 group-hover:opacity-100 group-hover:translate-x-0 -translate-x-2">
          <div className="flex items-center gap-2">
            <span className="bg-white/80 backdrop-blur-md text-stone-600 px-3 py-1.5 rounded-lg text-[10px] md:text-xs font-bold tracking-widest shadow-sm border border-stone-200 uppercase">
              Original
            </span>
          </div>
        </div>
      </div>

      {/* 
         LAYER 3: Slider Handle & Divider Line 
      */}
      <div 
        className="absolute top-0 bottom-0 z-30 pointer-events-none"
        style={{ 
          left: `${sliderPosition}%`,
          transition: isResizing ? 'none' : 'left 0.1s ease-out'
        }}
      >
        {/* Vertical Line */}
        <div className="absolute inset-y-0 -left-[1px] w-[2px] bg-white shadow-[0_0_10px_rgba(0,0,0,0.2)]"></div>
        <div className="absolute inset-y-0 -left-[1px] w-[2px] bg-champagne-400 opacity-60 mix-blend-overlay"></div>
        
        {/* Handle */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
           {/* Glow Effect */}
           <div className={`absolute inset-0 rounded-full bg-champagne-400/30 blur-md transition-all duration-300 ${isResizing ? 'scale-150 opacity-100' : 'scale-100 opacity-0 group-hover:opacity-50'}`}></div>
           
           {/* Button Body */}
           <div className={`
              relative flex items-center justify-center 
              w-10 h-10 md:w-12 md:h-12 
              bg-white/90 backdrop-blur-sm 
              rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.15)] 
              border-2 border-white 
              transition-transform duration-200 ease-spring
              ${isResizing ? 'scale-110 cursor-grabbing' : 'scale-100 cursor-grab group-hover:scale-105'}
           `}>
             <ChevronsLeftRight className={`w-4 h-4 md:w-5 md:h-5 text-stone-600 transition-colors ${isResizing ? 'text-champagne-500' : ''}`} />
           </div>
        </div>
      </div>

      {/* Hover Hint (Desktop Only) */}
      <div className={`
        absolute top-6 left-1/2 -translate-x-1/2 
        bg-black/50 backdrop-blur-md text-white px-3 py-1 rounded-full 
        text-[10px] tracking-widest uppercase font-medium
        pointer-events-none transition-opacity duration-500
        ${isResizing ? 'opacity-100' : 'opacity-0'}
      `}>
        {Math.round(sliderPosition)}%
      </div>
    </div>
  );
};

export default ComparisonSlider;
