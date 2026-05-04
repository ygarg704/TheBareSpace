import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenAI({ apiKey: apiKey || "" });

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { destination, origin } = req.body;

  if (!apiKey || apiKey === "undefined") {
    return res.status(500).json({ error: "Gemini API Key missing on server." });
  }

  try {
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
      1. Use Google Search (if available) to find REAL active, bookable deals.
      2. Generate a comprehensive 14-day itinerary in 'full14DayItinerary'. 
      3. HYPERLINK every activity location to Google Maps.
      4. Ensure pricing/recommendations are relative to someone traveling from ${origin}.`;

    const result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    const text = result.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const rawData = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    
    // Robustly sanitize response
    const data = {
      ...rawData,
      seasonalAnalysis: rawData.seasonalAnalysis || [],
      itinerary: rawData.itinerary || rawData.full14DayItinerary || [],
      full14DayItinerary: rawData.full14DayItinerary || rawData.itinerary || [],
      similarDestinations: rawData.similarDestinations || [],
      liveDeals: rawData.liveDeals || { flights: "", packages: "", promoCodes: "" }
    };

    res.status(200).json(data);
  } catch (err: any) {
    console.error("Gemini API Error:", err);
    res.status(500).json({ error: err.message });
  }
}
