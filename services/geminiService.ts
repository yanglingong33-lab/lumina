
import { GoogleGenAI } from "@google/genai";
import { DesignConfig, GenerationResult, AppSettings, VariationMode, ProductionSpecs } from "../types";

// User provided default
const DEFAULT_BASE_URL = "https://api.apimart.ai";
// Revert to the official stable preview as primary
const DEFAULT_MODEL = "gemini-3-pro-image-preview"; 
// Text model for concept generation
const TEXT_MODEL = "gemini-2.0-flash";

// Models to try if the primary one fails (in order)
const FALLBACK_MODELS = [
  'gemini-3-flash-preview',
  'gemini-2.0-flash',
  'gemini-2.0-pro-exp-02-05',
  'gemini-2.0-flash-exp'
];

const TYPE_TRANSLATIONS: Record<string, string> = {
  '戒指': 'Ring',
  '项链': 'Necklace',
  '耳饰': 'Earrings',
  '手镯': 'Bracelet',
  '胸针': 'Brooch'
};

const getEnglishType = (type: string) => TYPE_TRANSLATIONS[type] || type;

/**
 * Helper to get settings
 */
const getSettings = () => {
  const systemKey = process.env.API_KEY; 
  let apiKey = systemKey;
  let baseUrl: string = DEFAULT_BASE_URL;
  let modelName = DEFAULT_MODEL;

  try {
    const savedSettings = localStorage.getItem('lumina_settings');
    if (savedSettings) {
      const parsed: AppSettings = JSON.parse(savedSettings);
      if (parsed.apiKey && parsed.apiKey.trim()) apiKey = parsed.apiKey.trim();
      if (parsed.baseUrl && parsed.baseUrl.trim()) baseUrl = parsed.baseUrl.trim();
      if (parsed.modelName && parsed.modelName.trim()) modelName = parsed.modelName.trim();
    }
  } catch (e) { console.warn("Settings error", e); }

  // Clean Base URL
  if (baseUrl) {
    let rawUrl = baseUrl.replace(/\/+$/, '');
    if (rawUrl.endsWith('/v1')) rawUrl = rawUrl.substring(0, rawUrl.length - 3);
    else if (rawUrl.endsWith('/v1beta/models')) rawUrl = rawUrl.split('/v1beta/models')[0];
    else if (rawUrl.endsWith('/v1beta')) rawUrl = rawUrl.substring(0, rawUrl.length - 7);
    baseUrl = rawUrl;
  }

  return { apiKey, baseUrl, modelName, systemKey };
};

/**
 * Generates a jewelry design image based on an input image and configuration.
 * STEP 1: Image Generation Only
 */
export const generateJewelryDesign = async (
  base64Image: string,
  config: DesignConfig
): Promise<GenerationResult> => {
  const settings = getSettings();
  if (!settings.apiKey) throw new Error("AUTH_ERROR: 未配置 API Key。");

  // Prepare Data
  const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  // Smart Prompt Construction
  const isSmartMetal = config.metal.includes('智能') || config.metal.includes('自定义');
  const metalPrompt = isSmartMetal ? 'luxurious precious metal fitting the style' : config.metal;

  let gemstonePrompt = "";
  if (config.gemstone === '无主石') {
    gemstonePrompt = "focusing on pure sculptural metalwork, no main gemstone";
  } else if (config.gemstone.includes('智能') || config.gemstone.includes('自定义')) {
    gemstonePrompt = "featuring high-grade precious gemstones that complement the design";
  } else {
    gemstonePrompt = `featuring high-grade ${config.gemstone}`;
  }

  // Revised Prompt for Maximum Realism - IMAGE FOCUSED
  const prompt = `
    Role: Senior Haute Joaillerie Designer & Luxury Product Photographer.
    Task: Re-imagine the item in the image as a museum-grade luxury jewelry piece.
    
    PHOTOREALISTIC VISUALIZATION SPECS:
    - Subject: A single ${config.type} made of polished ${metalPrompt}, ${gemstonePrompt}, and ${config.auxiliaryStone || 'refined detailing'}.
    - Perspective: ${config.viewAngle}.
    - Lighting: Professional studio softbox lighting.
    - Style: ${config.description || 'Modern Elegance'}.
    - Background: Clean, neutral luxury grey or soft champagne gradient.
    
    Constraint: NO text, NO watermarks. The piece must feel physically heavy and correctly seated.
  `;

  // We only expect an image here
  const result = await executeGeneration(settings.apiKey, settings.baseUrl, prompt, cleanBase64, mimeType, config, settings.modelName, 'image');
  return {
    image: result.image,
    description: "正在撰写设计理念..." // Placeholder
  };
};

