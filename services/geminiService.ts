
import { GoogleGenAI } from "@google/genai";
import { DesignConfig, GenerationResult, AppSettings } from "../types";

// User provided default
const DEFAULT_BASE_URL = "https://api.apimart.ai";
// Revert to the official stable preview as primary
const DEFAULT_MODEL = "gemini-3-pro-image-preview"; 

// Models to try if the primary one fails (in order)
const FALLBACK_MODELS = [
  'gemini-2.0-flash-exp',
  'gemini-exp-1206',
  'gemini-2.0-flash-thinking-exp-01-21'
];

/**
 * Generates a jewelry design based on an input image and configuration.
 */
export const generateJewelryDesign = async (
  base64Image: string,
  config: DesignConfig
): Promise<GenerationResult> => {
  // 1. Determine effective settings
  const systemKey = process.env.API_KEY; 
  
  let apiKey = systemKey;
  let baseUrl: string = DEFAULT_BASE_URL;
  let modelName = DEFAULT_MODEL;
  let usingCustomKey = false;

  // Try to load from local storage
  try {
    const savedSettings = localStorage.getItem('lumina_settings');
    if (savedSettings) {
      const parsed: AppSettings = JSON.parse(savedSettings);
      
      if (parsed.apiKey && parsed.apiKey.trim()) {
        apiKey = parsed.apiKey.trim();
        usingCustomKey = apiKey !== systemKey;
      }
      
      if (parsed.baseUrl && parsed.baseUrl.trim()) {
        baseUrl = parsed.baseUrl.trim();
      }
      
      if (parsed.modelName && parsed.modelName.trim()) {
        modelName = parsed.modelName.trim();
      }
    }
  } catch (e) {
    console.warn("Failed to read settings", e);
  }

  // --- CLEAN BASE URL LOGIC ---
  if (baseUrl) {
    let rawUrl = baseUrl;
    rawUrl = rawUrl.replace(/\/+$/, '');
    
    // Intelligent cleaning
    if (rawUrl.endsWith('/v1')) rawUrl = rawUrl.substring(0, rawUrl.length - 3);
    else if (rawUrl.endsWith('/v1beta/models')) rawUrl = rawUrl.split('/v1beta/models')[0];
    else if (rawUrl.endsWith('/v1beta')) rawUrl = rawUrl.substring(0, rawUrl.length - 7);
    else if (rawUrl.includes('/images/generations')) rawUrl = rawUrl.split('/v1/images')[0];
    else if (rawUrl.includes('/chat/completions')) rawUrl = rawUrl.split('/v1/chat')[0];
    
    baseUrl = rawUrl;
  }

  if (!apiKey) {
    throw new Error("未配置 API Key。请在设置中输入您的密钥。");
  }

  const isSkKey = apiKey.startsWith('sk-');
  if (isSkKey && !baseUrl) {
    throw new Error("检测到以 'sk-' 开头的第三方密钥。请配置 Base URL。");
  }

  // Prepare Data
  const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  const prompt = `
    Role: World-class High Jewelry Designer.
    Task: Transform the input image into a luxury jewelry design.
    
    PARAMS:
    - Type: ${config.type}
    - Material: ${config.metal}
    - Main Stone: ${config.gemstone}
    - Details: ${config.auxiliaryStone || 'Minimalist'}
    - View: ${config.viewAngle}
    - Concept: ${config.description}

    REQUIREMENTS:
    - Photorealistic, 8k resolution, studio lighting.
    - OUTPUT: Image of the jewelry design.
    - OUTPUT TEXT: Concept description in Chinese (中文).
  `;

  // --- EXECUTION WITH FALLBACK ---

  const execute = async (currentKey: string, currentModel: string) => {
    if (baseUrl || currentKey.startsWith('sk-')) {
      return await generateViaProxy(baseUrl, currentKey, prompt, cleanBase64, mimeType, config, currentModel);
    } else {
      return await generateViaSDK(currentKey, prompt, cleanBase64, mimeType, config, currentModel);
    }
  };

  try {
    return await execute(apiKey, modelName);
  } catch (error: any) {
    // 1. Auth Error Fallback (Custom Key -> System Key)
    if ((error.message?.includes('AUTH_ERROR') || error.status === 401) && usingCustomKey && systemKey) {
       console.warn("Custom key failed with 401. Retrying with system default key...");
       try {
         return await execute(systemKey, modelName);
       } catch (retryError) {
         throw retryError; 
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
  config: DesignConfig,
  modelName: string
): Promise<GenerationResult> {
  const ai = new GoogleGenAI({ apiKey });
  
  const makeConfig = (level: 'full' | 'no-size') => {
    const imgConfig: any = {};
    if (modelName.includes('gemini-3')) {
       imgConfig.aspectRatio = config.aspectRatio || '1:1';
       if (level === 'full') imgConfig.imageSize = config.imageSize;
    }
    return imgConfig;
  };

  const doGenerate = async (currentImageConfig: any) => {
    const response = await ai.models.generateContent({
      model: modelName, 
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
    return await doGenerate(makeConfig('full'));
  } catch (error: any) {
    if (isRetryable400(error)) {
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
  config: DesignConfig,
  modelName: string
): Promise<GenerationResult> {
  
  const makePayload = (model: string, level: 'full' | 'no-size') => {
    const imgConfig: any = {};
    if (model.includes('gemini-3')) {
      imgConfig.aspectRatio = config.aspectRatio || '1:1';
      if (level === 'full') imgConfig.imageSize = config.imageSize;
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
      
      const errorMessage = 
        errJson?.error?.message || 
        errJson?.message || 
        errJson?.msg || 
        (typeof errJson === 'string' ? errJson : errText) || 
        `HTTP ${response.status}`;

      throw { 
        status: response.status, 
        message: errorMessage 
      };
    }

    const data = await response.json();
    return parseResponse(data);
  };

  // 1. Try Primary Model
  try {
    return await performFetch(modelName, 'full');
  } catch (error: any) {
    
    // Check for Model Not Found / No Channel / 503 / 404
    // "无可用渠道" often comes with 503 or 404
    const isModelMissing = 
        error.status === 404 || 
        error.status === 503 ||
        (error.message && (
            error.message.includes('not found') || 
            error.message.includes('无可用渠道') ||
            error.message.includes('distributor') ||
            error.message.includes('upstream')
        ));

    if (isModelMissing) {
       console.warn(`Primary model ${modelName} failed. Attempting fallbacks...`);
       
       // Filter out the primary model if it's in the fallback list to avoid duplicate retry
       const fallbackCandidates = FALLBACK_MODELS.filter(m => m !== modelName);

       for (const fallbackModel of fallbackCandidates) {
         try {
           console.log(`Trying fallback: ${fallbackModel}`);
           // Use 'no-size' for fallbacks to be safer
           return await performFetch(fallbackModel, 'no-size');
         } catch (fbError: any) {
           console.warn(`Fallback ${fallbackModel} failed:`, fbError.message);
           // Continue to next fallback
           if (fbError.status === 401) throw fbError; // Don't retry auth errors
         }
       }
       
       throw new Error(`无法找到可用的画图模型。尝试了: ${modelName}, ${fallbackCandidates.join(', ')}。请联系服务商或检查 API 配置。`);
    }

    // Standard Retry for 400 errors (Config issues) on the primary model
    if (isRetryable400(error)) {
        return await performFetch(modelName, 'no-size');
    }
    
    handleError(error);
    throw error;
  }
}

function isRetryable400(error: any) {
  return error.status === 400 || (error.message && (error.message.includes('INVALID_ARGUMENT') || error.message.includes('400')));
}

function parseResponse(response: any): GenerationResult {
  let image = '';
  let description = '';

  const candidates = response.candidates || response.response?.candidates;
  
  if (candidates && candidates[0]?.content?.parts) {
    for (const part of candidates[0].content.parts) {
      if (part.inlineData && part.inlineData.data) {
        image = `data:image/png;base64,${part.inlineData.data}`;
      } else if (part.text) {
        description += part.text;
      }
    }
  }

  // Fallback markdown parsing
  if (!image && description) {
    const markdownImageRegex = /!\[.*?\]\((.*?)\)/;
    const match = description.match(markdownImageRegex);
    if (match && match[1]) {
      image = match[1];
      description = description.replace(match[0], '').trim();
    }
  }

  if (!image) {
    if (description) {
      throw new Error("模型仅返回了文本。可能是所选模型不支持直接生成图片。");
    }
    throw new Error("生成失败，API 返回数据为空。");
  }

  return {
    image,
    description: description.trim()
  };
}

function handleError(error: any) {
  if (typeof error === 'object' && error !== null) {
      console.error("Gemini Generation Error Details:", JSON.stringify(error, null, 2));
  } else {
      console.error("Gemini Generation Error:", error);
  }
    
  let errorMessage = "生成设计时出现问题。";
  const msgLower = (error.message || '').toLowerCase();
  
  if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
    errorMessage = "网络请求失败。请检查 Base URL 是否正确。";
  } 
  else if (
    error.status === 401 || 
    error.status === 403 || 
    msgLower.includes("api key not valid") || 
    msgLower.includes("invalid token") ||
    msgLower.includes("无效的令牌") ||
    msgLower.includes("unauthenticated")
  ) {
     errorMessage = "AUTH_ERROR: API Key 无效或过期 (401)。请检查您的密钥额度。";
  } 
  else if (error.status === 404 || msgLower.includes("not found")) {
    errorMessage = `找不到模型 (404)。请在设置中尝试更换其他模型名称。`;
  } 
  else if (error.message) {
    errorMessage = `错误: ${error.message}`;
  }

  throw new Error(errorMessage);
}
