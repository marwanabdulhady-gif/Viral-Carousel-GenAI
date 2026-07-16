import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CarouselResponse, Slide, CharacterTraits, BrandColors } from "../types";

// Helper to get a fresh instance with the latest API key
const getAI = () => {
  // @ts-ignore
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  return new GoogleGenAI({ apiKey });
};

const CAROUSEL_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    carousel_metadata: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "A short, catchy title for the carousel" },
        visual_style: { type: Type.STRING },
        language: { type: Type.STRING, enum: ['en', 'ar'] },
        tone: { type: Type.STRING },
        dialect: { type: Type.STRING },
        character_description: { type: Type.STRING },
      },
      required: ["title", "visual_style", "character_description"],
    },
    slides: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          slide_number: { type: Type.INTEGER },
          headline: { type: Type.STRING },
          sub_headline: { type: Type.STRING },
          visual_description: { type: Type.STRING },
          layout_hint: { type: Type.STRING },
          include_character: { type: Type.BOOLEAN },
        },
        required: ["slide_number", "headline", "sub_headline", "visual_description", "layout_hint", "include_character"],
      },
    },
  },
  required: ["carousel_metadata", "slides"],
};



export interface CharacterAnalysisResult {
    brandColors: BrandColors;
    visualStyle: string;
    characterRefText: string;
}

export const analyzeCharacterReference = async (imageBase64: string): Promise<CharacterAnalysisResult> => {
    const model = "gemini-3.1-pro-preview";
    const prompt = `Analyze this character reference sheet and extract the following information. Return strictly JSON matching this structure:
    {
        "brandColors": {
            "text": "#HEX", // A color suitable for text or dark elements
            "accent": "#HEX" // A prominent accent color from the character
        },
        "visualStyle": "string", // Choose the closest match from this list: "Minimalist Clean", "Tech Startup", "Corporate Blue", "Modern SaaS", "Swiss International", "Editorial", "Hand Drawn Sketch", "Watercolor", "Pop Art", "Collage", "Doodle Style", "Oil Painting", "Pastel Dream", "3D Claymorphism", "Glassmorphism", "3D Isometric", "Paper Cutout", "Fabric Texture", "Plastic Sheen", "Matte 3D", "Cyberpunk Neon", "Dark Mode Gradient", "Holographic", "Vaporwave", "Neon Noir", "Glowwave", "High Contrast Dark", "Vintage 90s", "Retro 80s", "Bauhaus", "Grunge", "Lo-Fi Aesthetic", "Film Grain", "Noir", "Organic Green", "Earthy Tones", "Botanical", "Soft Gradient", "Warm Beige"
        "characterRefText": "string" // A highly detailed description of the character's exact visual details (clothing, colors, hairstyle, facial features, and exact art style) to be used as a prompt for image generation.
    }`;
    
    const match = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid image format");

    try {
        const response = await getAI().models.generateContent({
            model,
            contents: [
                { text: prompt },
                { inlineData: { mimeType: match[1], data: match[2] } }
            ],
            config: { responseMimeType: "application/json" }
        });
        const text = response.text || "{}";
        return JSON.parse(text) as CharacterAnalysisResult;
    } catch (e) {
        console.error("Error analyzing character reference", e);
        throw e;
    }
};