/**
 * Generates the design concept text.
 * STEP 2: Text Generation Only
 */
export const generateDesignConcept = async (
  base64Image: string,
  config: DesignConfig
): Promise<string> => {
  const settings = getSettings();
  if (!settings.apiKey) throw new Error("AUTH_ERROR: 未配置 API Key。");

  const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  const prompt = `
    Role: Senior Jewelry Designer.
    Task: Write a "Design Concept" (设计理念) in Chinese based on the provided reference image and the design parameters.
    
    Design Parameters:
    - Type: ${config.type}
    - Material: ${config.metal}
    - Gemstone: ${config.gemstone}
    - Details: ${config.auxiliaryStone || 'Classic setting'}
    - User Inspiration: ${config.description || 'None'}
    
    Requirements:
    1. Title: Create a poetic 4-character Chinese title for this piece (e.g., "晨曦之露").
    2. Concept: Describe the inspiration, craftsmanship, and the aesthetic narrative (approx. 100-120 words).
    3. Tone: Elegant, luxurious, professional.
    
    Output Format:
    Return ONLY the text. No markdown formatting like ** or ## around the title.
    Start with the title, then a new line, then the concept body.
  `;

  // Use a faster/text-capable model for this step. No imageConfig needed.
  try {
    const result = await executeGeneration(settings.apiKey, settings.baseUrl, prompt, cleanBase64, mimeType, {}, TEXT_MODEL, 'text');
    return result.description;
  } catch (e) {
    console.warn("Concept generation failed, using default.", e);
    return "设计理念生成中..."; 
  }
};

/**
 * Generates a variation (Edit, Model, Views) based on the GENERATED image.
 */
