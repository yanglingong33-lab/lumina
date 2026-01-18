
import React, { useState, useRef, useEffect } from 'react';
import { DesignConfig, MetalType, GemstoneType, JewelryType, ViewAngle, ImageSize, AspectRatio } from '../types';
import { Loader2, Sparkles, ChevronDown, Check } from 'lucide-react';

interface ConfigPanelProps {
  config: DesignConfig;
  setConfig: React.Dispatch<React.SetStateAction<DesignConfig>>;
  onGenerate: () => void;
  isGenerating: boolean;
  disabled: boolean;
}

interface CustomSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Record<string, string>;
  delayClass?: string;
  disabled?: boolean;
}

const AUX_OPTIONS = [
  '无需辅石', 
  '微镶碎钻 Halo', 
  '蓝宝石点缀', 
  '复古花丝', 
  '珍珠流苏', 
  '极简线条'
];

const CustomSelect: React.FC<CustomSelectProps> = ({ label, value, onChange, options, delayClass, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`space-y-2 group animate-fade-in-up opacity-0 fill-mode-forwards ${delayClass} relative`}
      style={{ zIndex: isOpen ? 50 : 'auto' }}
    >
      <label className="text-[10px] text-stone-500 font-bold tracking-[0.15em] uppercase pl-1 transition-colors duration-300 group-hover:text-champagne-600">
        {label}
      </label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`
            w-full bg-white border rounded-lg px-4 py-3.5 md:py-3 text-left
            text-base md:text-sm text-stone-800 font-medium
            flex items-center justify-between
            transition-all duration-300 outline-none select-none
            ${disabled ? 'opacity-50 cursor-not-allowed bg-stone-50' : 'cursor-pointer'}
            ${isOpen 
              ? 'border-champagne-500 ring-1 ring-champagne-500/20 shadow-lg translate-y-[-2px]' 
              : 'border-stone-200 hover:border-champagne-400 hover:shadow-lg hover:shadow-stone-200/40 hover:-translate-y-0.5'
            }
          `}
        >
          <span className="truncate">{value}</span>
          <ChevronDown 
            className={`w-4 h-4 text-stone-400 transition-transform duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${isOpen ? 'rotate-180 text-champagne-500' : 'group-hover:text-champagne-500'}`} 
          />
        </button>

        <div 
          className={`
            absolute z-[60] w-full mt-2 bg-white border border-stone-100 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] overflow-hidden
            origin-top transition-all duration-500 ease-spring
            ${isOpen 
              ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto' 
              : 'opacity-0 -translate-y-4 scale-90 pointer-events-none'
            }
          `}
        >
          <div className="max-h-[240px] overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
            {Object.entries(options).map(([key, optionValue]) => (
              <div
                key={key}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(optionValue);
                  setIsOpen(false);
                }}
                className={`
                  px-3 py-2.5 text-sm rounded-lg cursor-pointer transition-all duration-200 flex items-center justify-between group/option
                  ${value === optionValue 
                    ? 'bg-champagne-50 text-champagne-800 font-bold' 
                    : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900 hover:pl-4'
                  }
                `}
              >
                <span className="truncate mr-2">{optionValue}</span>
                {value === optionValue && <Check className="w-3.5 h-3.5 text-champagne-500 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, setConfig, onGenerate, isGenerating, disabled }) => {
  
  const handleChange = (field: keyof DesignConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex flex-col space-y-8 pb-10">
      
      <div className="space-y-2 animate-fade-in-up opacity-0 fill-mode-forwards" style={{ animationDelay: '0ms' }}>
        <h2 className="text-2xl md:text-3xl font-serif text-stone-900">Design Studio</h2>
        <p className="text-xs text-stone-500 font-medium tracking-wide">CUSTOMIZE YOUR JEWELRY</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:gap-6 relative z-30">
          <CustomSelect label="Jewelry Type" value={config.type} onChange={(v) => handleChange('type', v)} options={JewelryType} delayClass="delay-[100ms]" disabled={disabled} />
          <CustomSelect label="Quality" value={config.imageSize} onChange={(v) => handleChange('imageSize', v)} options={ImageSize} delayClass="delay-[125ms]" disabled={disabled} />
        </div>

        <div className="grid grid-cols-2 gap-4 md:gap-6 relative z-20">
          <CustomSelect label="Metal" value={config.metal} onChange={(v) => handleChange('metal', v)} options={MetalType} delayClass="delay-[200ms]" disabled={disabled} />
          <CustomSelect label="Gemstone" value={config.gemstone} onChange={(v) => handleChange('gemstone', v)} options={GemstoneType} delayClass="delay-[250ms]" disabled={disabled} />
        </div>
        
        <div className="grid grid-cols-2 gap-4 md:gap-6 relative z-10">
           <CustomSelect label="Perspective" value={config.viewAngle} onChange={(v) => handleChange('viewAngle', v)} options={ViewAngle} delayClass="delay-[150ms]" disabled={disabled} />
           <CustomSelect label="Aspect Ratio" value={config.aspectRatio} onChange={(v) => handleChange('aspectRatio', v)} options={AspectRatio} delayClass="delay-[175ms]" disabled={disabled} />
        </div>

        <div className="space-y-3 group animate-fade-in-up opacity-0 fill-mode-forwards delay-[300ms] relative z-0">
          <label className="text-[10px] text-stone-500 font-bold tracking-[0.15em] uppercase pl-1 transition-colors duration-300 group-hover:text-champagne-600">
            Auxiliary / Details
          </label>
          <div className="space-y-3">
             <div className="flex flex-wrap gap-2">
                {AUX_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleChange('auxiliaryStone', opt)}
                    disabled={disabled}
                    className={`
                      text-[10px] md:text-[11px] px-3 py-2 md:py-1.5 rounded-full border transition-all duration-300
                      ${config.auxiliaryStone === opt 
                        ? 'bg-stone-800 text-white border-stone-800 shadow-md' 
                        : 'bg-white text-stone-500 border-stone-200 hover:border-champagne-400 hover:text-champagne-600'}
                      ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    {opt}
                  </button>
                ))}
             </div>
            <input
              type="text"
              value={config.auxiliaryStone}
              onChange={(e) => handleChange('auxiliaryStone', e.target.value)}
              disabled={disabled}
              placeholder="自定义描述 (选填)..."
              className="w-full bg-white border border-stone-200 rounded-lg px-4 py-3.5 md:py-3 text-base md:text-sm text-stone-700 
              focus:outline-none focus:border-champagne-500 focus:ring-1 focus:ring-champagne-500/20
              transition-all duration-300 placeholder-stone-300"
            />
          </div>
        </div>

        <div className="space-y-3 group animate-fade-in-up opacity-0 fill-mode-forwards delay-[350ms]">
          <label className="text-[10px] text-stone-500 font-bold tracking-[0.15em] uppercase pl-1 transition-colors duration-300 group-hover:text-champagne-600">
            Vision & Inspiration
          </label>
          <div className="relative transform transition-all duration-300 group-hover:-translate-y-0.5">
            <textarea
              value={config.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={disabled}
              placeholder="描述您的设计灵感，例如：我想把这个形状做成一个复古风格的胸针，展现..."
              className="w-full bg-white border border-stone-200 rounded-lg px-4 py-3 text-base md:text-sm text-stone-700 
              focus:outline-none focus:border-champagne-500 focus:ring-1 focus:ring-champagne-500/20
              transition-all duration-300 placeholder-stone-300 min-h-[120px] resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Desktop Generate Button */}
      <div className="pt-6 hidden md:block animate-fade-in-up opacity-0 fill-mode-forwards delay-[400ms]">
        <button
          onClick={onGenerate}
          disabled={isGenerating || disabled}
          className={`
            group relative w-full overflow-hidden rounded-xl py-4
            transition-all duration-500 ease-out
            ${disabled 
              ? 'bg-stone-100 cursor-not-allowed opacity-50' 
              : 'bg-stone-900 cursor-pointer hover:shadow-[0_15px_40px_-10px_rgba(212,175,55,0.4)] hover:-translate-y-1 active:scale-[0.98]'
            }
          `}
        >
          {/* 1. Base Gradient Background */}
          <div className={`absolute inset-0 transition-colors duration-500 ${disabled ? 'bg-stone-200' : 'bg-stone-900'}`}></div>

          {/* 2. Advanced Ambient Glow (Idle) */}
          {!disabled && !isGenerating && (
            <>
              {/* Bottom Gold Glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(circle_at_50%_150%,rgba(212,175,55,0.3),transparent_70%)]"></div>
              {/* Subtle Shimmer */}
              <div className="absolute inset-0 opacity-20 bg-[linear-gradient(115deg,transparent,rgba(255,255,255,0.1),transparent)] bg-[length:200%_100%] animate-shimmer"></div>
            </>
          )}

          {/* 3. Shine Sweep Effect (Hover) */}
          {!disabled && !isGenerating && (
             <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 z-10"></div>
          )}

          {/* 4. Generating State: Pulse & Flow */}
          {isGenerating && (
             <div className="absolute inset-0 z-0">
               {/* Deep animated background */}
               <div className="absolute inset-0 bg-stone-800 animate-pulse"></div>
               {/* Moving Light Beam */}
               <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(212,175,55,0.2),transparent)] bg-[length:50%_100%] animate-[shimmer_1.5s_infinite]"></div>
             </div>
          )}

          {/* 5. Content Layer */}
          <div className="relative z-20 flex items-center justify-center gap-3">
            {isGenerating ? (
              <>
                <div className="relative">
                  <Loader2 className="w-5 h-5 text-champagne-400 animate-spin" />
                  <div className="absolute inset-0 bg-champagne-400/30 blur-md animate-pulse"></div>
                </div>
                <span className="text-xs font-bold tracking-[0.25em] uppercase text-champagne-100">Crafting Masterpiece...</span>
              </>
            ) : (
              <>
                <div className={`
                   p-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm
                   group-hover:bg-champagne-400 group-hover:border-transparent group-hover:text-stone-900 group-hover:scale-110 group-hover:rotate-12
                   transition-all duration-500 ease-spring
                `}>
                   <Sparkles className={`w-4 h-4 ${disabled ? 'text-stone-400' : 'text-champagne-200 group-hover:text-stone-900'} transition-colors`} />
                </div>
                <span className={`
                   text-xs font-bold tracking-[0.2em] uppercase
                   ${disabled ? 'text-stone-400' : 'text-stone-200 group-hover:text-white'}
                   transition-colors duration-300
                `}>
                   Generate Design
                </span>
              </>
            )}
          </div>
        </button>
      </div>
    </div>
  );
};

export default ConfigPanel;
