
import { GoogleGenAI } from "@google/genai";
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

async function checkModels() {
  try {
    const models = await ai.models.list();
    console.log("Available Models:", JSON.stringify(models, null, 2));
  } catch (err) {
    console.error("Error listing models:", err);
  }
}

checkModels();