export const generateJewelryVariation = async (
  generatedImageBase64: string,
  mode: VariationMode,
  refinePrompt?: string
): Promise<GenerationResult> => {
  const settings = getSettings();
  if (!settings.apiKey) throw new Error("AUTH_ERROR: 未配置 API Key。");

  const mimeMatch = generatedImageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
  const cleanBase64 = generatedImageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  let prompt = "";
  let aspectRatio = "1:1";
  let fallbackDesc = "";

  switch (mode) {
    case VariationMode.REFINE:
      prompt = `
        Role: Senior Jewelry Designer.
        Task: Edit the jewelry in the input image based on the user's instruction.
        User Instruction: "${refinePrompt}"
        Requirements:
        - Keep the core composition and lighting of the input image similar unless asked to change.
        - Maintain photorealistic quality (8k, octane render).
        - Output a short Chinese description of what was changed.
      `;
      fallbackDesc = `修改: ${refinePrompt}`;
      break;
    case VariationMode.VIEWS:
      prompt = `
        Role: Technical Jewelry Illustrator & Photographer.
        Task: Create a technical multi-view composition of the jewelry shown in the input image.
        Requirements:
        - Show 3 distinct views: Front View, Side View, and Top View.
        - Arrange them elegantly on a clean white or light grey background.
        - Maintain the exact materials (Metal, Gems) from the input image.
        - High resolution, sharp details for manufacturing reference.
        - Output description: "三视图生成完毕"
      `;
      aspectRatio = "16:9";
      fallbackDesc = "三视图";
      break;
    case VariationMode.MODEL:
      prompt = `
        Role: Fashion Photographer.
        Task: Show the jewelry from the input image being worn by a high-fashion model.
        Requirements:
        - The model should be elegant, skin texture realistic.
        - Placement: Correct anatomical placement (e.g., ring on finger, necklace on neck).
        - Focus: Shallow depth of field, focus on the jewelry.
        - Lighting: Cinematic fashion lighting.
        - Output description: "模特佩戴效果展示"
      `;
      aspectRatio = "3:4";
      fallbackDesc = "模特试戴";
      break;
    case VariationMode.PHOTO:
      prompt = `
        Role: Commercial Product Photographer.
        Task: Create an award-winning advertising shot of the jewelry in the input image.
        Requirements:
        - Props: Place it on a textured surface (marble, silk, or slate) or a floating pedestal.
        - Lighting: Dramatic, high-contrast 'Rembrandt' lighting or ethereal 'Rim' lighting.
        - Atmosphere: Luxury, expensive, sophisticated.
        - Output description: "商业摄影大片展示"
      `;
      aspectRatio = "4:3";
      fallbackDesc = "摄影大片";
      break;
  }

  // Mock config for variation
  const variationConfig: any = {
    imageSize: '2K',
    aspectRatio: aspectRatio
  };

  const result = await executeGeneration(settings.apiKey, settings.baseUrl, prompt, cleanBase64, mimeType, variationConfig, settings.modelName, 'image');
  return {
    image: result.image,
    description: result.description || fallbackDesc
  };
};


/**
 * Generates technical production specifications (Factory Sheet)
 */
