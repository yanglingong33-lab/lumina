
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

// Simple Translation Map for Inputs (Chinese Enums -> English)
const EN_TERMS: Record<string, string> = {
  // Metals
  '自定义/智能搭配': 'Custom/Smart Match',
  '18K 黄金': '18K Yellow Gold',
  '18K 白金': '18K White Gold',
  '18K 玫瑰金': '18K Rose Gold',
  '24K 足金': '24K Pure Gold',
  '14K 黄金': '14K Gold',
  '9K 黄金': '9K Gold',
  '铂金 PT950': 'Platinum PT950',
  '钯金': 'Palladium',
  '925 纯银': '925 Sterling Silver',
  '钛金属': 'Titanium',
  // Gems
  '钻石': 'Diamond',
  '莫桑钻': 'Moissanite',
  '红宝石': 'Ruby',
  '蓝宝石': 'Sapphire',
  '祖母绿': 'Emerald',
  '紫水晶': 'Amethyst',
  '海蓝宝石': 'Aquamarine',
  '摩根石': 'Morganite',
  '坦桑石': 'Tanzanite',
  '珍珠': 'Pearl',
  '欧泊': 'Opal',
  '翡翠': 'Jade',
  '黄水晶': 'Citrine',
  '橄榄石': 'Peridot',
  '石榴石': 'Garnet',
  '碧玺': 'Tourmaline',
  '无主石': 'No Main Stone',
  // Types
  '戒指': 'Ring',
  '项链': 'Necklace',
  '耳饰': 'Earrings',
  '手镯': 'Bracelet',
  '胸针': 'Brooch'
};

const translateInput = (val: string, lang: 'zh' | 'en') => {
  if (lang === 'zh') return val;
  return EN_TERMS[val] || val;
};

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
  config: DesignConfig,
  lang: 'zh' | 'en' = 'zh'
): Promise<GenerationResult> => {
  const settings = getSettings();
  if (!settings.apiKey) throw new Error("AUTH_ERROR: 未配置 API Key。");

  // Prepare Data
  const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  // Smart Prompt Construction - Always using English for Image Generation prompt to ensure quality
  const metalEn = translateInput(config.metal, 'en');
  const gemEn = translateInput(config.gemstone, 'en');
  const typeEn = translateInput(config.type, 'en');
  
  const isSmartMetal = metalEn.includes('Smart') || metalEn.includes('Custom');
  const metalPrompt = isSmartMetal ? 'luxurious precious metal fitting the style' : metalEn;

  let gemstonePrompt = "";
  if (gemEn === 'No Main Stone') {
    gemstonePrompt = "focusing on pure sculptural metalwork, no main gemstone";
  } else if (gemEn.includes('Smart') || gemEn.includes('Custom')) {
    gemstonePrompt = "featuring high-grade precious gemstones that complement the design";
  } else {
    gemstonePrompt = `featuring high-grade ${gemEn}`;
  }

  // Revised Prompt for Maximum Realism - IMAGE FOCUSED
  const prompt = `
    Role: Senior Haute Joaillerie Designer & Luxury Product Photographer.
    Task: Re-imagine the item in the image as a museum-grade luxury jewelry piece.
    
    PHOTOREALISTIC VISUALIZATION SPECS:
    - Subject: A single ${typeEn} made of polished ${metalPrompt}, ${gemstonePrompt}, and ${config.auxiliaryStone || 'refined detailing'}.
    - Perspective: ${config.viewAngle}.
    - Lighting: Professional studio softbox lighting.
    - Style: ${config.description || 'Modern Elegance'}.
    - Background: Clean, neutral luxury grey or soft champagne gradient.
    
    Constraint: NO text, NO watermarks. The piece must feel physically heavy and correctly seated.
  `;

  const result = await executeGeneration(settings.apiKey, settings.baseUrl, prompt, cleanBase64, mimeType, config, settings.modelName, 'image');
  return {
    image: result.image,
    description: lang === 'en' ? "Drafting concept..." : "正在撰写设计理念..." 
  };
};

/**
 * Generates the design concept text.
 * STEP 2: Text Generation Only
 */
