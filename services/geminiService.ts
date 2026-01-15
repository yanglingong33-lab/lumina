
import { GoogleGenAI } from "@google/genai";
import { DesignConfig, GenerationResult, AppSettings, VariationMode } from "../types";

// User provided default
const DEFAULT_BASE_URL = "https://api.apimart.ai";
// Revert to the official stable preview as primary
const DEFAULT_MODEL = "gemini-3-pro-image-preview"; 

// Models to try if the primary one fails (in order of preference)
const FALLBACK_MODELS = [
  'gemini-2.0-flash',                // Latest stable fast model
  'gemini-2.0-pro-exp-02-05',        // Latest pro experimental
  'gemini-2.0-flash-thinking-exp-01-21',
  'gemini-2.0-flash-exp',            // Older experimental
  'gemini-exp-1206'                  // Legacy experimental
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
 * Generates a jewelry design based on an input image and configuration.
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

  // Revised Prompt for Maximum Realism
  const prompt = `
    Role: Senior Haute Joaillerie Designer & Luxury Product Photographer.
    Task: Generate a high-fidelity photorealistic image of a museum-grade luxury jewelry piece based on the input image.
    
    STEP 1: DESIGN CONCEPT (Output in Chinese)
    Write a "设计理念" (Design Concept).
    - Focus on craftsmanship: Explain the use of ${config.metal} and how ${config.gemstone} is set.
    - Aesthetic narrative: Describe how the silhouette of the original object inspired this piece.
    - Length: ~120 words.
    
    STEP 2: PHOTOREALISTIC VISUALIZATION
    Generate the image with the following strictly enforced standards:
    - Subject: A single ${config.type} made of polished ${config.metal}, featuring high-grade ${config.gemstone} and ${config.auxiliaryStone || 'refined detailing'}.
    - Perspective: ${config.viewAngle}.
    - Lighting: Professional studio softbox lighting.
    - Style: ${config.description || 'Modern Elegance'}.
    - Background: Clean, neutral luxury grey or soft champagne gradient.
    
    Constraint: NO text, NO watermarks. The piece must feel physically heavy and correctly seated.
  `;

  return executeGeneration(settings.apiKey, settings.baseUrl, prompt, cleanBase64, mimeType, config, settings.modelName);
};

/**
 * Generates a variation (Edit, Model, Views) based on the GENERATED image.
 */
export const generateJewelryVariation = async (
  generatedImageBase64: string,
  mode: VariationMode,
  itemType: string,
  refinePrompt?: string
): Promise<GenerationResult> => {
  const settings = getSettings();
  if (!settings.apiKey) throw new Error("AUTH_ERROR: 未配置 API Key。");

  const mimeMatch = generatedImageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
  const cleanBase64 = generatedImageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  let prompt = "";
  let aspectRatio = "1:1";

  // Translate to English to ensure the model strictly follows the constraints
  const itemTypeEn = getEnglishType(itemType);
  const typeContext = itemType ? `The item is strictly a ${itemTypeEn}.` : "The item is a piece of jewelry.";

  switch (mode) {
    case VariationMode.REFINE:
      prompt = `
        Role: Senior Jewelry Designer.
        Task: Generate an edited image of the jewelry based on the user's instruction.
        Context: ${typeContext}
        User Instruction: "${refinePrompt}"
        Requirements:
        - Keep the core composition and lighting of the input image similar unless asked to change.
        - Maintain photorealistic quality (8k, octane render).
        - Ensure it remains a ${itemTypeEn} if not explicitly asked to change the type.
        - Output a short Chinese description of what was changed.
      `;
      break;
    case VariationMode.VIEWS:
      prompt = `
        Role: Technical Jewelry Illustrator & Photographer.
        Task: Generate a technical multi-view composition image of the ${itemTypeEn} shown in the input image.
        Requirements:
        - Show 3 distinct views: Front View, Side View, and Top View.
        - Arrange them elegantly on a clean white or light grey background.
        - Maintain the exact materials (Metal, Gems) from the input image.
        - High resolution, sharp details for manufacturing reference.
        - Output description: "三视图生成完毕"
      `;
      aspectRatio = "16:9";
      break;
    case VariationMode.MODEL:
      prompt = `
        Role: Fashion Photographer.
        Task: Generate a photorealistic fashion photograph of the ${itemTypeEn} from the input image being worn by a model.
        
        CRITICAL RULES:
        1. IDENTITY: The item is strictly a ${itemTypeEn}. Do NOT transform it into another type of jewelry.
           - If Brooch: It MUST be pinned to the chest/lapel. NEVER around the neck.
           - If Ring: It MUST be on a finger.
        2. SCALE: Maintain realistic physical size.
           - Brooch: 3-5cm. Small.
           - Ring: ~2cm. Small.
           - Do NOT make the item giant or disproportionate.
        3. PLACEMENT:
           - Brooch -> Chest/Lapel
           - Ring -> Finger
           - Necklace -> Neck
           - Earrings -> Ears
           
        Visuals:
        - Model: High fashion, elegant, realistic skin texture.
        - Focus: Shallow depth of field, sharp focus on the ${itemTypeEn}.
        - Lighting: Cinematic fashion lighting.
        - Output description: "模特佩戴效果展示"
      `;
      aspectRatio = "3:4";
      break;
    case VariationMode.PHOTO:
      prompt = `
        Role: Commercial Product Photographer.
        Task: Generate an award-winning advertising photograph of the ${itemTypeEn} in the input image.
        Requirements:
        - Subject: ${typeContext} Do NOT change the item type.
        - Props: Place the ${itemTypeEn} on a textured surface (marble, silk, or slate) or a floating pedestal.
        - Scale: Ensure the item looks like its correct physical size (e.g. a ring is small, a necklace is larger).
        - Lighting: Dramatic, high-contrast 'Rembrandt' lighting or ethereal 'Rim' lighting.
        - Atmosphere: Luxury, expensive, sophisticated.
        - Output description: "商业摄影大片展示"
      `;
      aspectRatio = "4:3";
      break;
  }

  // Mock config for variation
  const variationConfig: any = {
    imageSize: '2K',
    aspectRatio: aspectRatio
  };

  return executeGeneration(settings.apiKey, settings.baseUrl, prompt, cleanBase64, mimeType, variationConfig, settings.modelName);
};

