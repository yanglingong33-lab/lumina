import React from 'react';
import { X, ArrowRight, Trash2, Heart } from 'lucide-react';
import { DesignHistoryItem } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: DesignHistoryItem[];
  onSelect: (item: DesignHistoryItem) => void;
  onDelete?: (id: string, e: React.MouseEvent) => void;
}

const HistoryDrawer: React.FC<HistoryDrawerProps> = ({ isOpen, onClose, history, onSelect, onDelete }) => {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-stone-900/20 backdrop-blur-sm z-40 transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full md:w-[380px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50 backdrop-blur">
          <div>
            <h2 className="text-xl font-serif text-stone-800">我的收藏</h2>
            <p className="text-[10px] text-stone-400 uppercase tracking-widest mt-0.5 font-bold">MY COLLECTION</p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-stone-50/30">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-stone-400 space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                <Heart className="w-8 h-8 text-red-200" />
              </div>
              <div>
                <p className="font-serif text-lg text-stone-600">暂无收藏</p>
                <p className="text-xs font-light mt-1 text-stone-400">点击生成页面的心形按钮收藏您喜欢的设计</p>
              </div>
            </div>
          ) : (
            history.map((item) => (
              <div 
                key={item.id}
                onClick={() => onSelect(item)}
                className="group cursor-pointer bg-white rounded-xl overflow-hidden border border-stone-100 hover:border-champagne-300 transition-all duration-300 hover:shadow-soft relative"
              >
                <div className="flex h-28">
                  {/* Generated Image Thumbnail */}
                  <div className="w-28 h-full flex-shrink-0 relative overflow-hidden bg-stone-50 border-r border-stone-100">
                    <img 
                      src={item.generatedImage} 
                      alt="Generated" 
                      className="w-full h-full object-cover p-2 group-hover:scale-110 transition-transform duration-500" 
                    />
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start pr-6">
                         <h3 className="text-stone-800 font-serif font-bold text-sm line-clamp-1">{item.config.metal} {item.config.type}</h3>
                      </div>
                      <p className="text-[10px] text-stone-400 mt-1 font-medium uppercase tracking-wider">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-end text-champagne-500 text-[10px] font-bold tracking-widest gap-1 group-hover:gap-2 transition-all">
                      查看详情 <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>

                {/* Delete Button - Only visible on hover/focus */}
                {onDelete && (
                  <button
                    onClick={(e) => onDelete(item.id, e)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-stone-100 text-stone-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all duration-200 transform hover:scale-110"
                    title="移除收藏"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default HistoryDrawer;