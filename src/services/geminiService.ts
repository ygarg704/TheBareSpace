import { GoogleGenAI } from "@google/genai";
import { TravelAnalysis } from "../types";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === "undefined") {
  console.error("GEMINI_API_KEY is not defined. Please set it in your environment variables or GitHub Secrets.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

// Simple in-memory cache to prevent redundant hits and save quota
const analysisCache = new Map<string, any>();

export async function getTravelAnalysis(destination: string, origin: string) {
  const cacheKey = `master-v3-${destination}-${origin}`.toLowerCase();
  if (analysisCache.has(cacheKey)) return analysisCache.get(cacheKey);

  if (!apiKey || apiKey === "undefined") {
    throw new Error("API Key Missing");
  }

  const prompt = `You are a specialist in climatology, tourism trends, and real-time deal hunting for the "Global Travel Optimizer" app.
    Destination: ${destination}
    Traveling from (Origin): ${origin}
    Current Date: ${new Date().toLocaleDateString()}

    Your response MUST be a JSON object ONLY, with no other text, following this schema:
    {
      "destinationVerdict": "string",
      "seasonalAnalysis": [
        { "season": "Peak", "months": "string", "weather": "string", "avgTemp": "string", "rainDays": "string", "daylight": "string", "events": "string", "crowdLevel": "High", "priceIndex": "$$$" },
        { "season": "Shoulder", "months": "string", "weather": "string", "avgTemp": "string", "rainDays": "string", "daylight": "string", "events": "string", "crowdLevel": "Moderate", "priceIndex": "$$" },
        { "season": "Off-Peak", "months": "string", "weather": "string", "avgTemp": "string", "rainDays": "string", "daylight": "string", "events": "string", "crowdLevel": "Low", "priceIndex": "$" }
      ],
      "liveDeals": {
        "flights": "string (Markdown with links)",
        "packages": "string (Markdown with links)",
        "promoCodes": "string (Markdown with links)"
      },
      "estimatedDays": 7,
      "full14DayItinerary": [
        { "day": 1, "title": "string", "activities": "string (Hyperlink every location to Google Maps: https://www.google.com/maps/search/[Place+Name])" }
      ],
      "proTip": "string",
      "similarDestinations": [
        { "name": "string", "reason": "string", "vibe": "string", "matchScore": 90 }
      ]
    }

    Instructions:
    1. Use Google Search to find REAL active, bookable deals.
    2. Generate a comprehensive 14-day itinerary in 'full14DayItinerary'. 
    3. HYPERLINK every activity location to Google Maps.
    4. Ensure pricing/recommendations are relative to someone traveling from ${origin}.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        // responseMimeType: "application/json" // Removed to avoid Search conflict if persists, using manual extraction
      },
    });

    const text = result.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const rawData = JSON.parse(jsonMatch ? jsonMatch[0] : (text || "{}"));
    
    // Ensure all expected arrays are present to prevent .map() crashes
    const data: TravelAnalysis = {
      ...rawData,
      seasonalAnalysis: rawData.seasonalAnalysis || [],
      itinerary: rawData.itinerary || rawData.full14DayItinerary || [],
      full14DayItinerary: rawData.full14DayItinerary || rawData.itinerary || [],
      similarDestinations: rawData.similarDestinations || [],
      liveDeals: rawData.liveDeals || { flights: "", packages: "", promoCodes: "" }
    };

    analysisCache.set(cacheKey, data);
    return data;
  } catch (err: any) {
    if (err.message?.includes('429')) throw new Error("QUOTA_SATURATED: Please wait 60s for next sync.");
    throw err;
  }
}

export async function getOptimizedItinerary(destination: string, days: number) {
  // Logic deprecated in favor of local slicing from 'full14DayItinerary'
  // Return empty to maintain type compatibility if needed
  return [];
}

export async function getDestinationImage(destination: string) {
  // Use a high-quality Unsplash image to save Gemini API quota for intelligence
  return `https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1200&q=destination=${encodeURIComponent(destination)}`;
}