// Shared execution logic
const executeGeneration = async (apiKey: string, baseUrl: string, prompt: string, base64: string, mimeType: string, config: any, modelName: string) => {
  const execute = async (currentKey: string, currentModel: string) => {
    if (baseUrl || currentKey.startsWith('sk-')) {
      return await generateViaProxy(baseUrl, currentKey, prompt, base64, mimeType, config, currentModel);
    } else {
      return await generateViaSDK(currentKey, prompt, base64, mimeType, config, currentModel);
    }
  };

  try {
    return await execute(apiKey, modelName);
  } catch (error: any) {
    const errorMsg = error.message || '';
    const isAuthError = (errorMsg.includes('AUTH_ERROR') || error.status === 401 || errorMsg.includes('无效的令牌') || errorMsg.includes('Invalid token'));
    
    if (isAuthError) {
       // Fallback to system key if available and different
       if (process.env.API_KEY && apiKey !== process.env.API_KEY) {
          console.warn("Retrying with system default key...");
          try {
            return await execute(process.env.API_KEY, modelName);
          } catch (retryError) { 
             throw new Error("AUTH_ERROR: API Key 无效或过期，请检查设置。");
          }
       }
       throw new Error("AUTH_ERROR: API Key 无效或过期，请检查设置。");
    }
    throw error;
  }
};

/**
 * Direct SDK Call
 */
