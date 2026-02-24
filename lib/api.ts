export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

type Json = Record<string, any>;

async function postJson<T>(path: string, body: Json): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

export async function chat(messages: { role: string; content: string }[], context?: Json) {
  return postJson<{ reply: string }>("/chat", { messages, context });
}

export async function summarizeReviews(placeName: string, reviews: { author?: string; rating?: number; text: string }[]) {
  return postJson<{
    what_people_say: string[];
    pros: string[];
    cons: string[];
    best_for: string[];
  }>("/summarize-reviews", { placeName, reviews });
}

export async function buildItinerary(payload: {
  start_lat: number;
  start_lng: number;
  candidates: { id: string; name: string; lat: number; lng: number; rating?: number; userRatingCount?: number }[];
  max_stops?: number;
  dwell_minutes?: number;
  start_time?: string;
}) {
  return postJson<{
    ordered: {
      id: string;
      name: string;
      lat: number;
      lng: number;
      eta_from_prev_min: number;
      planned_start: string;
      planned_end: string;
    }[];
  }>("/build-itinerary", payload);
}