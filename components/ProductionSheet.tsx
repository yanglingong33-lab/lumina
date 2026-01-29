
import React from 'react';
import { ProductionSpecs } from '../types';
import { X, Printer, Hammer, Coins, Gem, ClipboardList, AlertTriangle, Scale, Ruler } from 'lucide-react';

interface ProductionSheetProps {
  specs: ProductionSpecs;
  image: string;
  onClose: () => void;
}

const ProductionSheet: React.FC<ProductionSheetProps> = ({ specs, image, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-stone-900/80 backdrop-blur-sm flex items-center justify-center print:p-0">
      
      {/* 
        Main Modal Container - Full Screen on Mobile, Centered Card on Desktop
        Using Flex column to allow header to be fixed and body to scroll independently
      */}
      <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:w-[900px] md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in print:shadow-none print:h-auto print:rounded-none print:max-h-none print:w-full">
        
        {/* Fixed Header */}
        <div className="flex-none h-16 border-b border-stone-200 bg-stone-50 flex justify-between items-center px-4 md:px-6 z-20 print:hidden shadow-sm">
           <h2 className="text-base md:text-lg font-bold text-stone-900 flex items-center gap-2 uppercase tracking-widest truncate">
             <ClipboardList className="w-5 h-5 text-champagne-500 shrink-0" /> 
             <span className="truncate">工艺单 | {specs.orderNo}</span>
           </h2>
           <div className="flex gap-2 shrink-0">
             <button onClick={handlePrint} className="p-2.5 hover:bg-stone-200 rounded-lg text-stone-600 flex items-center gap-2 text-xs font-bold transition-colors">
               <Printer className="w-4 h-4" /> <span className="hidden sm:inline">打印</span>
             </button>
             <button onClick={onClose} className="p-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-full transition-colors">
               <X className="w-5 h-5" />
             </button>
           </div>
        </div>

        {/* Scrollable Body - Critical for Mobile View */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white p-5 md:p-8 pb-20 md:pb-8 print:p-0 print:overflow-visible">
          
          {/* Printable Sheet Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-end border-b-2 border-stone-900 pb-4 mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mb-1">LUMINA ATELIER</h1>
              <p className="text-[10px] md:text-xs text-stone-500 uppercase tracking-[0.3em]">Haute Joaillerie Production Order</p>
            </div>
            <div className="flex flex-row md:flex-col justify-between md:justify-end md:items-end gap-2 text-stone-600">
              <div className="text-sm font-mono font-bold bg-stone-100 px-2 py-0.5 rounded">NO: {specs.orderNo}</div>
              <div className="text-xs">Date: {specs.date}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            
            {/* Left Column: Visuals & Costs */}
            <div className="md:col-span-4 flex flex-col gap-4">
               {/* Design Image */}
               <div className="aspect-square w-full border border-stone-200 p-3 flex items-center justify-center bg-stone-50 rounded-lg print:border-stone-300 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-[radial-gradient(#ddd_1px,transparent_1px)] [background-size:16px_16px] opacity-30"></div>
                  <img src={image} alt="Technical" className="relative max-w-full max-h-full object-contain mix-blend-multiply z-10" />
                  <div className="absolute bottom-2 left-2 bg-black/5 backdrop-blur text-[10px] text-stone-500 px-2 py-1 rounded">Visual Reference</div>
               </div>
               
               {/* Specs Grid (Compact) */}
               <div className="bg-stone-50 rounded-lg p-4 border border-stone-100 text-sm space-y-3">
                  <div className="flex items-center gap-2 font-bold text-stone-900 border-b border-stone-200 pb-2">
                     <Ruler className="w-4 h-4 text-champagne-500" /> 尺寸规格
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                     <div className="text-stone-500">圈口/尺寸:</div>
                     <div className="font-medium text-right">{specs.measurements.size}</div>
                     <div className="text-stone-500">整体规格:</div>
                     <div className="font-medium text-right">{specs.measurements.dimensions}</div>
                     <div className="text-stone-500">关键壁厚:</div>
                     <div className="font-medium text-right">{specs.measurements.thickness}</div>
                  </div>
               </div>

               {/* Cost Estimation */}
               <div className="border-2 border-stone-100 rounded-lg p-4 bg-white shadow-sm print:border-stone-300">
                  <h4 className="font-bold text-sm border-b border-stone-100 pb-2 mb-3 flex items-center gap-2 text-stone-800">
                    <Coins className="w-4 h-4 text-champagne-500" /> 成本核算 (工厂端)
                  </h4>
                  <div className="space-y-2 text-sm">
                     <div className="flex justify-between text-stone-500 text-xs">
                        <span>参考金价:</span> <span>{specs.costEstimate.goldPriceRef}</span>
                     </div>
                     <div className="flex justify-between text-stone-600"><span>预估金料:</span> <span className="font-mono">{specs.costEstimate.materialCost}</span></div>
                     <div className="flex justify-between text-stone-600"><span>基础工费:</span> <span className="font-mono">{specs.costEstimate.laborCost}</span></div>
                     <div className="flex justify-between text-stone-600"><span>配石成本:</span> <span className="font-mono">{specs.costEstimate.stoneCostRef}</span></div>
                     
                     <div className="border-t-2 border-stone-100 border-dashed my-2 pt-2 flex justify-between items-baseline">
                        <span className="font-bold text-stone-900">出厂预估:</span> 
                        <span className="font-bold text-lg text-champagne-600 print:text-black">{specs.costEstimate.totalEstimate} <span className="text-xs text-stone-400">{specs.costEstimate.currency}</span></span>
                     </div>
                  </div>
                  <p className="text-[10px] text-stone-400 mt-2 leading-relaxed bg-stone-50 p-2 rounded">* 不含主石成本。实际费用以出货实重为准。</p>
               </div>
            </div>

            {/* Right Column: Detailed Specs */}
            <div className="md:col-span-8 space-y-6">
               <div className="bg-stone-900 text-white px-4 py-3 rounded-lg shadow-md flex justify-between items-center">
                 <h3 className="font-bold text-lg">{specs.title}</h3>
                 <span className="text-xs bg-white/20 px-2 py-1 rounded">{specs.metal.type}</span>
               </div>

               {/* Metal Section */}
               <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-2"><Scale className="w-3.5 h-3.5" /> 金工参数 (Metalwork)</h4>
                  <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-stone-50 text-xs text-stone-500 border-b border-stone-200">
                         <tr>
                            <th className="py-2 px-3 text-left font-medium">成色</th>
                            <th className="py-2 px-3 text-left font-medium">预估净重</th>
                            <th className="py-2 px-3 text-left font-medium">损耗率</th>
                            <th className="py-2 px-3 text-left font-medium">表面处理</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        <tr>
                          <td className="py-3 px-3 font-medium">{specs.metal.type}</td>
                          <td className="py-3 px-3 font-bold text-stone-900">{specs.metal.estimatedWeight}</td>
                          <td className="py-3 px-3 text-stone-600">{specs.metal.lossRate}</td>
                          <td className="py-3 px-3">
                             <div className="flex gap-1 flex-wrap">
                                {specs.craftsmanship.surfaceProcess.map((p,i) => (
                                   <span key={i} className="px-2 py-0.5 bg-stone-100 rounded text-xs text-stone-600 border border-stone-200">{p}</span>
                                ))}
                             </div>
                          </td>
                        </tr>
                        <tr className="bg-stone-50/30">
                           <td colSpan={4} className="py-2 px-3 text-xs text-stone-400 italic">
                              * {specs.metal.densityInfo}
                           </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
               </div>

               {/* Gemstone Section */}
               <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3 flex items-center gap-2"><Gem className="w-3.5 h-3.5" /> 宝石镶嵌 (Gemstones)</h4>
                  
                  {/* Main Stone */}
                  <div className="border border-stone-200 rounded-lg overflow-hidden mb-3">
                      <div className="bg-champagne-50/50 px-3 py-2 border-b border-stone-200 flex justify-between items-center">
                         <span className="text-xs font-bold text-stone-700">主石 (Main Stone)</span>
                         <span className="text-xs text-stone-500">{specs.gemstones.main.setting}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 p-3 text-sm">
                         <div>
                            <div className="text-[10px] text-stone-400 uppercase">Name</div>
                            <div className="font-medium">{specs.gemstones.main.name}</div>
                         </div>
                         <div>
                            <div className="text-[10px] text-stone-400 uppercase">Cut</div>
                            <div className="font-medium">{specs.gemstones.main.cut}</div>
                         </div>
                         <div>
                            <div className="text-[10px] text-stone-400 uppercase">Size</div>
                            <div className="font-medium">{specs.gemstones.main.size}</div>
                         </div>
                         <div>
                            <div className="text-[10px] text-stone-400 uppercase">Qty</div>
                            <div className="font-medium">{specs.gemstones.main.qty}</div>
                         </div>
                      </div>
                  </div>

                  {/* Side Stones */}
                  {specs.gemstones.side.length > 0 && (
                     <div className="border border-stone-200 rounded-lg overflow-hidden">
                        <div className="bg-stone-50 px-3 py-2 border-b border-stone-200">
                           <span className="text-xs font-bold text-stone-700">配石清单 (Side Stones)</span>
                        </div>
                        <table className="w-full text-sm">
                           <tbody className="divide-y divide-stone-100">
                              {specs.gemstones.side.map((s, i) => (
                                 <tr key={i} className="hover:bg-stone-50">
                                    <td className="py-2 px-3 text-stone-600">{s.type}</td>
                                    <td className="py-2 px-3 text-stone-600">{s.size}</td>
                                    <td className="py-2 px-3 font-medium text-stone-800">x {s.qty}</td>
                                    <td className="py-2 px-3 text-stone-500 text-right">{s.setting}</td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  )}
               </div>

               {/* Craftsmanship & Structure */}
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-stone-50 p-3 rounded-lg border border-stone-100">
                     <div className="text-[10px] text-stone-400 uppercase font-bold mb-1">结构方式 (Structure)</div>
                     <div className="text-sm font-medium text-stone-800">{specs.craftsmanship.structure}</div>
                  </div>
                  <div className="bg-stone-50 p-3 rounded-lg border border-stone-100">
                     <div className="text-[10px] text-stone-400 uppercase font-bold mb-1">电镀要求 (Plating)</div>
                     <div className="text-sm font-medium text-stone-800">{specs.craftsmanship.plating}</div>
                  </div>
               </div>

               {/* Factory Notes */}
               <div className="border border-red-100 bg-red-50/30 p-4 rounded-lg print:border-red-200">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2 flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5" /> 生产注意事项 (Factory Notes)</h4>
                  <ul className="text-sm text-stone-700 list-decimal list-inside space-y-1.5 marker:font-bold marker:text-red-400">
                     {specs.factoryNotes.map((note, i) => (
                       <li key={i}>{note}</li>
                     ))}
                  </ul>
               </div>

            </div>
          </div>
          
          {/* Footer Signature - Responsive Layout */}
          <div className="mt-12 pt-8 border-t-2 border-stone-200 flex flex-col sm:flex-row justify-between text-sm text-stone-500 gap-8 sm:gap-4 print:mt-8">
             <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-stone-400">起版 (Modeler)</span>
                <div className="h-8 border-b border-stone-300 w-full sm:w-40"></div>
             </div>
             <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-stone-400">执模/镶嵌 (Goldsmith)</span>
                <div className="h-8 border-b border-stone-300 w-full sm:w-40"></div>
             </div>
             <div className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-wider font-bold text-stone-400">质检 (QC)</span>
                <div className="h-8 border-b border-stone-300 w-full sm:w-40"></div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProductionSheet;