export const generateCarouselScript = async (
  writtenPost: string,
  visualStyle: string,
  slideCount: number,
  language: 'en' | 'ar',
  tone: string,
  dialect: string,
  useCharacter: boolean,
  aspectRatio: '4:5' | '1:1' | '16:9',
  brandColors?: BrandColors,
  characterRefImage?: string,
  characterRefText?: string
): Promise<CarouselResponse> => {
  const model = "gemini-3.1-pro-preview";
  
  const langInstruction = language === 'ar' 
    ? `Language: Arabic (Dialect/Style: ${dialect || 'Modern Standard Arabic'}). IMPORTANT: Ensure headlines are catchy, short, and strictly in Arabic script. Use culturally relevant metaphors.`
    : `Language: English. Tone: ${tone}.`;

  // Build a specific character description based on traits
  let charDescInstructions = "";
  if (useCharacter && (characterRefImage || characterRefText)) {
      let baseDesc = "";
      if (characterRefText) {
          baseDesc += `Additional Character Details: ${characterRefText}. `;
      }
      charDescInstructions = `
      CRITICAL: Create a fixed "Visual DNA" for the character.
      You MUST analyze the provided character reference image carefully. Extract its EXACT visual details (clothing, colors, hairstyle, facial features, and exact art style).
      ${baseDesc}
      In 'character_description', write a highly detailed prompt that defines these IMMUTABLE traits to ensure 100% consistency across multiple images.
      Include:
      1. Precise Hairstyle & Color
      2. Exact Outfit & Colors
      3. Face/Body Features
      4. Exact Art Style keywords matching the reference image.
      `;
  } else if (useCharacter) {
      charDescInstructions = `
      CRITICAL: Create a fixed "Visual DNA" for a generic character.
      In 'character_description', write a highly detailed prompt that defines IMMUTABLE traits to ensure consistency.
      `;
  } else {
      charDescInstructions = `Leave 'character_description' empty. Set 'include_character' to false.`;
  }

  const systemInstruction = `
    Role: You are a Senior Social Media Strategist and Visual Director.
    Objective: Generate a viral ${slideCount}-slide carousel.
    
    ${langInstruction}
    Tone: ${tone}
    Visual Style: ${visualStyle}
    Aspect Ratio: ${aspectRatio}
    
    ${charDescInstructions}

    Structure:
    - Slide 1: Hook (High contrast, big text).
    - Middle: Value/Educational.
    - End: CTA.
    
    Visual Prompting:
    - In 'visual_description', describe the scene layout. Keep it compatible with the character interacting with it.
  `;

  let prompt = `Analyze the following written post and convert it into a highly engaging, viral carousel script with ${slideCount} slides:\n\n"${writtenPost}"`;

  const contents: any[] = [{ text: prompt }];

  if (useCharacter && characterRefImage) {
      // Extract base64 and mime type
      const match = characterRefImage.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (match) {
          contents.push({
              inlineData: {
                  mimeType: match[1],
                  data: match[2]
              }
          });
      }
  }

  try {
    const response = await getAI().models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: CAROUSEL_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text from Gemini");
    
    const data = JSON.parse(text);
    
    // Enrich with Default Design Properties using Brand Colors if provided
    const enrichedSlides = data.slides.map((slide: any) => ({
      ...slide,
      character_custom_prompt: "",
      character_settings: { 
          scale: 'medium', 
          position: 'center',
          opacity: 100,
          rotation: 0,
          expression: 'neutral'
      },
      design: {
        textColor: brandColors?.text || '#ffffff',
        accentColor: brandColors?.accent || '#3b82f6', 
        textBackgroundColor: '#000000', 
        textBackgroundOpacity: 0, 
        containerStyle: 'none', // Default
        overlayOpacity: 10, 
        fontSize: 'medium',
        font: 'sans',
        textAlign: language === 'ar' ? 'right' : 'left', // Initialize based on language
        xPosition: 50, // Center
        yPosition: 10, // Top area
        textWidth: 85, // Default width percentage
        textEffect: 'shadow',
        decoration: 'none',
        slideNumberDesign: {
            show: true,
            style: 'minimal',
            position: language === 'ar' ? 'top-right' : 'top-left'
        }
      }
    }));

    // Ensure metadata has all fields
    data.carousel_metadata.language = language;
    data.carousel_metadata.tone = tone;
    data.carousel_metadata.dialect = dialect;
    data.carousel_metadata.aspect_ratio = aspectRatio;
    data.carousel_metadata.brand_colors = brandColors;
    data.carousel_metadata.personal_branding = { name: '', handle: '', enabled: false };

    return {
        ...data,
        slides: enrichedSlides,
        id: crypto.randomUUID(),
        createdAt: Date.now()
    } as CarouselResponse;

  } catch (error) {
    console.error("Error generating script:", error);
    throw error;
  }
};

export const generateSlideImage = async (
  slide: Slide,
  metadata: any
): Promise<string> => {
  const model = "gemini-3.1-flash-image-preview";
  
  let characterPromptPart = "";
  
  if (slide.include_character) {
      // Prioritize consistency by always including the global character DNA
      const globalCharDNA = metadata.character_description || "";
      const customAction = slide.character_custom_prompt || "Standing confidently";
      
      if (globalCharDNA) {
         const s = slide.character_settings || { scale: 'medium', position: 'center', opacity: 100, rotation: 0, expression: 'neutral' };
         
         const posMap: Record<string, string> = {
             'top-left': 'top left corner', 'top-center': 'top center', 'top-right': 'top right corner',
             'center-left': 'middle left', 'center': 'center', 'center-right': 'middle right',
             'bottom-left': 'bottom left corner', 'bottom-center': 'bottom center', 'bottom-right': 'bottom right corner'
         };
         const posStr = posMap[s.position] || 'center';

         let styleMods = "";
         if (s.opacity < 100) styleMods += `(Appearance: semi-transparent/holographic at ${s.opacity}% opacity). `;
         if (s.rotation !== 0) styleMods += `(Orientation: tilted ${s.rotation} degrees). `;
         const expressionMod = s.expression ? `Expression: ${s.expression}.` : '';

         // Construct a Prompt that emphasizes the DNA
         // STRICT CONSISTENCY PATTERN
         characterPromptPart = `
         *** CHARACTER REFERENCE SHEET (MUST MATCH EXACTLY) ***
         Visual DNA: ${globalCharDNA}.
         
         *** CURRENT SCENE ACTION ***
         Action: ${customAction}. ${expressionMod}
         Camera/Framing: Subject is at ${s.scale} scale, positioned in the ${posStr}. ${styleMods}
         `;
      }
  }

  const ar = metadata.aspect_ratio || '4:5';
  const aspectRatioPrompt = ar === '1:1' ? 'Square Aspect Ratio 1:1' : ar === '16:9' ? 'Wide Aspect Ratio 16:9' : 'Vertical Aspect Ratio 4:5';

  const imagePrompt = `
    Task: Generate a high-quality social media background image (${aspectRatioPrompt}).
    
    Visual Style: ${metadata.visual_style}.
    Environment/Background: ${slide.visual_description}.
    
    ${characterPromptPart}
    
    Constraint: NO TEXT in the image. Pure visual art.
  `;

  // Determine Aspect Ratio for API
  let apiAspectRatio = "4:5"; 
  if (ar === '1:1') apiAspectRatio = "1:1";
  if (ar === '16:9') apiAspectRatio = "16:9";

  const contents: any[] = [{ text: imagePrompt }];

  // DO NOT pass the character reference image to the image generation model.
  // Passing an image turns the request into an "image editing" task, which will just
  // return an edited version of the reference sheet instead of generating a new scene.
  // We rely entirely on the highly detailed "Visual DNA" text prompt for consistency.

  try {
    const response = await getAI().models.generateContent({
      model,
      contents: { parts: contents },
      config: {
          imageConfig: {
              aspectRatio: apiAspectRatio as any
          }
      }
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
           return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    throw new Error("No image data found");
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};