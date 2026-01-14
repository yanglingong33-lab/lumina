import React, { useCallback, useRef } from 'react';
import { Plus, Image as ImageIcon, Camera } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (base64: string) => void;
  compact?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, compact }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
      // Reset input value to allow selecting same file again if needed
      event.target.value = '';
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      onImageSelected(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const triggerFileSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const triggerCamera = (e: React.MouseEvent) => {
    e.stopPropagation();
    cameraInputRef.current?.click();
  };

  if (compact) {
    return (
      <div 
        onClick={triggerFileSelect}
        className="w-full h-full bg-stone-100 flex items-center justify-center relative hover:bg-stone-200 transition-colors cursor-pointer"
      >
         <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="hidden"
        />
        <ImageIcon className="w-4 h-4 text-stone-400" />
      </div>
    )
  }

  return (
    <div 
      className={`
        w-full h-full border-2 border-dashed border-stone-200 bg-white
        hover:border-champagne-400/50 hover:bg-stone-50 transition-all duration-300 
        group relative flex flex-col items-center justify-center rounded-2xl
        shadow-sm hover:shadow-soft
      `}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        onChange={handleFileChange} 
        className="hidden"
      />
      <input 
        ref={cameraInputRef}
        type="file" 
        accept="image/*"
        capture="environment"
        onChange={handleFileChange} 
        className="hidden"
      />
      
      <div className="z-10 text-center p-8 transform group-hover:-translate-y-1 transition-transform duration-300 flex flex-col items-center w-full">
        <div className="relative w-16 h-16 mb-6 flex items-center justify-center rounded-full bg-stone-50 border border-stone-100 text-stone-300 group-hover:text-champagne-500 group-hover:border-champagne-200 transition-colors shadow-inner">
           <Plus className="w-8 h-8" />
        </div>
        
        <div className="space-y-2 mb-8">
          <p className="text-stone-800 text-lg font-serif font-medium tracking-wide">上传参考图</p>
          <p className="text-stone-400 text-xs font-light">
            点击按钮上传或直接拍照
          </p>
        </div>

        <div className="flex gap-4 w-full max-w-xs justify-center">
            <button
              onClick={triggerFileSelect}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs font-bold uppercase tracking-wider transition-colors"
            >
              <ImageIcon className="w-4 h-4" />
              相册
            </button>
            <button
              onClick={triggerCamera}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-lg shadow-stone-900/20"
            >
              <Camera className="w-4 h-4" />
              拍照
            </button>
        </div>
        
        <p className="text-stone-300 text-[10px] font-light mt-6 select-none">
          或者拖拽图片至此区域
        </p>
      </div>
    </div>
  );
};

export default ImageUploader;