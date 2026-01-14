import { GoogleGenAI } from "@google/genai";
import { DesignConfig, GenerationResult } from "../types";

const GEMINI_API_KEY = process.env.API_KEY || '';

// Initialize the client
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Generates a jewelry design based on an input image and configuration.
 */
export const generateJewelryDesign = async (
  base64Image: string,
  config: DesignConfig
): Promise<GenerationResult> => {
  if (!GEMINI_API_KEY) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }

  // Clean the base64 string if it contains the header
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

  const prompt = `
    Act as a world-class high jewelry designer from a top luxury house (e.g., Cartier, Bulgari, Van Cleef & Arpels). 
    Your task is to creatively transform the shape, pattern, or essence of the provided input object into a magnificent piece of high jewelry.

    The user configuration is provided in Chinese, translate contextually to jewelry terms:
    DESIGN SPECIFICATIONS:
    - **Jewelry Type**: ${config.type}
    - **Primary Metal**: ${config.metal} (Ensure realistic metal texture, reflection, and weight).
    - **Main Gemstone**: ${config.gemstone} (Focus on cut, clarity, and light refraction).
    - **Auxiliary Stones**: ${config.auxiliaryStone || 'Minimalist/None'}
    - **User's Vision**: ${config.description}
    - **View Perspective**: ${config.viewAngle}

    VISUAL REQUIREMENTS:
    - **Style**: Ultra-Photorealistic, 8k resolution, Macro Photography, Cinematic Lighting.
    - **Quality**: Masterpiece, highly detailed textures, ray-tracing, precise light caustics.
    - **Lighting**: Studio lighting, soft shadows, sharp metallic reflections.
    - **Background**: A clean, elegant, neutral gradient (very light grey or soft cream) to make the jewelry pop. Do not use complex backgrounds.
    - **Transformation**: The design must be functional and wearable, yet clearly retain the "soul" or morphological characteristics of the input image.

    OUTPUT REQUIREMENTS:
    1. **Image**: Generate the visual design as specified.
    2. **Text**: Provide a brief, elegant design concept description in Chinese (approx. 80-100 words). Describe the inspiration, how the input object was transformed, the interplay of materials, and the unique artistic qualities. Use poetic, luxury marketing language suitable for a high-end catalog.

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
              mimeType: 'image/jpeg', 
              data: cleanBase64,
            },
          },
        ],
      },
      config: {
        imageConfig: {
          imageSize: config.imageSize || '2K',
          aspectRatio: '1:1',
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
      throw new Error("生成失败，未返回图片数据。");
    }

    return {
      image,
      description: description.trim()
    };

  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};