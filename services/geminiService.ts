
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

  try {
    const savedSettings = localStorage.getItem('lumina_settings');
    if (savedSettings) {
      const parsed: AppSettings = JSON.parse(savedSettings);
      if (parsed.apiKey && parsed.apiKey.trim()) {
        apiKey = parsed.apiKey.trim();
      }
      if (parsed.baseUrl && parsed.baseUrl.trim()) {
        // Clean the Base URL. If user pasted a full path like .../v1/images/generations, 
        // we try to extract the base domain which is usually what the SDK expects.
        // However, some proxies need the /v1beta/openai suffix. 
        // For Google SDK, it usually expects the root.
        let rawUrl = parsed.baseUrl.trim();
        // Remove trailing slashes
        rawUrl = rawUrl.replace(/\/+$/, '');
        
        // Simple heuristic: if it contains /images/generations (OpenAI endpoint), strip it
        if (rawUrl.includes('/images/generations')) {
           rawUrl = rawUrl.split('/v1/images')[0];
        }
        
        baseUrl = rawUrl;
      }
    }
  } catch (e) {
    console.warn("Failed to read settings", e);
  }

  if (!apiKey) {
    throw new Error("未配置 API Key。请在设置中输入您的密钥。");
  }

  // Initialize AI with the configured key and base URL
  const ai = new GoogleGenAI({ 
    apiKey: apiKey,
    baseUrl: baseUrl // If undefined, SDK uses default Google URL
  });

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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: {
        parts: [
          {
            text: prompt,
          },
          {
            inlineData: {
              mimeType: mimeType, 
              data: cleanBase64,
            },
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: config.aspectRatio || '1:1',
        },
      },
    });

    let image = '';
    let description = '';

    // Iterate through parts to find the image and text
    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          image = `data:image/png;base64,${part.inlineData.data}`;
        } else if (part.text) {
          description += part.text;
        }
      }
    }

    if (!image) {
      throw new Error("生成失败，API 未返回图片数据。");
    }

    return {
      image,
      description: description.trim()
    };

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    
    // Enhance error message for the user
    let errorMessage = "生成设计时出现问题。";
    
    // Handle API Key / Proxy errors specifically
    if (error.status === 400 && error.message?.includes("API key not valid")) {
       errorMessage = "API 密钥无效 (400)。如果您使用代理/中转服务，请务必在设置中配置正确的 'Base URL'。";
    } else if (error.status === 403 || (error.message && error.message.includes("403"))) {
      errorMessage = "API 权限被拒绝 (403)。请检查您的密钥权限或余额。";
    } else if (error.status === 429) {
      errorMessage = "请求过于频繁，请稍后重试。";
    } else if (error.status === 404) {
      errorMessage = "无法连接到模型 (404)。请检查代理 Base URL 是否正确 (例如: https://api.proxy.com)。";
    } else if (error.message) {
      errorMessage = `错误: ${error.message}`;
    }

    throw new Error(errorMessage);
  }
};
