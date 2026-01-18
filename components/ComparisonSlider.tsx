
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronsLeftRight } from 'lucide-react';

interface ComparisonSliderProps {
  originalImage: string;
  generatedImage: string;
  onImageClick?: () => void;
}

const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ originalImage, generatedImage, onImageClick }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Track drag start to distinguish click from drag
  const dragStartPos = useRef<{x: number, y: number} | null>(null);

  // Use ResizeObserver to track container width changes accurately
  useEffect(() => {
    if (!containerRef.current) return;

    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    // Initial measure
    updateWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

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
    
    const percentage = Math.max(0, Math.min(100, (x / width) * 100));
    setSliderPosition(percentage);
  }, [isResizing]);

  return (
    <div 
      className="relative w-full h-full overflow-hidden bg-white select-none group touch-none cursor-zoom-in"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      title="点击放大查看"
    >
      {/* Generated Image (Background) - The Target */}
      <div className="absolute inset-0 z-0">
        <img 
          src={generatedImage} 
          alt="Generated Jewelry" 
          className="w-full h-full object-contain p-6 md:p-14 transition-transform duration-700 group-hover:scale-[1.02]"
        />
      </div>

      {/* Original Image (Foreground, clipped) - The Reference */}
      <div 
        className="absolute top-0 left-0 h-full overflow-hidden bg-white z-10 border-r border-champagne-400/30"
        style={{ 
          width: `${sliderPosition}%`,
          transition: isResizing ? 'none' : 'width 0.1s ease-out'
        }}
      >
        <div 
          className="h-full"
          style={{ width: containerWidth > 0 ? `${containerWidth}px` : '100%' }}
        >
          <img 
            src={originalImage} 
            alt="Original Object" 
            className="w-full h-full object-contain p-6 md:p-14 opacity-80"
          />
        </div>
        
        {/* Label: Original - Adjusted for Mobile */}
        <div className="absolute bottom-4 left-4 md:bottom-8 md:left-8 flex items-center gap-2 transition-all duration-700 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
          <div className="h-px w-4 md:w-6 bg-stone-300"></div>
          <span className="bg-white/80 backdrop-blur-md text-stone-500 px-3 md:px-4 py-1.5 rounded-full text-[9px] md:text-xs font-serif italic tracking-wide border border-stone-200 shadow-sm whitespace-nowrap">
            原图参考
          </span>
        </div>
      </div>
      
      {/* Label: Designed - Adjusted for Mobile */}
      <div className="absolute bottom-4 right-4 md:bottom-8 md:right-8 flex items-center gap-2 transition-all duration-700 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 z-20">
        <span className="bg-stone-900/90 backdrop-blur-md text-champagne-300 px-4 md:px-5 py-1.5 md:py-2 rounded-full text-[9px] md:text-xs font-serif font-bold tracking-wide shadow-glow border border-stone-800 whitespace-nowrap">
          AI 珠宝方案
        </span>
        <div className="h-px w-4 md:w-6 bg-champagne-400/50"></div>
      </div>

      {/* Slider Handle & Line */}
      <div 
        className="absolute top-0 bottom-0 z-30 transition-all duration-100 pointer-events-none"
        style={{ 
          left: `${sliderPosition}%`,
          transition: isResizing ? 'none' : 'left 0.1s ease-out'
        }}
      >
        <div className="absolute inset-y-0 -left-[1px] w-[2px] bg-gradient-to-b from-transparent via-champagne-400/50 to-transparent shadow-[0_0_15px_rgba(212,175,55,0.3)]"></div>
        
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 group/handle">
          <div className={`absolute inset-0 rounded-full bg-champagne-400/20 ${isResizing ? 'scale-150 opacity-100' : 'scale-100 opacity-0'} transition-all duration-300`}></div>
          <div className="relative bg-white w-9 h-9 md:w-10 md:h-10 rounded-full shadow-lg flex items-center justify-center border-2 border-champagne-400 transition-transform duration-300 group-hover/handle:scale-110 active:scale-95">
            <ChevronsLeftRight className="w-4 h-4 md:w-5 md:h-5 text-champagne-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComparisonSlider;
