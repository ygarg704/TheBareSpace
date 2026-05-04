import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === "undefined") {
  console.error("GEMINI_API_KEY is not defined. Please set it in your environment variables or GitHub Secrets.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

// Simple in-memory cache to prevent redundant hits and save quota
const analysisCache = new Map<string, any>();

export async function getTravelAnalysis(destination: string, origin: string) {
  const cacheKey = `analysis-${destination}-${origin}`.toLowerCase();
  if (analysisCache.has(cacheKey)) return analysisCache.get(cacheKey);

  if (!apiKey || apiKey === "undefined") {
    throw new Error("API Key Missing: Please ensure GEMINI_API_KEY is correctly set in GitHub Secrets and passed to the build process.");
  }
  const prompt = `You are a specialist in climatology, tourism trends, and real-time deal hunting for the "Global Travel Optimizer" app.
    Destination: ${destination}
    Traveling from (Origin): ${origin}
    Current Date: ${new Date().toLocaleDateString()}

    Your response MUST be a JSON object ONLY, with no other text or explanation, following this schema:
    {
      "destinationVerdict": "string (one sentence summary)",
      "seasonalAnalysis": [
        { 
          "season": "Peak", 
          "months": "string", 
          "weather": "string", 
          "avgTemp": "string (e.g. 25°C / 77°F)",
          "rainDays": "string (e.g. 5 days/mo)",
          "daylight": "string (e.g. 14h)",
          "events": "string (major festival)",
          "crowdLevel": "High/Max", 
          "priceIndex": "$$$" 
        },
        { 
          "season": "Shoulder", 
          "months": "string", 
          "weather": "string", 
          "avgTemp": "string",
          "rainDays": "string",
          "daylight": "string",
          "events": "string",
          "crowdLevel": "Moderate", 
          "priceIndex": "$$" 
        },
        { 
          "season": "Off-Peak", 
          "months": "string", 
          "weather": "string", 
          "avgTemp": "string",
          "rainDays": "string",
          "daylight": "string",
          "events": "string",
          "crowdLevel": "Low", 
          "priceIndex": "$" 
        }
      ],
      "liveDeals": {
        "flights": "string (Markdown with REAL merchant links from ${origin} to ${destination})",
        "packages": "string (Markdown with real links to Expedia/Booking/etc)",
        "promoCodes": "string (Promo codes with links to terms if available)"
      },
      "estimatedDays": "number (the ideal trip length, usually between 4-14)",
      "itinerary": [
        { "day": 1, "title": "string", "activities": "string (Hyperlink key locations/attractions to Google Maps: https://www.google.com/maps/search/[Place+Name])" }
      ],
      "proTip": "string",
      "similarDestinations": [
        { "name": "string", "reason": "one sentence why it's a great choice TO VISIT RIGHT NOW compared to the target", "vibe": "one word vibe", "matchScore": "number 0-100" }
      ]
    }

    Instructions:
    1. Use Google Search to find REAL active, bookable deals from ${origin} to ${destination}.
    2. HYPERLINK the deals directly to the merchant websites using Markdown [Name](URL).
    3. Generate an optimized daily itinerary for EXACTLY the 'estimatedDays' count you decide. 
    4. HYPERLINK every location/landmark in the 'activities' field to a Google Maps search URL.
    5. Ensure the pricing and recommendations are contextually relative to someone traveling from ${origin}.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = result.text || "";
    // Robustly extract JSON from potential markdown code blocks
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const data = JSON.parse(jsonMatch ? jsonMatch[0] : (text || "{}"));
    analysisCache.set(cacheKey, data);
    return data;
  } catch (err: any) {
    console.error("Analysis error:", err);
    if (err.message?.includes('429')) throw new Error("QUOTA_SATURATED: Please wait 60s for next node sync.");
    throw err;
  }
}

export async function getOptimizedItinerary(destination: string, days: number) {
  const cacheKey = `itinerary-${destination}-${days}`.toLowerCase();
  if (analysisCache.has(cacheKey)) return analysisCache.get(cacheKey);

  const prompt = `You are a travel planning expert.
    Destination: ${destination}
    Duration: ${days} days

    Create a highly optimized, logical daily itinerary for exactly ${days} days in ${destination}. 
    Focus on the "best" travel destinations and attractions for this specific duration.
    If the duration is short, prioritize the absolute must-see spots. If long, include hidden gems.

    Return ONLY a JSON array of objects, with no other text:
    [
      { "day": 1, "title": "string", "activities": "string (Hyperlink key locations to Google Maps: https://www.google.com/maps/search/[Place+Name])" }
    ]

    Hyperlink every location/landmark to its Google Maps search result.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = result.text || "";
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    const data = JSON.parse(jsonMatch ? jsonMatch[0] : (text || "[]"));
    analysisCache.set(cacheKey, data);
    return data;
  } catch (err) {
    console.error("Itinerary error:", err);
    throw err;
  }
}

export async function getDestinationImage(destination: string) {
  // Use a high-quality Unsplash image to save Gemini API quota for intelligence
  return `https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1200&q=destination=${encodeURIComponent(destination)}`;
}