async function generateViaSDK(
  apiKey: string, 
  prompt: string, 
  base64Image: string, 
  mimeType: string,
  config: any,
  modelName: string
): Promise<GenerationResult> {
  const ai = new GoogleGenAI({ apiKey });
  
  const makeConfig = (level: 'full' | 'no-size') => {
    const imgConfig: any = {};
    if (modelName.includes('gemini-3')) {
       imgConfig.aspectRatio = config.aspectRatio || '1:1';
       if (level === 'full' && config.imageSize) imgConfig.imageSize = config.imageSize;
    }
    return imgConfig;
  };

  const doGenerate = async (targetModel: string, currentImageConfig: any) => {
    const response = await ai.models.generateContent({
      model: targetModel, 
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType, data: base64Image } },
        ],
      },
      config: {
        imageConfig: currentImageConfig,
      },
    });
    return parseResponse(response);
  };

  try {
    return await doGenerate(modelName, makeConfig('full'));
  } catch (error: any) {
    const isModelMissing = error.message && (error.message.includes('not found') || error.message.includes('404') || error.message.includes('503'));
    
    // SDK Fallback Logic
    if (isModelMissing) {
       console.warn(`Model ${modelName} failed (SDK). Attempting fallbacks...`);
       const fallbackCandidates = FALLBACK_MODELS.filter(m => m !== modelName);
       for (const fallbackModel of fallbackCandidates) {
         try {
           return await doGenerate(fallbackModel, {}); // Fallback models might not support imageConfig, safer to pass empty or minimal
         } catch (fbError) { console.debug(`Fallback ${fallbackModel} failed:`, fbError); }
       }
    }
  
    if (isRetryable400(error)) {
        return await doGenerate(modelName, makeConfig('no-size'));
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
  modelName: string
): Promise<GenerationResult> {
  
  const makePayload = (model: string, level: 'full' | 'no-size') => {
    const imgConfig: any = {};
    if (model.includes('gemini-3')) {
      imgConfig.aspectRatio = config.aspectRatio || '1:1';
      if (level === 'full' && config.imageSize) imgConfig.imageSize = config.imageSize;
    }
    return {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType, data: base64Image } }
        ]
      }],
      generationConfig: {
        imageConfig: Object.keys(imgConfig).length > 0 ? imgConfig : undefined
      }
    };
  };

  const performFetch = async (targetModel: string, level: 'full' | 'no-size' = 'full') => {
    const url = `${baseUrl}/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
    console.log(`Attempting generate with model: ${targetModel}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(makePayload(targetModel, level))
    });

    if (!response.ok) {
      const errText = await response.text();
      let errJson;
      try { errJson = JSON.parse(errText); } catch(e) {}
      const errorMessage = errJson?.error?.message || errJson?.message || `HTTP ${response.status} Error`;
      // Throw standard Error object
      throw new Error(errorMessage);
    }
    const data = await response.json();
    return parseResponse(data);
  };

  try {
    return await performFetch(modelName, 'full');
  } catch (error: any) {
    const isModelMissing = error.message && (error.message.includes('not found') || error.message.includes('404') || error.message.includes('503'));

    if (isModelMissing) {
       console.warn(`Model ${modelName} failed. Attempting fallbacks...`);
       const fallbackCandidates = FALLBACK_MODELS.filter(m => m !== modelName);
       for (const fallbackModel of fallbackCandidates) {
         try {
           return await performFetch(fallbackModel, 'no-size');
         } catch (fbError: any) { 
            // If auth error on fallback, stop trying (key is definitely wrong)
            if (fbError.message && (fbError.message.includes('401') || fbError.message.includes('INVALID_ARGUMENT'))) {
              console.warn(`Fallback ${fallbackModel} auth/arg error.`);
            }
         }
       }
       throw new Error(`无法找到可用的画图模型 (已尝试: ${[modelName, ...fallbackCandidates].join(', ')})。请检查 API 设置。`);
    }

    if (isRetryable400(error)) return await performFetch(modelName, 'no-size');
    handleError(error);
    throw error;
  }
}

function isRetryable400(error: any) {
  // Check for status on error object if it exists (for custom error objects) or parse message
  const msg = error.message || '';
  return msg.includes('INVALID_ARGUMENT') || msg.includes('400');
}

function parseResponse(response: any): GenerationResult {
  let image = '';
  let description = '';
  const candidates = response.candidates || response.response?.candidates;
  
  if (candidates && candidates[0]?.content?.parts) {
    for (const part of candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) image = `data:image/png;base64,${part.inlineData.data}`;
      else if (part.text) description += part.text;
    }
  }

  // Fallback markdown parsing
  if (!image && description) {
    const match = description.match(/!\[.*?\]\((.*?)\)/);
    if (match && match[1]) {
      image = match[1];
      description = description.replace(match[0], '').trim();
    }
  }

  if (!image) {
    if (description && description.trim().length > 0) {
       console.warn("Model returned text instead of image:", description);
       throw new Error(`生成被拒绝: ${description.slice(0, 60)}${description.length > 60 ? '...' : ''}`);
    }
    throw new Error("API 返回数据为空，未生成图片。");
  }

  return {
    image,
    description: description.replace(/^#+\s*设计理念.*?\n/, '').replace(/^\*\*设计理念.*?\*\*/, '').trim() || "生成成功"
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
