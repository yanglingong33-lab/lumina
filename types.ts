
export enum MetalType {
  YellowGold = '18K 黄金',
  WhiteGold = '18K 白金',
  RoseGold = '18K 玫瑰金',
  Platinum = '铂金',
  Silver = '925 纯银'
}

export enum GemstoneType {
  Diamond = '钻石',
  Ruby = '红宝石',
  Sapphire = '蓝宝石',
  Emerald = '祖母绿',
  Pearl = '珍珠',
  Opal = '欧泊',
  Jade = '翡翠',
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
}

export type AppState = 'IDLE' | 'CONFIGURING' | 'GENERATING' | 'RESULT';
