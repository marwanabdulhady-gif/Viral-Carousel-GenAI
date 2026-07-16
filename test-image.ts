import { GoogleGenAI } from "@google/genai";

async function test() {
    const ai = new GoogleGenAI({ apiKey: "AIzaSyDummyKeyDummyKeyDummyKeyDummyKey" });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: {
                parts: [
                    { text: 'A robot holding a red skateboard.' },
                    { inlineData: { mimeType: 'image/png', data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' } }
                ]
            },
            config: {
                imageConfig: {
                    aspectRatio: "1:1"
                }
            }
        });
        console.log("Success!");
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
