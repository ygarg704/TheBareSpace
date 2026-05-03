import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey || apiKey === "undefined") {
  console.error("GEMINI_API_KEY is not defined. Please set it in your environment variables or GitHub Secrets.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "" });

export async function getTravelAnalysis(destination: string, origin: string) {
  if (!apiKey || apiKey === "undefined") {
    throw new Error("API Key Missing: Please ensure GEMINI_API_KEY is correctly set in GitHub Secrets and passed to the build process.");
  }
  const prompt = `You are a specialist in climatology, tourism trends, and real-time deal hunting for the "Global Travel Optimizer" app.
    Destination: ${destination}
    Traveling from (Origin): ${origin}
    Current Date: ${new Date().toLocaleDateString()}

    Your response MUST be a JSON object following this schema:
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
    3. Generate an optimized daily itinerary for the 'estimatedDays' count. 
    4. HYPERLINK every location/landmark in the 'activities' field to a Google Maps search URL.
    5. Ensure the pricing and recommendations are contextually relative to someone traveling from ${origin}.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
      },
    });

    return JSON.parse(result.text || "{}");
  } catch (err) {
    console.error("Analysis error:", err);
    throw err;
  }
}

export async function getOptimizedItinerary(destination: string, days: number) {
  const prompt = `You are a travel planning expert.
    Destination: ${destination}
    Duration: ${days} days

    Create a highly optimized, logical daily itinerary for exactly ${days} days in ${destination}. 
    Focus on the "best" travel destinations and attractions for this specific duration.
    If the duration is short, prioritize the absolute must-see spots. If long, include hidden gems.

    Return ONLY a JSON array of objects:
    [
      { "day": 1, "title": "string", "activities": "string (Hyperlink key locations to Google Maps: https://www.google.com/maps/search/[Place+Name])" }
    ]

    Hyperlink every location/landmark to its Google Maps search result.`;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }],
      },
    });

    return JSON.parse(result.text || "[]");
  } catch (err) {
    console.error("Itinerary error:", err);
    throw err;
  }
}

export async function getDestinationImage(destination: string) {
  // Image generation is very high quota cost or unsupported on some tiers.
  // We'll use a high-quality placeholder logic or simply skip if it's causing 429s.
  // For now, let's try a very simplified text-to-image request with a lighter model if possible,
  // but if it fails, we just return null.
  try {
    const result = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [
          {
            text: `A cinematic, high-end travel photography style image of ${destination}. Luxury travel vibe, clear weather, stunning landscape or iconic landmark. No text, no people.`,
          },
        ],
      }],
    });

    for (const part of result.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  } catch (err) {
    console.warn('Image generation skipped or failed:', err);
  }
  return null;
}
