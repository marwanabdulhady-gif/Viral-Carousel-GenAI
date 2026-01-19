import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CarouselResponse, Slide, CharacterTraits, BrandColors } from "../types";

// Initialize Gemini Client
// @ts-ignore - Env variable is injected by the sandbox environment
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const CAROUSEL_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    carousel_metadata: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING },
        visual_style: { type: Type.STRING },
        target_audience: { type: Type.STRING },
        language: { type: Type.STRING, enum: ['en', 'ar'] },
        tone: { type: Type.STRING },
        dialect: { type: Type.STRING },
        character_description: { type: Type.STRING },
      },
      required: ["topic", "visual_style", "target_audience", "character_description"],
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

export const generateIdeas = async (
    theme: string, 
    language: 'en' | 'ar'
): Promise<{ topic: string, audience: string }> => {
    const model = "gemini-3-flash-preview";
    const langPrompt = language === 'ar' ? 'in Arabic' : 'in English';
    const prompt = `Generate a viral, trending social media topic and a specific target audience based on the theme: "${theme}". Return strictly JSON: { "topic": "...", "audience": "..." } ${langPrompt}.`;
    
    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        const text = response.text || "{}";
        return JSON.parse(text);
    } catch (e) {
        console.error("Error generating ideas", e);
        return { topic: "Growth Hacking Strategies", audience: "Startup Founders" };
    }
};

export const generateCarouselScript = async (
  topic: string,
  visualStyle: string,
  target_audience: string,
  slideCount: number,
  language: 'en' | 'ar',
  tone: string,
  dialect: string,
  useCharacter: boolean,
  aspectRatio: '4:5' | '1:1' | '16:9',
  characterTraits?: CharacterTraits,
  brandColors?: BrandColors
): Promise<CarouselResponse> => {
  const model = "gemini-3-flash-preview";
  
  const langInstruction = language === 'ar' 
    ? `Language: Arabic (Dialect/Style: ${dialect || 'Modern Standard Arabic'}). IMPORTANT: Ensure headlines are catchy, short, and strictly in Arabic script. Use culturally relevant metaphors.`
    : `Language: English. Tone: ${tone}.`;

  // Build a specific character description based on traits
  let charDescInstructions = "";
  if (useCharacter && characterTraits) {
      const baseDesc = `A ${characterTraits.age} ${characterTraits.gender} character, style ${characterTraits.style}, main color ${characterTraits.color_accent}`;
      charDescInstructions = `
      CRITICAL TASK: You must create a "Visual DNA" for the character based on this brief: "${baseDesc}".
      In the 'character_description' field, write a VERY detailed, comma-separated physical description that includes:
      - Exact hair color and style
      - Specific clothing items and colors
      - Accessories (glasses, hats, items)
      - Eye color and distinctive features
      - Skin tone/Material (if robot/3d)
      Example: "Cute 3D rendered boy, messy orange hair, wearing a large blue hoodie, oversized round glasses, white sneakers, soft lighting, pixar style."
      This description will be used to generate CONSISTENT images.
      `;
  } else {
      charDescInstructions = `Leave 'character_description' empty. Set 'include_character' to false.`;
  }

  const systemInstruction = `
    Role: You are a Senior Social Media Strategist and Visual Director.
    Objective: Generate a viral ${slideCount}-slide carousel.
    
    ${langInstruction}
    Target Audience: ${target_audience}
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

  const prompt = `Topic: ${topic}. Slides: ${slideCount}.`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
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
        overlayOpacity: 10, 
        fontSize: 'medium',
        font: 'sans',
        textAlign: language === 'ar' ? 'right' : 'left', // Initialize based on language
        xPosition: 50, // Center
        yPosition: 10, // Top area
        textEffect: 'shadow',
        decoration: 'none'
      }
    }));

    // Ensure metadata has all fields
    data.carousel_metadata.language = language;
    data.carousel_metadata.tone = tone;
    data.carousel_metadata.dialect = dialect;
    data.carousel_metadata.aspect_ratio = aspectRatio;
    data.carousel_metadata.character_traits = characterTraits;
    data.carousel_metadata.brand_colors = brandColors;

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
  const model = "gemini-2.5-flash-image";
  
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
         characterPromptPart = `
         MAIN SUBJECT (Maintain Consistency): ${globalCharDNA}.
         ACTION: ${customAction}. ${expressionMod}
         PLACEMENT: The subject is at ${s.scale} scale, located in the ${posStr}. ${styleMods}
         `;
      }
  }

  const ar = metadata.aspect_ratio || '4:5';
  const aspectRatioPrompt = ar === '1:1' ? 'Square Aspect Ratio 1:1' : ar === '16:9' ? 'Wide Aspect Ratio 16:9' : 'Vertical Aspect Ratio 4:5';

  const imagePrompt = `
    Create a social media background image (${aspectRatioPrompt}).
    Visual Style: ${metadata.visual_style}.
    Background Scene: ${slide.visual_description}.
    ${characterPromptPart}
    Constraint: NO TEXT in the image. High quality, aesthetic, clean background.
  `;

  // Determine Aspect Ratio for API
  let apiAspectRatio = "4:5"; 
  if (ar === '1:1') apiAspectRatio = "1:1";
  if (ar === '16:9') apiAspectRatio = "16:9";

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: [{ text: imagePrompt }] },
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