export const generateProductionSpecs = async (
  base64Image: string,
  config: DesignConfig
): Promise<ProductionSpecs> => {
  const settings = getSettings();
  if (!settings.apiKey) throw new Error("AUTH_ERROR: 未配置 API Key。");

  const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  // 1. 获取当前大致金价参考 (Hardcoded fallback logic if no external API)
  // Assuming ~620 CNY/g for 999 Gold, 18K is 75% pure + alloy cost.
  // 18K material cost approx 480-550 range including loss.
  const dateStr = new Date().toLocaleDateString('zh-CN');

  const prompt = `
    Role: 拥有20年经验的珠宝工厂生产主管 (Senior Jewelry Production Manager).
    Task: 请根据提供的珠宝设计图，生成一份可以直接下发给起版房和执模车间的《珠宝生产工艺确认单》。
    Language: 请使用**专业中文珠宝术语** (Professional Chinese Jewelry Terminology).
    
    Context Information:
    - Item Type: ${config.type}
    - Metal: ${config.metal}
    - Gemstone: ${config.gemstone}
    
    Instruction for Logic & Calculation (Critical):
    1.  **尺寸估算 (Dimensions)**: 
        -   如果是戒指，默认参考港度 13# (直径~17mm)，反推主石大小和金属臂厚 (通常女戒臂厚1.2mm-1.8mm)。
        -   如果是吊坠/项链，根据主石比例估算整体尺寸。
    2.  **工艺识别 (Craftsmanship)**:
        -   仔细观察图片光影。是“镜面抛光”(High Polish)? “拉丝工艺”(Brushed)? 还是“喷砂”(Sandblasted)?
        -   是否有“分色电镀”(Two-tone plating)?
    3.  **镶嵌方式 (Setting)**:
        -   识别主石是“爪镶”(Prong, 几爪?)、“包镶”(Bezel)、“卡镶”(Tension)?
        -   识别副石是“微钉镶”(Micro-pave)、“轨道镶”(Channel) 还是“共爪镶”(Shared-prong)?
    4.  **克重与成本核算 (Weight & Cost)**:
        -   **克重算法**: 基于视觉体积 x 金属密度。
            -   18K金密度 ≈ 15.5 g/cm³.
            -   925银密度 ≈ 10.4 g/cm³.
            -   铂金Pt950密度 ≈ 21.4 g/cm³.
            -   示例: 一个中等款18K女戒体积约0.25-0.35cm³ -> 重约 3.5g - 5.0g.
        -   **成本参考**: 
            -   设当前金价参考: 足金 ~620 CNY/g.
            -   18K金料价(含损耗)参考: ~520 CNY/g.
            -   银料价参考: ~10 CNY/g.
            -   工费(Labor): 简单款300-500, 复杂款(微镶) 800-2000+.
            -   给出 "Estimated Total" = (预估金重 * 料价) + 预估工费 + (预估配石成本). 
            -   *注: 主石价格差异极大，成本核算仅包含【金料+工费+普通配石】，不含主石成本。*

    Output JSON Schema (Strict):
    {
      "orderNo": "PO-${Date.now().toString().slice(-6)}",
      "title": "简短技术命名 (如: 18K金椭圆红宝四爪女戒)",
      "date": "${dateStr}",
      "measurements": {
        "size": "参考尺寸 (如: 港度13#)",
        "dimensions": "整体长宽高 (如: 12.5 x 10.5 x 6.5 mm)",
        "thickness": "关键壁厚 (如: 戒臂底厚1.3mm / 壁厚1.6mm)"
      },
      "metal": {
        "type": "具体成色 (如: AU750/18K玫瑰金)",
        "estimatedWeight": "预估净金重范围 (如: 3.2g - 3.5g)",
        "lossRate": "15% (标准损耗)",
        "densityInfo": "基于18K金密度15.5g/cm³测算"
      },
      "gemstones": {
        "main": {
          "name": "主石描述 (如: 椭圆切工红宝石)",
          "cut": "切工 (如: 刻面/素面/明亮式)",
          "size": "预估尺寸 (如: 6x8mm)",
          "qty": "数量 (如: 1粒)",
          "setting": "镶嵌工艺 (如: 经典四爪镶)"
        },
        "side": [
          {
            "type": "副石类型 (如: 圆形白钻)",
            "size": "尺寸 (如: 1.0mm - 1.2mm)",
            "qty": "预估数量 (如: 约24粒)",
            "setting": "镶嵌 (如: 显微镜微钉镶)"
          }
        ]
      },
      "craftsmanship": {
        "surfaceProcess": ["表面工艺1", "表面工艺2"],
        "structure": "结构描述 (如: 分件执模 / 一体浇铸)",
        "plating": "电镀要求 (如: 镀厚金 / 黑色铑金)"
      },
      "costEstimate": {
        "goldPriceRef": "今日参考金价 (如: 620元/克)",
        "materialCost": "预估金料成本范围",
        "laborCost": "预估工费 (起版+执模+镶嵌)",
        "stoneCostRef": "配石成本预估 (不含主石)",
        "totalEstimate": "出厂参考总价 (不含主石)",
        "currency": "CNY"
      },
      "factoryNotes": [
        "针对起版师的3-5条专业建议 (如: 注意戒臂内弧处理，保证佩戴舒适度)",
        "针对镶嵌师的建议 (如: 爪位需做圆头抛光，防止刮衣)",
        "结构建议 (如: 主石位底部需镂空，增加进光量)"
      ]
    }
  `;

  // Use Flash model for speed and logic
  try {
    const result = await executeGeneration(settings.apiKey, settings.baseUrl, prompt, cleanBase64, mimeType, {}, 'gemini-2.0-flash', 'text');
    // Extract JSON from text (in case it's wrapped in markdown code blocks)
    const text = result.description;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as ProductionSpecs;
    } else {
      throw new Error("Failed to parse production specs JSON");
    }
  } catch (e) {
    console.error("Specs generation error", e);
    // Return a dummy fallback to prevent crash
    return {
      orderNo: `ERR-${Date.now()}`,
      title: `${config.metal} ${config.type} (自动估算)`,
      date: dateStr,
      measurements: { size: "待确认", dimensions: "-", thickness: "-" },
      metal: { type: config.metal, estimatedWeight: "待确认", lossRate: "15%", densityInfo: "-" },
      gemstones: { 
          main: { name: config.gemstone, cut: "-", size: "-", qty: "1", setting: "待定" }, 
          side: [] 
      },
      craftsmanship: { surfaceProcess: ["镜面抛光"], structure: "一体", plating: "无" },
      costEstimate: { goldPriceRef: "-", materialCost: "0", laborCost: "0", stoneCostRef: "0", totalEstimate: "核算中", currency: "CNY" },
      factoryNotes: ["AI 解析失败，请人工核对图片工艺。"]
    };
  }
};

