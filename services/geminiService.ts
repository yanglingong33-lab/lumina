import { GoogleGenAI } from "@google/genai";
import { DesignConfig, GenerationResult } from "../types";

// With the updated Vite config, process.env.API_KEY is replaced by the string literal.
// We access it directly.
const getApiKey = () => {
  // @ts-ignore - Process might be technically undefined in types, but replaced by Vite build
  return process.env.API_KEY || '';
};

// Initialize the client helper
const initAI = (key: string) => {
  return new GoogleGenAI({ apiKey: key });
};

/**
 * Generates a jewelry design based on an input image and configuration.
 */
export const generateJewelryDesign = async (
  base64Image: string,
  config: DesignConfig
): Promise<GenerationResult> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    throw new Error("API Key 未配置。请在 Vercel 环境变量中设置 'API_KEY', 'OPEN_API_KEY' 或 'BOYI'。");
  }

  // Initialize AI with the current key
  const ai = initAI(apiKey);

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

    VISUAL STYLE:
    - 8K Resolution, Hyper-realistic, Macro Jewelry Photography.
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
      model: 'gemini-3-pro-image-preview',
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
          imageSize: config.imageSize || '2K',
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
      throw new Error("生成失败，API 未返回图片数据。请重试。");
    }

    return {
      image,
      description: description.trim()
    };

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    if (error.message?.includes('API key') || error.status === 403) {
      throw new Error("API Key 无效或未配置。请检查环境变量设置 (API_KEY, OPEN_API_KEY 或 BOYI)。");
    }
    throw error;
  }
};