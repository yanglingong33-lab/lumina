
import React, { useCallback, useRef } from 'react';
import { Plus, Image as ImageIcon, Camera, Upload } from 'lucide-react';
import { Language } from '../types';
import { getTranslation } from '../utils/i18n';

interface ImageUploaderProps {
  onImageSelected: (base64: string) => void;
  compact?: boolean;
  lang?: Language;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, compact, lang = 'zh' }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const t = (key: string) => getTranslation(lang, key);

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
        className="w-full h-full bg-stone-50 flex items-center justify-center relative hover:bg-stone-100 transition-colors cursor-pointer group"
        title={t('upload.title')}
      >
         <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          onChange={handleFileChange} 
          className="hidden"
        />
        <Upload className="w-4 h-4 text-stone-400 group-hover:text-stone-600 transition-colors" />
      </div>
    )
  }

  return (
    <div 
      className={`
        w-full h-full border border-dashed border-stone-300 bg-stone-50/50
        hover:border-champagne-400 hover:bg-white transition-all duration-500 
        group relative flex flex-col items-center justify-center rounded-xl
        shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-soft
        min-h-[200px] md:min-h-0
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
      
      <div className="z-10 text-center p-6 md:p-8 transform transition-transform duration-500 flex flex-col items-center w-full max-w-sm">
        
        <div className="mb-4 md:mb-6 relative">
          <div className="absolute inset-0 bg-champagne-200 blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-700 rounded-full"></div>
          <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center rounded-full bg-white border border-stone-100 text-stone-300 group-hover:text-champagne-500 group-hover:border-champagne-200 transition-all duration-500 shadow-sm group-hover:shadow-lg group-hover:-translate-y-2">
             <Plus className="w-6 h-6 md:w-8 md:h-8 font-thin" />
          </div>
        </div>
        
        <div className="space-y-2 md:space-y-3 mb-8 md:mb-10">
          <h3 className="text-stone-900 text-lg md:text-xl font-serif font-medium tracking-wide">{t('upload.title')}</h3>
          <p className="text-stone-400 text-[10px] md:text-xs font-light tracking-wide">
            {t('upload.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:gap-4 w-full px-4 md:px-8">
            <button
              onClick={triggerFileSelect}
              className="flex flex-col items-center justify-center gap-2 py-3 md:py-4 px-2 rounded-lg border border-stone-200 bg-white hover:border-stone-400 hover:bg-stone-50 transition-all duration-300 group/btn active:scale-95"
            >
              <ImageIcon className="w-4 h-4 md:w-5 md:h-5 text-stone-400 group-hover/btn:text-stone-800 transition-colors" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 group-hover/btn:text-stone-800">{t('upload.gallery')}</span>
            </button>
            <button
              onClick={triggerCamera}
              className="flex flex-col items-center justify-center gap-2 py-3 md:py-4 px-2 rounded-lg border border-stone-200 bg-white hover:border-champagne-400 hover:bg-champagne-50/10 transition-all duration-300 group/btn active:scale-95"
            >
              <Camera className="w-4 h-4 md:w-5 md:h-5 text-stone-400 group-hover/btn:text-champagne-600 transition-colors" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-stone-500 group-hover/btn:text-champagne-600">{t('upload.camera')}</span>
            </button>
        </div>
        
        <p className="hidden md:block text-stone-300 text-[10px] font-light mt-8 select-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          {t('upload.drop')}
        </p>
      </div>
    </div>
  );
};

export default ImageUploader;