// Shared execution logic
const executeGeneration = async (
  apiKey: string, 
  baseUrl: string, 
  prompt: string, 
  base64: string, 
  mimeType: string, 
  config: any, 
  modelName: string,
  expectedType: 'image' | 'text'
): Promise<GenerationResult> => {

  const execute = async (currentKey: string, currentModel: string) => {
    // Check if proxy (baseUrl exists and is not googleapis)
    if (baseUrl && !baseUrl.includes('generativelanguage.googleapis.com')) {
      return await generateViaProxy(baseUrl, currentKey, prompt, base64, mimeType, config, currentModel, expectedType);
    } else {
      return await generateViaSDK(currentKey, prompt, base64, mimeType, config, currentModel, expectedType);
    }
  };

  try {
    return await execute(apiKey, modelName);
  } catch (error: any) {
    if ((error.message?.includes('AUTH_ERROR') || error.status === 401 || error.message?.includes('Invalid token')) && process.env.API_KEY) {
       console.warn("Retrying with system default key...");
       try {
         return await execute(process.env.API_KEY, modelName);
       } catch (retryError) { throw retryError; }
    }
    // Fallback logic for missing models
    const isModelMissing = error.message && (error.message.includes('not found') || error.message.includes('404') || error.message.includes('503'));
    if (isModelMissing) {
       console.warn(`Model ${modelName} failed. Attempting fallbacks...`);
       for (const fallbackModel of FALLBACK_MODELS) {
         try {
           return await execute(apiKey, fallbackModel);
         } catch (fbError) { console.debug("Fallback failed", fallbackModel); }
       }
    }
    throw error;
  }
};

/**
 * Implementation using Official SDK
 */
async function generateViaSDK(
  apiKey: string, 
  prompt: string, 
  base64Image: string, 
  mimeType: string,
  config: any,
  modelName: string,
  expectedType: 'image' | 'text'
): Promise<GenerationResult> {
  const ai = new GoogleGenAI({ apiKey });
  
  const makeConfig = (level: 'full' | 'no-size') => {
    const imgConfig: any = {};
    if (modelName.includes('gemini-3') && expectedType === 'image') {
       imgConfig.aspectRatio = config.aspectRatio || '1:1';
       if (level === 'full' && config.imageSize) imgConfig.imageSize = config.imageSize;
    }
    // For text models demanding JSON
    const generationConfig: any = {};
    if (expectedType === 'text' && prompt.includes('JSON')) {
        generationConfig.responseMimeType = "application/json";
    }
    if (expectedType === 'image') {
        generationConfig.imageConfig = Object.keys(imgConfig).length > 0 ? imgConfig : undefined;
    }
    return generationConfig;
  };

  const doGenerate = async (currentConfig: any) => {
    const response = await ai.models.generateContent({
      model: modelName, 
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType, data: base64Image } },
        ],
      },
      config: currentConfig,
    });
    return parseContentParts(response, expectedType);
  };

  try {
    return await doGenerate(makeConfig('full'));
  } catch (error: any) {
    if (isRetryable400(error) && expectedType === 'image') {
        return await doGenerate(makeConfig('no-size'));
    }
    handleError(error);
    throw error; 
  }
}

/**
 * Implementation using Proxy (Fetch)
 */
