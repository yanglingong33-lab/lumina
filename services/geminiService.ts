import { GoogleGenAI } from "@google/genai";
import { DesignConfig, GenerationResult } from "../types";

/**
 * Generates a jewelry design based on an input image and configuration.
 */
export const generateJewelryDesign = async (
  base64Image: string,
  config: DesignConfig
): Promise<GenerationResult> => {
  // Initialize AI with the current key from process.env
  // According to guidelines, we must use process.env.API_KEY directly.
  // We create a new instance for each call to ensure we use the latest key (e.g. if selected via UI).
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    // Switching to 'gemini-2.5-flash-image' as it is more widely available and stable for image generation 
    // without requiring specific trusted tester permissions that might cause 403 errors on 'gemini-3-pro-image-preview'.
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
          // 'imageSize' is not supported by gemini-2.5-flash-image, handled via prompt instead.
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
      throw new Error("生成失败，API 未返回图片数据。请尝试更换图片或稍后重试。");
    }

    return {
      image,
      description: description.trim()
    };

  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    
    // Enhance error message for the user
    let errorMessage = "生成设计时出现问题。";
    if (error.status === 403 || (error.message && error.message.includes("403"))) {
      errorMessage = "API 权限被拒绝 (403)。请检查您的 API 密钥是否正确，或该密钥是否支持图像生成模型。";
    } else if (error.status === 429) {
      errorMessage = "请求过于频繁，请稍后重试。";
    } else if (error.message) {
      errorMessage = `错误: ${error.message}`;
    }

    throw new Error(errorMessage);
  }
};