
import { GoogleGenAI } from "@google/genai";
import { DesignConfig, GenerationResult, AppSettings } from "../types";

// User provided default (stripped of suffix)
const DEFAULT_BASE_URL = "https://api.apimart.ai";

/**
 * Generates a jewelry design based on an input image and configuration.
 */
export const generateJewelryDesign = async (
  base64Image: string,
  config: DesignConfig
): Promise<GenerationResult> => {
  // 1. Try to get settings from Local Storage (User configured)
  let apiKey = process.env.API_KEY;
  let baseUrl: string = DEFAULT_BASE_URL;
  let modelName = 'gemini-3-pro-image-preview'; // Default

  try {
    const savedSettings = localStorage.getItem('lumina_settings');
    if (savedSettings) {
      const parsed: AppSettings = JSON.parse(savedSettings);
      if (parsed.apiKey && parsed.apiKey.trim()) {
        apiKey = parsed.apiKey.trim();
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
  // Applies to both user input and default to ensure correctness
  if (baseUrl) {
    let rawUrl = baseUrl;
    // Remove trailing slashes
    rawUrl = rawUrl.replace(/\/+$/, '');
    
    // Intelligent cleaning of the Base URL
    if (rawUrl.endsWith('/v1')) {
      rawUrl = rawUrl.substring(0, rawUrl.length - 3);
    } else if (rawUrl.endsWith('/v1beta/models')) {
       rawUrl = rawUrl.split('/v1beta/models')[0];
    } else if (rawUrl.endsWith('/v1beta')) {
       rawUrl = rawUrl.substring(0, rawUrl.length - 7);
    } else if (rawUrl.includes('/images/generations')) {
       rawUrl = rawUrl.split('/v1/images')[0];
    } else if (rawUrl.includes('/chat/completions')) {
       rawUrl = rawUrl.split('/v1/chat')[0];
    }
    baseUrl = rawUrl;
  }

  if (!apiKey) {
    throw new Error("未配置 API Key。请在设置中输入您的密钥。");
  }

  // --- CRITICAL CHECK FOR PROXY KEYS ---
  const isSkKey = apiKey.startsWith('sk-');
  if (isSkKey && !baseUrl) {
    throw new Error("检测到以 'sk-' 开头的第三方密钥。请点击右上角设置图标，在 'Base URL' 中填写中转服务地址。");
  }

  // Extract mime type and clean base64 data
  const mimeMatch = base64Image.match(/^data:(image\/[a-zA-Z+]+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  const prompt = `
    Role: World-class High Jewelry Designer (e.g., Cartier, Van Cleef & Arpels).
    Task: Creatively transform the FORM and ESSENCE of the input image into a luxury jewelry design.

    DESIGN PARAMETERS:
    - Type: ${config.type}
    - Material: ${config.metal} (Realistic texture/reflection)
    - Main Stone: ${config.gemstone} (High refraction/clarity)
    - Details: ${config.auxiliaryStone || 'Elegant minimalist style'}
    - View: ${config.viewAngle}
    - User Concept: ${config.description}
    - Preferred Resolution: ${config.imageSize}

    VISUAL STYLE:
    - ${config.imageSize} Resolution, Hyper-realistic, Macro Jewelry Photography.
    - Lighting: Studio caustic lighting, emphasizing sparkle and metal sheen.
    - Background: Soft neutral gradient (white/cream/pale grey). Elegant and clean.
    
    OUTPUT REQUIREMENTS:
    1. IMAGE: The visual design.
    2. TEXT: A sophisticated design concept description in CHINESE (中文). 
       - Approx 80 words. 
       - Use luxury marketing language (poetic, elegant).
       - Explain the inspiration and how the input object's shape was interpreted.

    Return the image in the image part and the description in the text part.
  `;

  // --- STRATEGY SELECTION ---
  
  if (baseUrl || isSkKey) {
    // Force proxy mode if baseUrl exists OR if it's an sk- key
    return await generateViaProxy(baseUrl, apiKey, prompt, cleanBase64, mimeType, config, modelName);
  } else {
    return await generateViaSDK(apiKey, prompt, cleanBase64, mimeType, config, modelName);
  }
};

/**
 * Implementation using Official SDK (for direct Google usage)
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
  
  const makeConfig = (level: 'full' | 'no-size' | 'minimal') => {
    const imgConfig: any = {};
    if (level !== 'minimal') {
      imgConfig.aspectRatio = config.aspectRatio || '1:1';
    }
    if (level === 'full' && modelName.includes('gemini-3')) {
      imgConfig.imageSize = config.imageSize;
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
    console.warn("SDK Full Config Failed:", error.message);
    if (isRetryable400(error)) {
      try {
        console.warn("Retrying without imageSize...");
        return await doGenerate(makeConfig('no-size'));
      } catch (retryError: any) {
        if (isRetryable400(retryError)) {
           try {
              console.warn("Retrying with minimal config...");
              return await doGenerate(makeConfig('minimal'));
           } catch (finalError) {
              handleError(finalError);
              throw finalError;
           }
        }
        handleError(retryError);
        throw retryError;
      }
    }
    handleError(error);
    throw error; 
  }
}

/**
 * Implementation using direct fetch (for Proxy/OneAPI usage)
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
  
  const url = `${baseUrl}/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

  const makePayload = (level: 'full' | 'no-size' | 'minimal') => {
    const imgConfig: any = {};
    
    if (level !== 'minimal') {
      imgConfig.aspectRatio = config.aspectRatio || '1:1';
    }
    
    if (level === 'full' && modelName.includes('gemini-3')) {
      imgConfig.imageSize = config.imageSize;
    }

    return {
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType, data: base64Image } }
        ]
      }],
      generationConfig: {
        imageConfig: imgConfig
      }
    };
  };

  const performFetch = async (payload: any) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      let errJson;
      try { errJson = JSON.parse(errText); } catch(e) {}
      
      // Robust error extraction for various proxy response formats
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

  try {
    return await performFetch(makePayload('full'));
  } catch (error: any) {
    console.warn("Proxy Full Config Failed:", error.message);
    
    // Check for 404. If the default 3-pro fails, many proxies support 2.0-flash-exp or 2.5-flash-image
    if (error.status === 404 && modelName.includes('gemini-3')) {
       console.warn("Gemini 3 Pro not found on proxy, attempting fallback to gemini-2.0-flash-exp...");
       const fallbackModel = 'gemini-2.0-flash-exp';
       const fallbackUrl = `${baseUrl}/v1beta/models/${fallbackModel}:generateContent?key=${apiKey}`;
       
       // Fallback fetch function
       const performFallback = async () => {
         const payload = makePayload('no-size'); // safer config for older models
         const response = await fetch(fallbackUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
              'x-goog-api-key': apiKey
            },
            body: JSON.stringify(payload)
         });
         if (!response.ok) {
            const errText = await response.text();
            throw { status: response.status, message: errText };
         }
         const data = await response.json();
         return parseResponse(data);
       };

       try {
         return await performFallback();
       } catch (fallbackError) {
         // If fallback also fails, throw original 404 error but with hint
         throw new Error(`404 错误: 您的代理服务商似乎不支持 gemini-3-pro 或 gemini-2.0-flash-exp。请联系服务商确认支持的画图模型。`);
       }
    }

    if (error.status === 404) {
      throw new Error(`404 错误: 找不到模型或接口地址错误。当前请求地址: ${url}。请检查 Base URL。`);
    }

    if (isRetryable400(error)) {
      try {
        console.warn("Retrying without imageSize...");
        return await performFetch(makePayload('no-size'));
      } catch (retryError: any) {
        if (isRetryable400(retryError)) {
          try {
             console.warn("Retrying with minimal config...");
             return await performFetch(makePayload('minimal'));
          } catch (finalError) {
             handleError(finalError);
             throw finalError;
          }
        }
        handleError(retryError);
        throw retryError;
      }
    }
    
    handleError(error);
    throw error;
  }
}

function isRetryable400(error: any) {
  return error.status === 400 || (error.message && (error.message.includes('INVALID_ARGUMENT') || error.message.includes('400')));
}

/**
 * Common response parser
 */
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

  // Fallback: If no inlineData, check if image is embedded in text (Markdown/URL)
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
      throw new Error("生成成功但仅返回了文本。这通常表示模型没有按照要求返回图片，或者代理不支持该功能。请在设置中尝试更换 'Model Name' (例如使用 gemini-2.0-flash-exp)。");
    }
    throw new Error("生成失败，API 未返回图片数据。");
  }

  return {
    image,
    description: description.trim()
  };
}

/**
 * Common error handler
 */
function handleError(error: any) {
  // Enhanced logging for object debugging
  if (typeof error === 'object' && error !== null) {
      console.error("Gemini Generation Error Details:", JSON.stringify(error, null, 2));
  } else {
      console.error("Gemini Generation Error:", error);
  }
    
  let errorMessage = "生成设计时出现问题。";
  const msgLower = (error.message || '').toLowerCase();
  
  // Check for fetch failures (often Network errors or CORS)
  if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
    errorMessage = "网络请求失败。如果您在中国大陆，请检查 VPN 连接或配置正确的 Base URL 代理地址。";
  } 
  // Auth / Invalid Key Handling
  else if (
    error.status === 401 || 
    error.status === 403 || 
    msgLower.includes("api key not valid") || 
    msgLower.includes("invalid_argument") ||
    msgLower.includes("invalid token") ||
    msgLower.includes("无效的令牌") ||
    msgLower.includes("unauthenticated")
  ) {
     errorMessage = "AUTH_ERROR: API Key 无效或过期。请检查您的密钥额度或有效性。";
  } 
  else if (error.status === 404) {
    errorMessage = `模型不存在或路径错误 (404)。请在设置中修改 Model Name，或检查 Base URL。`;
  } 
  else if (error.message) {
    errorMessage = `错误: ${error.message}`;
  }

  throw new Error(errorMessage);
}
