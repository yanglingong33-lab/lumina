import React from 'react';
import { DesignConfig, MetalType, GemstoneType, JewelryType, ViewAngle, ImageSize } from '../types';
import { Wand2, Loader2, Sparkles, ChevronDown, Quote } from 'lucide-react';

interface ConfigPanelProps {
  config: DesignConfig;
  setConfig: React.Dispatch<React.SetStateAction<DesignConfig>>;
  onGenerate: () => void;
  isGenerating: boolean;
  disabled: boolean;
  generatedDescription?: string | null;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, setConfig, onGenerate, isGenerating, disabled, generatedDescription }) => {
  
  const handleChange = (field: keyof DesignConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const SelectGroup = ({ label, field, options, delayClass }: { label: string, field: keyof DesignConfig, options: Record<string, string>, delayClass?: string }) => (
    <div className={`space-y-2 group animate-fade-in-up opacity-0 fill-mode-forwards ${delayClass}`}>
      <label className="text-[10px] text-stone-400 font-bold tracking-[0.15em] uppercase pl-1 transition-colors duration-300 group-hover:text-champagne-500">{label}</label>
      <div className="relative transform transition-all duration-300 group-hover:-translate-y-1">
        <select
          value={config[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 text-sm text-stone-700 font-medium appearance-none 
          hover:bg-white hover:border-champagne-300 hover:shadow-md hover:shadow-stone-200/50
          focus:outline-none focus:border-champagne-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(212,175,55,0.15)] 
          transition-all duration-300 cursor-pointer ease-out"
        >
          {Object.entries(options).map(([key, value]) => (
            <option key={key} value={value}>{value}</option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-stone-400 transition-all duration-300 group-hover:text-champagne-500 group-hover:scale-110">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col space-y-8 pb-8 md:pb-0">
      
      {/* Dynamic Header / Result Description */}
      {generatedDescription ? (
        <div className="animate-fade-in-up opacity-0 fill-mode-forwards">
          <div className="p-6 bg-stone-900 text-stone-100 rounded-xl relative overflow-hidden shadow-xl mb-2">
            {/* Decorative background elements */}
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <Sparkles className="w-24 h-24" />
            </div>
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-champagne-500/20 blur-2xl rounded-full"></div>
            
            <h3 className="text-champagne-400 font-serif text-lg mb-4 flex items-center gap-3 relative z-10">
              <Sparkles className="w-4 h-4" />
              <span className="tracking-widest">设计理念</span>
              <div className="h-px flex-1 bg-gradient-to-r from-champagne-500/50 to-transparent"></div>
            </h3>
            
            <div className="relative z-10">
              <Quote className="w-4 h-4 text-champagne-500/50 absolute -top-1 -left-1 transform -scale-x-100" />
              <p className="text-sm font-light leading-relaxed tracking-wide opacity-90 text-justify indent-6 pt-1">
                {generatedDescription}
              </p>
              <div className="flex justify-end mt-2">
                <Quote className="w-4 h-4 text-champagne-500/50" />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between text-[10px] text-stone-400 uppercase tracking-widest px-1">
            <span>Design Concept</span>
            <span>Lumina AI</span>
          </div>
          <div className="my-6 border-b border-stone-100"></div>
          <h4 className="text-sm font-bold text-stone-800 mb-4">调整参数重新生成</h4>
        </div>
      ) : (
        <div className="space-y-2 animate-fade-in-up opacity-0 fill-mode-forwards" style={{ animationDelay: '0ms' }}>
          <h2 className="text-2xl font-serif text-stone-800">定制参数</h2>
          <div className="h-0.5 w-12 bg-champagne-400 rounded-full"></div>
          <p className="text-xs text-stone-400 font-light">调整以下细节，打造您的专属珠宝</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-5">
          <SelectGroup label="首饰品类" field="type" options={JewelryType} delayClass="delay-[100ms]" />
          <SelectGroup label="画质分辨率" field="imageSize" options={ImageSize} delayClass="delay-[125ms]" />
        </div>

        <div className="grid grid-cols-2 gap-5">
          <SelectGroup label="贵金属材质" field="metal" options={MetalType} delayClass="delay-[200ms]" />
          <SelectGroup label="主石选择" field="gemstone" options={GemstoneType} delayClass="delay-[250ms]" />
        </div>
        
        <div className="grid grid-cols-2 gap-5">
           <SelectGroup label="呈现视角" field="viewAngle" options={ViewAngle} delayClass="delay-[150ms]" />
        </div>

        <div className="space-y-2 group animate-fade-in-up opacity-0 fill-mode-forwards delay-[300ms]">
          <label className="text-[10px] text-stone-400 font-bold tracking-[0.15em] uppercase pl-1 transition-colors duration-300 group-hover:text-champagne-500">辅石 / 装饰</label>
          <div className="transform transition-all duration-300 group-hover:-translate-y-1">
            <input
              type="text"
              value={config.auxiliaryStone}
              onChange={(e) => handleChange('auxiliaryStone', e.target.value)}
              placeholder="例如：碎钻镶嵌、红宝石点缀..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 text-sm text-stone-700 
              hover:bg-white hover:border-champagne-300 hover:shadow-md hover:shadow-stone-200/50
              focus:outline-none focus:border-champagne-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(212,175,55,0.15)] 
              transition-all duration-300 placeholder-stone-300"
            />
          </div>
        </div>

        <div className="space-y-2 group animate-fade-in-up opacity-0 fill-mode-forwards delay-[350ms]">
          <label className="text-[10px] text-stone-400 font-bold tracking-[0.15em] uppercase pl-1 transition-colors duration-300 group-hover:text-champagne-500">设计灵感 / 备注</label>
          <div className="transform transition-all duration-300 group-hover:-translate-y-1">
            <textarea
              value={config.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="描述您的想法，例如：复古风格、自然流线、极简主义..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 text-sm text-stone-700 
              hover:bg-white hover:border-champagne-300 hover:shadow-md hover:shadow-stone-200/50
              focus:outline-none focus:border-champagne-400 focus:bg-white focus:shadow-[0_0_0_4px_rgba(212,175,55,0.15)] 
              transition-all duration-300 placeholder-stone-300 min-h-[100px] resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>

      {/* Desktop Button - Hidden on Mobile */}
      <div className="pt-4 hidden md:block animate-fade-in-up opacity-0 fill-mode-forwards delay-[400ms]">
        <button
          onClick={onGenerate}
          disabled={isGenerating || disabled}
          className={`
            w-full relative overflow-hidden rounded-xl py-4
            ${disabled ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'bg-stone-900 text-white cursor-pointer hover:shadow-xl hover:shadow-stone-900/20 hover:-translate-y-0.5 active:scale-[0.99]'}
            font-bold tracking-widest text-sm transition-all duration-500 group
          `}
        >
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          
          <span className="relative z-10 flex items-center justify-center gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin w-4 h-4 text-champagne-400" />
                正在铸造杰作...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-champagne-400 group-hover:scale-110 transition-transform duration-300" />
                {generatedDescription ? '重新生成设计' : '开始生成设计'}
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  );
};

export default ConfigPanel;