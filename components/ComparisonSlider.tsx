import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronsLeftRight } from 'lucide-react';

interface ComparisonSliderProps {
  originalImage: string;
  generatedImage: string;
}

const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ originalImage, generatedImage }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(() => setIsResizing(true), []);
  const handleMouseUp = useCallback(() => setIsResizing(false), []);
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    const percentage = Math.max(0, Math.min(100, (x / width) * 100));
    setSliderPosition(percentage);
  }, [isResizing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isResizing || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const width = rect.width;

    const percentage = Math.max(0, Math.min(100, (x / width) * 100));
    setSliderPosition(percentage);
  }, [isResizing]);

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, handleTouchMove]);

  return (
    <div 
      className="relative w-full h-full overflow-hidden bg-white select-none group"
      ref={containerRef}
    >
      {/* Generated Image (Background) */}
      <img 
        src={generatedImage} 
        alt="Generated Jewelry" 
        className="absolute top-0 left-0 w-full h-full object-contain p-8 md:p-12"
      />

      {/* Original Image (Foreground, clipped) */}
      <div 
        className="absolute top-0 left-0 h-full overflow-hidden bg-white border-r border-white/20"
        style={{ width: `${sliderPosition}%` }}
      >
        <img 
          src={originalImage} 
          alt="Original Object" 
          className="absolute top-0 left-0 max-w-none h-full object-contain p-8 md:p-12"
          style={{ width: containerRef.current?.offsetWidth || '100%' }} 
        />
         {/* Labels - Light Theme */}
        <div className="absolute bottom-6 left-6 bg-white/80 text-stone-800 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest backdrop-blur-md shadow-sm border border-stone-100 opacity-0 group-hover:opacity-100 transition-opacity">
          原图
        </div>
      </div>
      
       <div className="absolute bottom-6 right-6 bg-champagne-400 text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-widest backdrop-blur-md shadow-lg shadow-champagne-400/20 opacity-0 group-hover:opacity-100 transition-opacity">
          设计成品
        </div>

      {/* Slider Handle */}
      <div 
        className="absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize z-10 shadow-[0_0_20px_rgba(0,0,0,0.1)]"
        style={{ left: `${sliderPosition}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white w-8 h-8 rounded-full shadow-lg flex items-center justify-center border border-stone-100">
          <ChevronsLeftRight className="w-4 h-4 text-champagne-500" />
        </div>
      </div>
    </div>
  );
};

export default ComparisonSlider;