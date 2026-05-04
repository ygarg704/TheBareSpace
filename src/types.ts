export interface SeasonalData {
  season: string;
  months: string;
  weather: string;
  avgTemp: string;
  rainDays: string;
  daylight: string;
  events: string;
  crowdLevel: string;
  priceIndex: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  activities: string; // Markdown or string with hyperlinked locations
}

export interface TravelAnalysis {
  destinationVerdict: string;
  heroImageUrl?: string;
  seasonalAnalysis: SeasonalData[];
  liveDeals: {
    flights: string; // Expecting markdown links
    packages: string;
    promoCodes: string;
  };
  proTip: string;
  estimatedDays: number;
  itinerary: ItineraryDay[];
  similarDestinations: {
    name: string;
    reason: string;
    vibe: string;
    matchScore: number; // 0-100
  }[];
}