export const generateDesignConcept = async (
  base64Image: string,
  config: DesignConfig,
  lang: 'zh' | 'en' = 'zh'
): Promise<string> => {
  const settings = getSettings();
  if (!settings.apiKey) throw new Error("AUTH_ERROR: 未配置 API Key。");

  const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  const prompt = `
    Role: Senior Jewelry Designer.
    Task: Write a "Design Concept" in ${lang === 'en' ? 'English' : 'Chinese'} based on the provided reference image and the design parameters.
    
    Design Parameters:
    - Type: ${translateInput(config.type, lang)}
    - Material: ${translateInput(config.metal, lang)}
    - Gemstone: ${translateInput(config.gemstone, lang)}
    - Details: ${config.auxiliaryStone || 'Classic setting'}
    - User Inspiration: ${config.description || 'None'}
    
    Requirements:
    1. Title: Create a poetic ${lang === 'en' ? 'short title' : '4-character Chinese title'} for this piece.
    2. Concept: Describe the inspiration, craftsmanship, and the aesthetic narrative (approx. 100-120 words).
    3. Tone: Elegant, luxurious, professional.
    ${lang === 'en' ? 'IMPORTANT: Output MUST be entirely in English.' : ''}
    
    Output Format:
    Return ONLY the text. No markdown formatting like ** or ## around the title.
    Start with the title, then a new line, then the concept body.
  `;

  try {
    const result = await executeGeneration(settings.apiKey, settings.baseUrl, prompt, cleanBase64, mimeType, {}, TEXT_MODEL, 'text');
    return result.description;
  } catch (e) {
    console.warn("Concept generation failed, using default.", e);
    return lang === 'en' ? "Generating concept..." : "设计理念生成中..."; 
  }
};

/**
 * Generates a variation (Edit, Model, Views) based on the GENERATED image.
 */
