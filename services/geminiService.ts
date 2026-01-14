
import { GoogleGenAI } from "@google/genai";
import { DesignConfig, GenerationResult, AppSettings } from "../types";

/**
 * Generates a jewelry design based on an input image and configuration.
 */
export const generateJewelryDesign = async (
  base64Image: string,
  config: DesignConfig
): Promise<GenerationResult> => {
  // 1. Try to get settings from Local Storage (User configured)
  let apiKey = process.env.API_KEY;
  let baseUrl: string | undefined = undefined;
  let modelName = 'gemini-3-pro-image-preview'; // Default

  try {
    const savedSettings = localStorage.getItem('lumina_settings');
    if (savedSettings) {
      const parsed: AppSettings = JSON.parse(savedSettings);
      if (parsed.apiKey && parsed.apiKey.trim()) {
        apiKey = parsed.apiKey.trim();
      }
      if (parsed.baseUrl && parsed.baseUrl.trim()) {
        let rawUrl = parsed.baseUrl.trim();
        rawUrl = rawUrl.replace(/\/+$/, '');
        
        if (rawUrl.includes('/images/generations')) {
           rawUrl = rawUrl.split('/v1/images')[0];
        } else if (rawUrl.includes('/chat/completions')) {
           rawUrl = rawUrl.split('/v1/chat')[0];
        } else if (rawUrl.includes('/models')) {
           rawUrl = rawUrl.split('/v1beta/models')[0];
        }
        
        baseUrl = rawUrl;
      }
      if (parsed.modelName && parsed.modelName.trim()) {
        modelName = parsed.modelName.trim();
      }
    }
  } catch (e) {
    console.warn("Failed to read settings", e);
  }

  if (!apiKey) {
    throw new Error("未配置 API Key。请在设置中输入您的密钥。");
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
  
  if (baseUrl) {
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
  
  // Base config
  const imageConfig: any = {
    aspectRatio: config.aspectRatio || '1:1',
  };

  // Optimistically add imageSize for Gemini 3, but be ready to retry without it
  if (modelName.includes('gemini-3')) {
    imageConfig.imageSize = config.imageSize;
  }

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
    return await doGenerate(imageConfig);
  } catch (error: any) {
    // Retry logic: If failed with 400 and we sent imageSize, try again without it
    if (error.status === 400 && imageConfig.imageSize) {
      console.warn("SDK Generation failed with imageSize, retrying without it...");
      delete imageConfig.imageSize;
      try {
        return await doGenerate(imageConfig);
      } catch (retryError: any) {
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

  const imageConfig: any = {
    aspectRatio: config.aspectRatio || '1:1'
  };

  if (modelName.includes('gemini-3')) {
    imageConfig.imageSize = config.imageSize;
  }

  const makePayload = (imgConfig: any) => ({
    contents: [{
      parts: [
        { text: prompt },
        { inlineData: { mimeType: mimeType, data: base64Image } }
      ]
    }],
    generationConfig: {
      imageConfig: imgConfig
    }
  });

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
      
      const errorMessage = errJson?.error?.message || errText || `HTTP ${response.status}`;
      throw { 
        status: response.status, 
        message: errorMessage 
      };
    }

    const data = await response.json();
    return parseResponse(data);
  };

  try {
    return await performFetch(makePayload(imageConfig));
  } catch (error: any) {
    // Retry logic: If failed with 400 and we sent imageSize, try again without it
    if (error.status === 400 && imageConfig.imageSize) {
      console.warn("Proxy Generation failed with imageSize, retrying without it...");
      delete imageConfig.imageSize;
      try {
        return await performFetch(makePayload(imageConfig));
      } catch (retryError: any) {
        handleError(retryError);
        throw retryError;
      }
    }
    
    handleError(error);
    throw error;
  }
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
  console.error("Gemini Generation Error:", error);
    
  let errorMessage = "生成设计时出现问题。";
  
  if (error.status === 400 && (error.message?.includes("API key not valid") || error.message?.includes("INVALID_ARGUMENT"))) {
     // If we are here, retry failed or wasn't applicable.
     errorMessage = "API 密钥或参数无效 (400)。可能是 Base URL 配置错误，或者该模型完全不支持图片生成参数。";
  } else if (error.status === 404) {
    errorMessage = `模型不存在 (404)。请在设置中修改 Model Name，当前模型可能不被支持。`;
  } else if (error.message) {
    errorMessage = `错误: ${error.message}`;
  }

  throw new Error(errorMessage);
}
