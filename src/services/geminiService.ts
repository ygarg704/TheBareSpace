import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === "undefined") {
  console.error("GEMINI_API_KEY is not defined. Please set it in your environment variables or GitHub Secrets.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

// Simple in-memory cache to prevent redundant hits and save quota
const analysisCache = new Map<string, any>();

export async function getTravelAnalysis(destination: string, origin: string) {
  const cacheKey = `analysis-v3-${destination}-${origin}`.toLowerCase();
  if (analysisCache.has(cacheKey)) return analysisCache.get(cacheKey);

  if (!apiKey || apiKey === "undefined") {
    throw new Error("API Key Missing: Please ensure GEMINI_API_KEY is correctly set.");
  }

  try {
    const prompt = `You are a specialist in climatology, tourism trends, and real-time deal hunting.
      Destination: ${destination}
      Current Date: ${new Date().toLocaleDateString()}
      From: ${origin}

      Generate a comprehensive travel intelligence report for ${destination} from ${origin}.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        systemInstruction: `You are the core of "NOMAD INTEL", an autonomous travel intelligence agent.
        Your goal is to provide precise, data-driven travel advice, real-world deals, and optimized itineraries.
        
        Your response MUST be a JSON object following this EXACT schema:
        {
          "destinationVerdict": "string",
          "seasonalAnalysis": [
            { "season": "string", "months": "string", "weather": "string", "avgTemp": "string", "rainDays": "string", "daylight": "string", "events": "string", "crowdLevel": "string", "priceIndex": "string" }
          ],
          "liveDeals": {
            "flights": "string (Markdown)",
            "packages": "string (Markdown)",
            "promoCodes": "string (Markdown)"
          },
          "estimatedDays": number,
          "itinerary": [
            { "day": number, "title": "string", "activities": "string" }
          ],
          "full14DayItinerary": [
            { "day": number, "title": "string", "activities": "string" }
          ],
          "proTip": "string",
          "similarDestinations": [
            { "name": "string", "reason": "string", "vibe": "string", "matchScore": number }
          ]
        }
        
        Instructions:
        1. Use Google Search grounding to find REAL deals.
        2. Hyperlink landmarks to Google Maps.
        3. Hyperlink deals to merchant sites.
        4. Provide 14 days of data in full14DayItinerary.`,
        tools: [{ googleSearch: {} }],
      },
    });

    if (!response || !response.text) {
      throw new Error("EMPTY_RESPONSE: The intelligence scan returned no data.");
    }

    const data = JSON.parse(response.text.trim());
    analysisCache.set(cacheKey, data);
    return data;
  } catch (err: any) {
    console.error("Analysis error:", err);
    // Explicitly handle 429 and 404 for the UI
    if (err.message?.includes('429')) throw new Error("QUOTA_SATURATED: Please wait 60s for next node sync.");
    if (err.message?.includes('404')) throw new Error("MODEL_NOT_FOUND: Switching nodes. Please retry.");
    throw err;
  }
}

export async function getOptimizedItinerary(destination: string, days: number) {
  // Now we don't strictly need this as a separate call if we have full14DayItinerary in the first call.
  // But for compatibility with existing UI, we'll return from cache or return a subset.
  // The UI calls this separately when the slider moves. 
  // We'll manage this logic in App.tsx to avoid the extra hit.
  return []; 
}

export async function getDestinationImage(destination: string) {
  // Use a reliable, high-quality static image logic to save API quota
  return `https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1200&q=destination=${encodeURIComponent(destination)}`;
}