export const generateJewelryVariation = async (
  generatedImageBase64: string,
  mode: VariationMode,
  refinePrompt?: string,
  lang: 'zh' | 'en' = 'zh'
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
        - Output a short ${lang === 'en' ? 'English' : 'Chinese'} description of what was changed.
      `;
      fallbackDesc = lang === 'en' ? `Refine: ${refinePrompt}` : `修改: ${refinePrompt}`;
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
        - Output description: "3-View Technical Drawing"
      `;
      aspectRatio = "16:9";
      fallbackDesc = lang === 'en' ? "3-Views" : "三视图";
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
        - Output description: "Model Fit"
      `;
      aspectRatio = "3:4";
      fallbackDesc = lang === 'en' ? "On Model" : "模特试戴";
      break;
    case VariationMode.PHOTO:
      prompt = `
        Role: Commercial Product Photographer.
        Task: Create an award-winning advertising shot of the jewelry in the input image.
        Requirements:
        - Props: Place it on a textured surface (marble, silk, or slate) or a floating pedestal.
        - Lighting: Dramatic, high-contrast 'Rembrandt' lighting or ethereal 'Rim' lighting.
        - Atmosphere: Luxury, expensive, sophisticated.
        - Output description: "Editorial Shot"
      `;
      aspectRatio = "4:3";
      fallbackDesc = lang === 'en' ? "Editorial" : "摄影大片";
      break;
  }

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
  config: DesignConfig,
  lang: 'zh' | 'en' = 'zh'
): Promise<ProductionSpecs> => {
  const settings = getSettings();
  if (!settings.apiKey) throw new Error("AUTH_ERROR: 未配置 API Key。");

  const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  const dateStr = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN');

  // --- MATERIAL LOGIC ---
  const metalEn = translateInput(config.metal, 'en').toLowerCase();
  
  const isPlatinum = metalEn.includes('platinum') || metalEn.includes('pt950') || metalEn.includes('palladium');
  const isSilver = metalEn.includes('silver') || metalEn.includes('925') || metalEn.includes('titanium');
  
  // Dynamic Pricing Logic to inject into prompt
  let materialContext = "";
  if (isPlatinum) {
     materialContext = `
     MATERIAL CONTEXT: PLATINUM (Pt950)
     - Base Price: ~380 CNY/g
     - Density: 21.45 g/cm³ (Very Heavy)
     - Calculation: Weight * 380 * 1.2 (Process Fee)
     `;
  } else if (isSilver) {
     materialContext = `
     MATERIAL CONTEXT: SILVER (Ag925) or TITANIUM
     - Base Price: ~8-15 CNY/g
     - Density: ~10.5 g/cm³ (Light)
     - Calculation: Weight * 15 * 2.0 (High markup for silver craftsmanship)
     `;
  } else {
     // Gold (Default)
     materialContext = `
     MATERIAL CONTEXT: GOLD (18K/Au750, 14K, or 24K)
     - Base Price (Au999): ~620 CNY/g
     - Density: ~15.5 g/cm³ (for 18K)
     - Calculation: (Weight * Purity e.g. 0.75) * 620 * 1.15
     `;
  }

  const prompt = `
    Role: Senior Jewelry Factory Manager.
    Task: Generate a professional "Jewelry Production Order" (Factory Sheet) in ${lang === 'en' ? 'English' : 'Simplified Chinese'}.
    
    ${materialContext}
    
    Input Context (Note: Inputs may be in mixed languages, assume user wants output in ${lang === 'en' ? 'English' : 'Chinese'}):
    - Type: ${translateInput(config.type, lang)}
    - Metal: ${translateInput(config.metal, lang)}
    - Gemstone: ${translateInput(config.gemstone, lang)}

    ${lang === 'en' ? 'IMPORTANT: All generated text values (title, densityInfo, setting details, factoryNotes) MUST be in English.' : ''}

    Output JSON Schema (Strict):
    {
      "orderNo": "PO-${Date.now().toString().slice(-6)}",
      "title": "Short Tech Name",
      "date": "${dateStr}",
      "measurements": {
        "size": "Reference Size (e.g. US 6 / HK 13)",
        "dimensions": "L x W x H mm",
        "thickness": "Thickness mm"
      },
      "metal": {
        "type": "Purity (e.g. Au750/18K)",
        "estimatedWeight": "Est. Weight (e.g. 3.5g)",
        "lossRate": "15%",
        "densityInfo": "Basis of calculation"
      },
      "gemstones": {
        "main": { "name": "Main Stone", "cut": "Cut", "size": "Size", "qty": "1", "setting": "Setting" },
        "side": [ { "type": "Side Stone", "size": "Size", "qty": "Qty", "setting": "Setting" } ]
      },
      "craftsmanship": {
        "surfaceProcess": ["Process1", "Process2"],
        "structure": "Structure",
        "plating": "Plating"
      },
      "costEstimate": {
        "goldPriceRef": "Ref Price Used (e.g. 620 CNY/g)",
        "materialCost": "Est. Metal Cost",
        "laborCost": "Est. Labor",
        "stoneCostRef": "Stone Cost",
        "totalEstimate": "Total",
        "currency": "CNY"
      },
      "factoryNotes": ["Note1", "Note2"]
    }
  `;

  try {
    const result = await executeGeneration(
      settings.apiKey, 
      settings.baseUrl, 
      prompt, 
      cleanBase64, 
      mimeType, 
      {}, 
      'gemini-2.0-flash', 
      'text'
    );

    const text = result.description;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as ProductionSpecs;
    } else {
      throw new Error("Failed to parse production specs JSON");
    }
  } catch (e) {
    console.error("Specs generation error", e);
    return {
      orderNo: `ERR-${Date.now()}`,
      title: `${config.metal} ${config.type}`,
      date: dateStr,
      measurements: { size: "?", dimensions: "-", thickness: "-" },
      metal: { type: config.metal, estimatedWeight: "?", lossRate: "15%", densityInfo: "-" },
      gemstones: { 
          main: { name: config.gemstone, cut: "-", size: "-", qty: "1", setting: "-" }, 
          side: [] 
      },
      craftsmanship: { surfaceProcess: ["-"], structure: "-", plating: "-" },
      costEstimate: { goldPriceRef: "-", materialCost: "0", laborCost: "0", stoneCostRef: "0", totalEstimate: "Error", currency: "CNY" },
      factoryNotes: ["AI Calculation Failed"]
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
    if (config.tools) {
        generationConfig.tools = config.tools;
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

    if (config.tools) {
        generationConfig.tools = config.tools;
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
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey 
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

function parseContentParts(response: any, expectedType: 'image' | 'text'): GenerationResult {
  let image = '';
  let description = '';
  const candidates = response.candidates || response.response?.candidates;
  
  if (candidates && candidates[0]?.content?.parts) {
    for (const part of candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) {
        image = `data:image/png;base64,${part.inlineData.data}`;
      } else if (part.text) {
        const text = part.text;
        const imageMarkdownMatch = text.match(/!\[.*?\]\((data:image\/.*?;base64,.*?)\)/);
        if (imageMarkdownMatch && imageMarkdownMatch[1]) {
           image = imageMarkdownMatch[1];
           description += text.replace(imageMarkdownMatch[0], '');
        } else {
           description += text;
        }
      }
    }
  }

  if (expectedType === 'image' && !image) {
    throw new Error("API Returned no image data.");
  }

  return {
    image,
    description: description.replace(/^#+\s*设计理念.*?\n/, '').replace(/^\*\*设计理念.*?\*\*/, '').trim()
  };
}

function handleError(error: any) {
  console.error("Gemini Error:", error);
  let errorMessage = "Generation failed.";
  if (error.message && error.message.includes("Failed to fetch")) errorMessage = "Network error. Check Base URL.";
  else if (error.message && (error.message.includes("401") || error.message.includes("403"))) errorMessage = "AUTH_ERROR: Invalid API Key.";
  else if (error.message) errorMessage = `Error: ${error.message}`;
  throw new Error(errorMessage);
}
