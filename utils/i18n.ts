
import { Language } from '../types';

export const translations = {
  zh: {
    // Header
    'app.title': 'Lumina',
    'app.subtitle': '高级珠宝 AI 定制',
    'nav.settings': '设置',
    'nav.history': '历史 / 收藏',
    
    // Upload / Canvas
    'mode.upload': '上传照片',
    'mode.canvas': '手绘草图',
    'upload.title': '上传参考图',
    'upload.subtitle': '上传或拍摄物品照片，AI 将为您赋予新生',
    'upload.gallery': '相册',
    'upload.camera': '相机',
    'upload.drop': '拖拽图片到此处',

    // Config Panel
    'studio.title': '设计工坊',
    'studio.subtitle': '定制您的专属珠宝',
    'label.type': '品类',
    'label.quality': '画质',
    'label.metal': '材质',
    'label.gemstone': '主石',
    'label.perspective': '视角',
    'label.aspectRatio': '比例',
    'label.aux': '辅石 / 细节',
    'label.inspiration': '灵感 / 描述',
    'placeholder.aux': '自定义描述 (选填)...',
    'placeholder.inspiration': '描述您的设计灵感，例如：我想把这个形状做成一个复古风格的胸针，展现...',
    'btn.generate': '生成设计',
    'btn.generating': '正在设计...',
    'status.crafting': '正在铸造...',

    // Creative Studio
    'studio.workshop': '创意工坊',
    'studio.workshop_sub': 'CREATIVE STUDIO & REFINEMENT',
    'studio.concept': '设计理念',
    'label.refine': '智能修改 (REFINE)',
    'placeholder.refine': '例如：改为玫瑰金...',
    'label.quick_gen': '一键生成 (QUICK GEN)',
    'btn.views': '三视图',
    'btn.model': '模特试戴',
    'btn.photo': '摄影大片',
    'btn.specs': '查看生产工单',
    'btn.gen_specs': '生成工厂工单',
    'specs.calculating': '工单计算中...',
    'specs.note': '* AI 自动核算金重、宝石参数及预估成本',
    'btn.favorite': '收藏设计',
    'btn.favorited': '已收藏',
    'btn.back': '返回参数配置',
    'btn.return_studio': '返回创意工坊',
    
    // Slider
    'label.original': '原图',
    'label.designed': 'AI 设计',
    
    // Production Sheet
    'sheet.title': '工艺单',
    'sheet.print': '打印',
    'sheet.visual_ref': '视觉参考',
    'sheet.dimensions': '尺寸规格',
    'sheet.cost': '成本核算',
    'sheet.realtime': '实时汇率',
    'sheet.ref_price': '今日参考价',
    'sheet.est_material': '预估金料',
    'sheet.base_labor': '基础工费',
    'sheet.stone_cost': '配石成本',
    'sheet.factory_est': '出厂预估',
    'sheet.metal_params': '金工参数',
    'sheet.gemstones': '宝石镶嵌',
    'sheet.structure': '结构方式',
    'sheet.plating': '电镀要求',
    'sheet.notes': '生产注意事项',
    'sheet.modeler': '起版',
    'sheet.goldsmith': '执模/镶嵌',
    'sheet.qc': '质检',

    // --- ENUMS & OPTIONS ---
    
    // Aux Presets
    'aux.none': '无需辅石',
    'aux.halo': '微镶碎钻 Halo',
    'aux.sapphire': '蓝宝石点缀',
    'aux.filigree': '复古花丝',
    'aux.pearl': '珍珠流苏',
    'aux.minimal': '极简线条',

    // JewelryType
    'enum.ring': '戒指', 
    'enum.necklace': '项链', 
    'enum.earrings': '耳饰', 
    'enum.bracelet': '手镯', 
    'enum.brooch': '胸针',

    // MetalType
    'enum.any': '自定义/智能搭配',
    'enum.yellowgold18k': '18K 黄金',
    'enum.whitegold18k': '18K 白金',
    'enum.rosegold18k': '18K 玫瑰金',
    'enum.yellowgold24k': '24K 足金',
    'enum.gold14k': '14K 黄金',
    'enum.gold9k': '9K 黄金',
    'enum.platinum': '铂金 PT950',
    'enum.palladium': '钯金',
    'enum.silver': '925 纯银',
    'enum.titanium': '钛金属',

    // GemstoneType
    'enum.diamond': '钻石', 
    'enum.moissanite': '莫桑钻',
    'enum.ruby': '红宝石', 
    'enum.sapphire': '蓝宝石', 
    'enum.emerald': '祖母绿', 
    'enum.pearl': '珍珠', 
    'enum.jade': '翡翠', 
    'enum.none': '无主石',
    'enum.amethyst': '紫水晶',
    'enum.aquamarine': '海蓝宝石',
    'enum.morganite': '摩根石',
    'enum.tanzanite': '坦桑石',
    'enum.opal': '欧泊',
    'enum.citrine': '黄水晶',
    'enum.peridot': '橄榄石',
    'enum.garnet': '石榴石',
    'enum.tourmaline': '碧玺',

    // ViewAngle
    'enum.front': '正视图', 
    'enum.isometric': '3/4 侧视图', 
    'enum.top': '俯视图', 
    'enum.side': '侧面轮廓', 
    'enum.onmodel': '模特佩戴效果', 
    'enum.closeup': '微距细节', 
    'enum.pedestal': '展台艺术视角',

    // ImageSize
    'enum.s_1k': '1K',
    'enum.s_2k': '2K',
    'enum.s_4k': '4K',

    // AspectRatio
    'enum.square': '1:1',
    'enum.portrait_3_4': '3:4',
    'enum.landscape_4_3': '4:3',
    'enum.portrait_9_16': '9:16',
    'enum.landscape_16_9': '16:9',
  },
  en: {
    // Header
    'app.title': 'Lumina',
    'app.subtitle': 'AI JEWELRY ATELIER',
    'nav.settings': 'Settings',
    'nav.history': 'History',
    
    // Upload / Canvas
    'mode.upload': 'Upload',
    'mode.canvas': 'Sketch',
    'upload.title': 'Upload Reference',
    'upload.subtitle': 'Upload or capture an object to transform it',
    'upload.gallery': 'Gallery',
    'upload.camera': 'Camera',
    'upload.drop': 'Drop image here',

    // Config Panel
    'studio.title': 'Design Studio',
    'studio.subtitle': 'CUSTOMIZE YOUR JEWELRY',
    'label.type': 'Type',
    'label.quality': 'Quality',
    'label.metal': 'Metal',
    'label.gemstone': 'Main Stone',
    'label.perspective': 'View',
    'label.aspectRatio': 'Ratio',
    'label.aux': 'Details',
    'label.inspiration': 'Vision',
    'placeholder.aux': 'Optional details...',
    'placeholder.inspiration': 'Describe your inspiration, e.g., "Vintage brooch style..."',
    'btn.generate': 'Generate Design',
    'btn.generating': 'Generating...',
    'status.crafting': 'Crafting...',

    // Creative Studio
    'studio.workshop': 'Creative Studio',
    'studio.workshop_sub': 'REFINEMENT & VARIATIONS',
    'studio.concept': 'Design Concept',
    'label.refine': 'Refine',
    'placeholder.refine': 'e.g., Change to Rose Gold...',
    'label.quick_gen': 'Quick Gen',
    'btn.views': '3-Views',
    'btn.model': 'Try-On',
    'btn.photo': 'Editorial',
    'btn.specs': 'View Production Sheet',
    'btn.gen_specs': 'Generate Specs',
    'specs.calculating': 'Calculating...',
    'specs.note': '* AI estimates weight, gems & cost',
    'btn.favorite': 'Save to Collection',
    'btn.favorited': 'Saved',
    'btn.back': 'Back to Config',
    'btn.return_studio': 'Return to Studio',
    
    // Slider
    'label.original': 'Original',
    'label.designed': 'AI Design',
    
    // Production Sheet
    'sheet.title': 'Prod. Sheet',
    'sheet.print': 'Print',
    'sheet.visual_ref': 'Visual Reference',
    'sheet.dimensions': 'Dimensions',
    'sheet.cost': 'Cost Est.',
    'sheet.realtime': 'Realtime',
    'sheet.ref_price': 'Ref Price',
    'sheet.est_material': 'Est. Material',
    'sheet.base_labor': 'Base Labor',
    'sheet.stone_cost': 'Stone Cost',
    'sheet.factory_est': 'Factory Est.',
    'sheet.metal_params': 'Metal Params',
    'sheet.gemstones': 'Gemstones',
    'sheet.structure': 'Structure',
    'sheet.plating': 'Plating',
    'sheet.notes': 'Factory Notes',
    'sheet.modeler': 'Modeler',
    'sheet.goldsmith': 'Goldsmith',
    'sheet.qc': 'QC',

    // --- ENUMS & OPTIONS ---
    
    // Aux Presets
    'aux.none': 'No Side Stones',
    'aux.halo': 'Micro Pave Halo',
    'aux.sapphire': 'Sapphire Accents',
    'aux.filigree': 'Vintage Filigree',
    'aux.pearl': 'Pearl Tassels',
    'aux.minimal': 'Minimalist Lines',

    // JewelryType
    'enum.ring': 'Ring', 
    'enum.necklace': 'Necklace', 
    'enum.earrings': 'Earrings', 
    'enum.bracelet': 'Bracelet', 
    'enum.brooch': 'Brooch',

    // MetalType
    'enum.any': 'Smart Match',
    'enum.yellowgold18k': '18K Yellow Gold',
    'enum.whitegold18k': '18K White Gold',
    'enum.rosegold18k': '18K Rose Gold',
    'enum.yellowgold24k': '24K Pure Gold',
    'enum.gold14k': '14K Gold',
    'enum.gold9k': '9K Gold',
    'enum.platinum': 'Platinum PT950',
    'enum.palladium': 'Palladium',
    'enum.silver': '925 Sterling Silver',
    'enum.titanium': 'Titanium',

    // GemstoneType
    'enum.diamond': 'Diamond', 
    'enum.moissanite': 'Moissanite',
    'enum.ruby': 'Ruby', 
    'enum.sapphire': 'Sapphire', 
    'enum.emerald': 'Emerald', 
    'enum.pearl': 'Pearl', 
    'enum.jade': 'Jade', 
    'enum.none': 'No Main Stone',
    'enum.amethyst': 'Amethyst',
    'enum.aquamarine': 'Aquamarine',
    'enum.morganite': 'Morganite',
    'enum.tanzanite': 'Tanzanite',
    'enum.opal': 'Opal',
    'enum.citrine': 'Citrine',
    'enum.peridot': 'Peridot',
    'enum.garnet': 'Garnet',
    'enum.tourmaline': 'Tourmaline',

    // ViewAngle
    'enum.front': 'Front View', 
    'enum.isometric': '3/4 View', 
    'enum.top': 'Top View', 
    'enum.side': 'Side Profile', 
    'enum.onmodel': 'On Model', 
    'enum.closeup': 'Macro Closeup', 
    'enum.pedestal': 'Artistic Pedestal',

    // ImageSize
    'enum.s_1k': '1K',
    'enum.s_2k': '2K',
    'enum.s_4k': '4K',

    // AspectRatio
    'enum.square': '1:1',
    'enum.portrait_3_4': '3:4',
    'enum.landscape_4_3': '4:3',
    'enum.portrait_9_16': '9:16',
    'enum.landscape_16_9': '16:9',
  }
};

export const getTranslation = (lang: string | undefined, key: string): string => {
  const safeLang = (lang === 'en' || lang === 'zh') ? (lang as Language) : 'zh';
  return translations[safeLang][key as keyof typeof translations['en']] || key;
};
