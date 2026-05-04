import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for Gemini Travel Analysis
  app.post("/api/travel-analysis", async (req, res) => {
    const { destination, origin } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!destination || !origin) {
      return res.status(400).json({ error: "Destination and Origin are required." });
    }

    if (!apiKey || apiKey === "undefined" || apiKey === "MY_GEMINI_API_KEY") {
      console.error("[Server] API Key Missing or Placeholder:", apiKey ? "Placeholder detected" : "Missing");
      return res.status(500).json({ 
        error: "GEMINI_API_KEY is not configured.", 
        details: "The server received a placeholder or missing key. Please check AI Studio Secrets." 
      });
    }

    try {
      console.log(`[Server] Generating content for ${destination} from ${origin}... Key prefix: ${apiKey.substring(0, 4)}***`);
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
      });

      const prompt = `You are a specialist in climatology, tourism trends, and real-time deal hunting for "NOMAD INTEL".
      Destination: ${destination}
      Traveling from (Origin): ${origin}
      Current Date: ${new Date().toLocaleDateString()}

      Your response MUST be a JSON object following this format:
      {
        "destinationVerdict": "one sentence summary",
        "seasonalAnalysis": [
          { "season": "Peak", "months": "string", "weather": "string", "avgTemp": "string", "rainDays": "string", "daylight": "string", "events": "string", "crowdLevel": "High", "priceIndex": "$$$" },
          { "season": "Shoulder", "months": "string", "weather": "string", "avgTemp": "string", "rainDays": "string", "daylight": "string", "events": "string", "crowdLevel": "Moderate", "priceIndex": "$$" },
          { "season": "Off-Peak", "months": "string", "weather": "string", "avgTemp": "string", "rainDays": "string", "daylight": "string", "events": "string", "crowdLevel": "Low", "priceIndex": "$" }
        ],
        "liveDeals": {
          "flights": "Markdown link to potential search results on Google Flights or similar",
          "packages": "Markdown link to potential packages",
          "promoCodes": "Markdown text"
        },
        "estimatedDays": 7,
        "itinerary": [
          { "day": 1, "title": "Day 1 Title", "activities": "Brief markdown description with Google Maps links" }
        ],
        "full14DayItinerary": [
          { "day": 1, "title": "Day 1 Title", "activities": "Brief markdown description" }
        ],
        "proTip": "One useful travel tip",
        "similarDestinations": [
          { "name": "Alternative", "reason": "Why it's similar", "vibe": "The vibe", "matchScore": 85 }
        ]
      }

      Generate 14 days of itinerary data in 'full14DayItinerary'. Use Google Search grounding to suggest real, currently active deals and landmarks.`;

      const response = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ googleSearchRetrieval: {} } as any],
        generationConfig: {
          responseMimeType: "application/json",
        }
      });
      const outputText = response.response.text();
      
      if (!outputText) {
        throw new Error("Gemini returned an empty response.");
      }

      console.log(`[Server] Successfully generated content for ${destination}`);
      // Try to parse the JSON to ensure it's valid before sending to client
      const data = JSON.parse(outputText);
      res.json(data);
    } catch (error: any) {
      console.error("Gemini Server Error:", error);
      res.status(500).json({ 
        error: "Failed to generate travel intelligence.",
        details: error.message || String(error),
        stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
