
import React from 'react';
import { DesignConfig, MetalType, GemstoneType, JewelryType, ViewAngle, ImageSize, AspectRatio } from '../types';
import { Loader2, Sparkles, ChevronDown, Quote, KeyRound } from 'lucide-react';

interface ConfigPanelProps {
  config: DesignConfig;
  setConfig: React.Dispatch<React.SetStateAction<DesignConfig>>;
  onGenerate: () => void;
  isGenerating: boolean;
  disabled: boolean;
  generatedDescription?: string | null;
}

const AUX_OPTIONS = [
  '无需辅石', 
  '微镶碎钻 Halo', 
  '蓝宝石点缀', 
  '复古花丝', 
  '珍珠流苏', 
  '极简线条'
];

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, setConfig, onGenerate, isGenerating, disabled, generatedDescription }) => {
  
  const handleChange = (field: keyof DesignConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const SelectGroup = ({ label, field, options, delayClass }: { label: string, field: keyof DesignConfig, options: Record<string, string>, delayClass?: string }) => (
    <div className={`space-y-2 group animate-fade-in-up opacity-0 fill-mode-forwards ${delayClass}`}>
      <label className="text-[10px] text-stone-500 font-bold tracking-[0.15em] uppercase pl-1 transition-colors duration-300 group-hover:text-champagne-600">{label}</label>
      <div className="relative transform transition-all duration-300 group-hover:-translate-y-0.5">
        <select
          value={config[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          className="w-full bg-white border border-stone-200 rounded-lg px-4 py-3.5 md:py-3 text-base md:text-sm text-stone-800 font-medium appearance-none 
          hover:border-champagne-400 hover:shadow-lg hover:shadow-stone-200/40
          focus:outline-none focus:border-champagne-500 focus:ring-1 focus:ring-champagne-500/20
          transition-all duration-300 cursor-pointer"
        >
          {Object.entries(options).map(([key, value]) => (
            <option key={key} value={value}>{value}</option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-stone-400 transition-all duration-300 group-hover:text-champagne-500">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col space-y-8">
      
      {generatedDescription ? (
        <div className="animate-fade-in-up opacity-0 fill-mode-forwards">
          <div className="p-6 bg-stone-900 text-stone-100 rounded-xl relative overflow-hidden shadow-2xl mb-4 group">
            <div className="absolute top-0 right-0 p-4 opacity-10 transition-transform duration-700 group-hover:rotate-12">
              <Sparkles className="w-24 h-24" />
            </div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-champagne-500/20 blur-3xl rounded-full"></div>
            
            <h3 className="text-champagne-300 font-serif text-lg mb-4 flex items-center gap-3 relative z-10">
              <Sparkles className="w-4 h-4" />
              <span className="tracking-widest text-sm">DESIGN CONCEPT</span>
            </h3>
            
            <div className="relative z-10">
              <Quote className="w-4 h-4 text-champagne-500/50 absolute -top-2 -left-2 transform -scale-x-100" />
              <p className="text-sm font-light leading-loose tracking-wide opacity-90 text-justify indent-6">
                {generatedDescription}
              </p>
            </div>
          </div>
          <div className="my-6 border-b border-stone-100"></div>
        </div>
      ) : (
        <div className="space-y-2 animate-fade-in-up opacity-0 fill-mode-forwards" style={{ animationDelay: '0ms' }}>
          <h2 className="text-2xl md:text-3xl font-serif text-stone-900">Design Studio</h2>
          <p className="text-xs text-stone-500 font-medium tracking-wide">CUSTOMIZE YOUR JEWELRY</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:gap-6">
          <SelectGroup label="Jewelry Type" field="type" options={JewelryType} delayClass="delay-[100ms]" />
          <SelectGroup label="Quality" field="imageSize" options={ImageSize} delayClass="delay-[125ms]" />
        </div>

        <div className="grid grid-cols-2 gap-4 md:gap-6">
          <SelectGroup label="Metal" field="metal" options={MetalType} delayClass="delay-[200ms]" />
          <SelectGroup label="Gemstone" field="gemstone" options={GemstoneType} delayClass="delay-[250ms]" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 md:gap-6">
           <SelectGroup label="Perspective" field="viewAngle" options={ViewAngle} delayClass="delay-[150ms]" />
           <SelectGroup label="Aspect Ratio" field="aspectRatio" options={AspectRatio} delayClass="delay-[175ms]" />
        </div>

        <div className="space-y-3 group animate-fade-in-up opacity-0 fill-mode-forwards delay-[300ms]">
          <label className="text-[10px] text-stone-500 font-bold tracking-[0.15em] uppercase pl-1 transition-colors duration-300 group-hover:text-champagne-600">
            Auxiliary / Details
          </label>
          <div className="space-y-3">
             <div className="flex flex-wrap gap-2">
                {AUX_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleChange('auxiliaryStone', opt)}
                    className={`
                      text-[10px] md:text-[11px] px-3 py-2 md:py-1.5 rounded-full border transition-all duration-300
                      ${config.auxiliaryStone === opt 
                        ? 'bg-stone-800 text-white border-stone-800 shadow-md' 
                        : 'bg-white text-stone-500 border-stone-200 hover:border-champagne-400 hover:text-champagne-600'}
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
            w-full relative overflow-hidden rounded-lg py-4
            ${disabled ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'bg-stone-900 text-white cursor-pointer hover:shadow-xl hover:shadow-stone-900/20 hover:-translate-y-0.5 active:scale-[0.99]'}
            transition-all duration-500 group
          `}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          
          <span className="relative z-10 flex items-center justify-center gap-3">
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin w-4 h-4 text-champagne-400" />
                <span className="text-xs font-bold tracking-[0.2em] uppercase">Crafting Masterpiece...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-champagne-400 group-hover:rotate-12 transition-transform duration-300" />
                <span className="text-xs font-bold tracking-[0.2em] uppercase">{generatedDescription ? 'Regenerate Design' : 'Generate Design'}</span>
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  );
};

export default ConfigPanel;
