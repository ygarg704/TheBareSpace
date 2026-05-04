/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export async function getTravelAnalysis(destination: string, origin: string) {
  try {
    const response = await fetch("/api/travel-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination, origin }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const msg = errorData.details 
        ? `${errorData.error} (${errorData.details})` 
        : errorData.error || `Server Error: ${response.status}`;
      throw new Error(msg);
    }

    const data = await response.json();
    return data;
  } catch (err: any) {
    console.error("Analysis error:", err);
    throw err;
  }
}

export async function getOptimizedItinerary(destination: string, days: number) {
  return []; 
}

export async function getDestinationImage(destination: string) {
  return `https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=1200&q=destination=${encodeURIComponent(destination)}`;
}
