import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

export const brainstormNotes = async (
  context: string,
  count: number = 3
): Promise<string[]> => {
  if (!apiKey) {
    console.warn("No API Key provided for Gemini");
    return ["Add API Key for AI", "Brainstorming unavailable", "Check settings"];
  }

  try {
    const model = 'gemini-2.5-flash';
    const prompt = `You are a creative brainstorming assistant participating in a whiteboard session. 
    Context or topic: "${context}".
    Generate ${count} short, punchy, creative sticky note ideas related to this context. 
    Keep them under 10 words each.`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Gemini brainstorming failed:", error);
    return [];
  }
};

export const generateClusterTitle = async (notes: string[]): Promise<string> => {
    if (!apiKey) return "New Cluster";
    if (notes.length === 0) return "Empty Cluster";
    
    try {
        const model = 'gemini-2.5-flash';
        // Limit context to first 10 notes to save tokens if huge cluster
        const context = notes.slice(0, 10).join(', ');
        const prompt = `Analyze these sticky notes and provide a single, short (2-4 words) Title for the group (Cluster). 
        Notes: "${context}".
        Return ONLY the title string.`;

        const response = await ai.models.generateContent({
            model,
            contents: prompt,
        });

        return response.text?.trim() || "Creative Cluster";
    } catch (e) {
        console.error(e);
        return "Group";
    }
}
