import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

// Persistent cache using localStorage to save quota across sessions
const getCache = (key: string) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
};

const setCache = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn("Storage quota full, falling back to memory.");
  }
};

// Retry helper with exponential backoff for 429s (Quota)
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 5000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    // Standard error check for Gemini API
    const errorStr = JSON.stringify(err);
    if ((errorStr.includes('429') || errorStr.includes('quota')) && retries > 0) {
      console.warn(`Quota rate limit reached. Backing off for ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      return withRetry(fn, retries - 1, delay * 3); // Aggressive backoff
    }
    throw err;
  }
}

export async function getTravelAnalysis(destination: string, origin: string) {
  const cacheKey = `analysis-v13-${destination}-${origin}`.toLowerCase();
  const cached = getCache(cacheKey);
  if (cached) return cached;

  if (!apiKey || apiKey === "undefined") {
    throw new Error("API Key Missing: Please ensure GEMINI_API_KEY is correctly set in your environment variables.");
  }

  try {
    return await withRetry(async () => {
      const prompt = `Travel intelligence request: ${destination} from ${origin}. 
        Current Date: ${new Date().toLocaleDateString()}.
        Provide: Verdict, Seasonal Climatology (3 tiers), REAL bookable flight/hotel deals from ${origin}, 7-day optimized itinerary, pro-tips, and 3 high-match similar destinations.
        Include a 'heroImageUrl' field with a direct link to a professional cityscape/landscape photo of ${destination}.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          responseMimeType: "application/json",
          systemInstruction: `You are NOMAD INTEL, a hyper-fast autonomous travel agent. 
          Your output MUST be high-fidelity, professional, and data-dense.

          JSON Schema:
          {
            "destinationVerdict": "Elite travel insight (1 sentence)",
            "heroImageUrl": "Direct URL to a high-quality professional photograph",
            "seasonalAnalysis": [{"season": "Peak/Shoulder/Off", "months": "string", "weather": "string", "avgTemp": "string", "rainDays": "string", "daylight": "string", "events": "string", "crowdLevel": "string", "priceIndex": "$$$"}],
            "liveDeals": {"flights": "Markdown with links", "packages": "Markdown with links", "promoCodes": "Markdown with links"},
            "estimatedDays": number,
            "itinerary": [{"day": number, "title": "string", "activities": "Detailed markdown"}],
            "proTip": "Insider secret",
            "similarDestinations": [{"name": "string", "reason": "string", "vibe": "string", "matchScore": number}]
          }

          Instructions:
          1. Use Google Search grounding for REAL deals. Use Markdown [Merchant](URL).
          2. Use Google Search to find a specific, accurate hero image URL for ${destination}.
          3. Hyperlink landmarks to Google Maps search.
          4. Be extremely concise to avoid quota timeouts.`,
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text;
      if (!text) {
        throw new Error("EMPTY_RESPONSE: The intelligence scan returned no data.");
      }

      const data = JSON.parse(text.trim());
      setCache(cacheKey, data);
      return data;
    });
  } catch (err: any) {
    console.error("Analysis error:", err);
    const errorMessage = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
    if (errorMessage.includes('429')) throw new Error("QUOTA_SATURATED: The intelligence nodes are busy. Please wait 15-30 seconds for the next sync.");
    if (errorMessage.includes('404')) throw new Error("MODEL_UNAVAILABLE: The model is currently cycling. Please retry in a moment.");
    throw err;
  }
}


export async function getDestinationImage(destination: string) {
  const cleanDest = destination.split(',')[0].trim();
  const searchTerms = `travel,landscape,cityscape,architecture,${cleanDest}`;
  return `https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=85&w=1600&q=${encodeURIComponent(searchTerms)}`;
}