async function generateViaProxy(
  baseUrl: string,
  apiKey: string,
  prompt: string,
  base64Image: string,
  mimeType: string,
  config: any,
  modelName: string,
  expectedType: 'image' | 'text'
): Promise<GenerationResult> {
  
  const makePayload = (model: string, level: 'full' | 'no-size') => {
    const imgConfig: any = {};
    const generationConfig: any = {};

    if (model.includes('gemini-3') && expectedType === 'image') {
      imgConfig.aspectRatio = config.aspectRatio || '1:1';
      if (level === 'full' && config.imageSize) imgConfig.imageSize = config.imageSize;
    }

    if (expectedType === 'image') {
       generationConfig.imageConfig = Object.keys(imgConfig).length > 0 ? imgConfig : undefined;
    } else if (prompt.includes('JSON')) {
       generationConfig.responseMimeType = "application/json";
    }

    return {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType, data: base64Image } }
        ]
      }],
      generationConfig: generationConfig
    };
  };

  const performFetch = async (targetModel: string, level: 'full' | 'no-size' = 'full') => {
    const url = `${baseUrl}/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
    console.log(`Attempting generate with model: ${targetModel}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${apiKey}`, // Removed: Can conflict with key param in some proxies
        'x-goog-api-key': apiKey // Added: Standard header for key-based auth
      },
      body: JSON.stringify(makePayload(targetModel, level))
    });

    if (!response.ok) {
      const errText = await response.text();
      let errJson;
      try { errJson = JSON.parse(errText); } catch(e) {}
      const errorMessage = errJson?.error?.message || errJson?.message || `HTTP ${response.status} Error`;
      throw new Error(errorMessage);
    }
    const data = await response.json();
    return parseContentParts(data, expectedType);
  };

  try {
    return await performFetch(modelName, 'full');
  } catch (error: any) {
    if (isRetryable400(error) && expectedType === 'image') return await performFetch(modelName, 'no-size');
    handleError(error);
    throw error;
  }
}

function isRetryable400(error: any) {
  const msg = error.message || '';
  return msg.includes('INVALID_ARGUMENT') || msg.includes('400');
}

/**
 * Robust parsing of response parts
 */
function parseContentParts(response: any, expectedType: 'image' | 'text'): GenerationResult {
  let image = '';
  let description = '';
  const candidates = response.candidates || response.response?.candidates;
  
  if (candidates && candidates[0]?.content?.parts) {
    for (const part of candidates[0].content.parts) {
      // 1. Check for Inline Image
      if (part.inlineData && part.inlineData.data) {
        image = `data:image/png;base64,${part.inlineData.data}`;
      }
      // 2. Check for Text (which might contain markdown image)
      else if (part.text) {
        const text = part.text;
        // Check for Markdown Image embedded in text
        const imageMarkdownMatch = text.match(/!\[.*?\]\((data:image\/.*?;base64,.*?)\)/);
        if (imageMarkdownMatch && imageMarkdownMatch[1]) {
           image = imageMarkdownMatch[1];
           // Remove the image string from description
           description += text.replace(imageMarkdownMatch[0], '');
        } else {
           description += text;
        }
      }
    }
  }

  // Final Validation based on Expectation
  if (expectedType === 'image' && !image) {
    throw new Error("API 返回数据为空，未生成图片。");
  }

  return {
    image,
    description: description.replace(/^#+\s*设计理念.*?\n/, '').replace(/^\*\*设计理念.*?\*\*/, '').trim()
  };
}

function handleError(error: any) {
  console.error("Gemini Error:", error);
  let errorMessage = "生成设计时出现问题。";
  if (error.message && error.message.includes("Failed to fetch")) errorMessage = "网络请求失败，请检查 Base URL。";
  else if (error.message && (error.message.includes("401") || error.message.includes("403"))) errorMessage = "AUTH_ERROR: API Key 无效或过期。";
  else if (error.message) errorMessage = `错误: ${error.message}`;
  throw new Error(errorMessage);
}
