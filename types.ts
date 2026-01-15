
export enum MetalType {
  YellowGold18K = '18K 黄金',
  WhiteGold18K = '18K 白金',
  RoseGold18K = '18K 玫瑰金',
  YellowGold24K = '24K 足金',
  Gold14K = '14K 黄金',
  Gold9K = '9K 黄金',
  Platinum = '铂金 PT950',
  Palladium = '钯金',
  Silver = '925 纯银',
  Titanium = '钛金属'
}

export enum GemstoneType {
  Diamond = '钻石',
  Moissanite = '莫桑钻',
  Ruby = '红宝石',
  Sapphire = '蓝宝石',
  Emerald = '祖母绿',
  Amethyst = '紫水晶',
  Aquamarine = '海蓝宝石',
  Morganite = '摩根石',
  Tanzanite = '坦桑石',
  Pearl = '珍珠',
  Opal = '欧泊',
  Jade = '翡翠',
  Citrine = '黄水晶',
  Peridot = '橄榄石',
  Garnet = '石榴石',
  Tourmaline = '碧玺',
  None = '无主石'
}

export enum JewelryType {
  Ring = '戒指',
  Necklace = '项链',
  Earrings = '耳饰',
  Bracelet = '手镯',
  Brooch = '胸针'
}

export enum ViewAngle {
  Front = '正视图',
  Isometric = '3/4 侧视图',
  Top = '俯视图',
  Side = '侧面轮廓',
  OnModel = '模特佩戴效果',
  Closeup = '微距细节',
  Pedestal = '展台艺术视角'
}

export enum ImageSize {
  S_1K = '1K',
  S_2K = '2K',
  S_4K = '4K'
}

export enum AspectRatio {
  Square = '1:1',
  Portrait_3_4 = '3:4',
  Landscape_4_3 = '4:3',
  Portrait_9_16 = '9:16',
  Landscape_16_9 = '16:9'
}

export interface DesignConfig {
  metal: MetalType;
  gemstone: GemstoneType;
  auxiliaryStone: string;
  type: JewelryType;
  viewAngle: ViewAngle;
  imageSize: ImageSize;
  aspectRatio: AspectRatio;
  description: string;
}

export interface GenerationResult {
  image: string; // Base64
  description: string;
}

export interface DesignHistoryItem {
  id: string;
  timestamp: number;
  originalImage: string;
  generatedImage: string;
  designDescription?: string;
  config: DesignConfig;
}

export interface AppSettings {
  apiKey: string;
  baseUrl: string;
  modelName?: string;
}

export type AppState = 'IDLE' | 'CONFIGURING' | 'GENERATING' | 'RESULT';
