import { TravelAnalysis } from "../types";

export async function getTravelAnalysis(destination: string, origin: string): Promise<TravelAnalysis> {
  const response = await fetch('/api/travel/analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination, origin })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Server Intelligence Error");
  }

  return response.json();
}

export async function getOptimizedItinerary(destination: string, days: number) {
  // Logic now handled by local slicing of full14DayItinerary from master analysis
  return [];
}

export async function getDestinationImage(destination: string) {
  // Stay on client for image fetching to optimize resources
  return `https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1200&q=destination=${encodeURIComponent(destination)}`;
}
