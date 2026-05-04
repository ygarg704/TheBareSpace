import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === "undefined") {
  console.error("GEMINI_API_KEY is not defined. Please set it in your environment variables or GitHub Secrets.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

// Simple in-memory cache to prevent redundant hits and save quota
const analysisCache = new Map<string, any>();

export async function getTravelAnalysis(destination: string, origin: string) {
  const cacheKey = `analysis-v2-${destination}-${origin}`.toLowerCase();
  if (analysisCache.has(cacheKey)) return analysisCache.get(cacheKey);

  if (!apiKey || apiKey === "undefined") {
    throw new Error("API Key Missing: Please ensure GEMINI_API_KEY is correctly set in GitHub Secrets and passed to the build process.");
  }

  try {
    const prompt = `You are a specialist in climatology, tourism trends, and real-time deal hunting for the "Global Travel Optimizer" app.
      Destination: ${destination}
      Traveling from (Origin): ${origin}
      Current Date: ${new Date().toLocaleDateString()}

      Your response MUST be a JSON object following this schema:
      {
        "destinationVerdict": "string (one sentence summary)",
        "seasonalAnalysis": [
          { "season": "Peak", "months": "string", "weather": "string", "avgTemp": "string", "rainDays": "string", "daylight": "string", "events": "string", "crowdLevel": "High/Max", "priceIndex": "$$$" },
          { "season": "Shoulder", "months": "string", "weather": "string", "avgTemp": "string", "rainDays": "string", "daylight": "string", "events": "string", "crowdLevel": "Moderate", "priceIndex": "$$" },
          { "season": "Off-Peak", "months": "string", "weather": "string", "avgTemp": "string", "rainDays": "string", "daylight": "string", "events": "string", "crowdLevel": "Low", "priceIndex": "$" }
        ],
        "liveDeals": {
          "flights": "string (Markdown with links)",
          "packages": "string (Markdown with links)",
          "promoCodes": "string (Markdown with links)"
        },
        "estimatedDays": 7,
        "itinerary": [
          { "day": 1, "title": "string", "activities": "string (Hyperlink key locations/attractions to Google Maps: https://www.google.com/maps/search/[Place+Name])" }
        ],
        "full14DayItinerary": [
          { "day": 1, "title": "string", "activities": "string" }
        ],
        "proTip": "string",
        "similarDestinations": [
          { "name": "string", "reason": "string", "vibe": "string", "matchScore": 90 }
        ]
      }

      Instructions:
      1. Use Google Search to find REAL active, bookable deals from ${origin} to ${destination}.
      2. HYPERLINK the deals directly to the merchant websites using Markdown [Name](URL).
      3. Generate a primary 7-day itinerary in 'itinerary'.
      4. Generate a comprehensive 14-day itinerary in 'full14DayItinerary'. This will be used to slice for different durations locally without new API calls.
      5. HYPERLINK every location/landmark in the 'activities' field to a Google Maps search URL.
      6. Ensure the pricing and recommendations are contextually relative to someone traveling from ${origin}.`;

    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
      },
    });

    const data = JSON.parse(result.text || "{}");
    analysisCache.set(cacheKey, data);
    return data;
  } catch (err) {
    console.error("Analysis error:", err);
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
