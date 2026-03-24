import { placeToStop, resolveActivityName, searchPlaces } from "./placesService";
import { parseTravelMode } from "./routeService";
import type { AIDayResult } from "./types";

export type AiItineraryParams = {
  city: string;
  interests: string[];
  startDate: string;
  endDate: string;
  radiusMiles?: number;
};

type VanderbiltActivity = {
  order: number;
  timeOfDay: string;
  name: string;
  type: string;
  estimatedDurationMinutes?: number;
  estimatedActivityDurationMinutes?: number;
  estimatedCommuteTransportToNextDurationMinutes?: number;
  transportToNext: string;
  description: string;
};

type VanderbiltDay = {
  date: string;
  area: string;
  activities: VanderbiltActivity[];
};

type VanderbiltItinerary = {
  city: string;
  days: VanderbiltDay[];
};

const VANDERBILT_API_URL = "https://prod-api.vanderbilt.ai/chat";

export async function generateAiItinerary(
  params: AiItineraryParams,
  apiKey: string,
  onProgress: (done: number, total: number) => void
): Promise<AIDayResult[]> {
  const vanderbiltToken = process.env.EXPO_PUBLIC_vanderbiltApiKey;
  if (!vanderbiltToken) {
    throw new Error("Missing EXPO_PUBLIC_vanderbiltApiKey in .env");
  }

  const { city, interests, startDate, endDate, radiusMiles = 10 } = params;
  const interestStr = interests.join(", ");

  const systemContent =
    `You are a travel planning and route optimization engine.\n\n` +
    `Your task is to generate a single-day or multi-day itinerary based on user input:\n` +
    `- city: ${city}\n` +
    `- interests: ${interestStr}\n` +
    `- start_date: ${startDate}\n` +
    `- end_date: ${endDate}\n` +
    `- radiusMiles: ${radiusMiles}\n\n` +
    `This is NOT just a list of places. You must create a logically ordered plan for each day that minimizes travel distance and creates a smooth, realistic flow of activities.\n\n` +
    `CORE REQUIREMENTS:\n\n` +
    `1. DAY STRUCTURE\n- Split the itinerary by date\n- morning, afternoon, evening\n\n` +
    `2. PROXIMITY OPTIMIZATION (VERY IMPORTANT)\n- Group nearby places\n- Minimize backtracking\n- Prefer same neighborhood clusters\n\n` +
    `3. TIME & FLOW AWARENESS\n- Estimate durations of the actiivty and the durations of the commute depending on the most optimal mode of transportation\n- Include meals + breaks\n- Avoid overpacking\n\n` +
    `4. TRANSPORTATION\n- walking, driving, transit\n\n` +
    `5. ACTIVITY SELECTION\n- Specific real places\n- Mix anchor + supporting\n\n` +
    `6. TIME-OF-DAY\n- Morning: coffee\n- Afternoon: attractions\n- Evening: dinner/nightlife\n\n` +
    `OUTPUT STRICT JSON FORMAT:\n` +
    `{\n  "city": "${city}",\n  "days": [\n    {\n      "date": "YYYY-MM-DD",\n      "area": "...",\n      "activities": [\n        {\n          "order": 1,\n          "timeOfDay": "morning",\n          "name": "...",\n          "type": "...",\n          "estimatedActivityDurationMinutes": 60,\n          "estimatedCommuteTransportToNextDurationMinutes": 60,\n          "transportToNext": "walking",\n          "description": "..."\n        }\n      ]\n    }\n  ]\n}`;

  const userContent =
    `Generate an itinerary using the following user input:\n\nINPUT:\n` +
    JSON.stringify({ city, start_date: startDate, end_date: endDate, interests, radiusMiles }, null, 2) +
    `\n\nFollow all itinerary generation rules provided in the system instructions, including:\n` +
    `- proximity-based ordering of activities\n` +
    `- realistic time and duration planning\n` +
    `- transportation optimization\n` +
    `- balanced daily flow (morning, afternoon, evening)\n\n` +
    `Return STRICT JSON only in the required format.`;

  const payload = {
    data: {
      temperature: 0.7,
      max_tokens: 4000,
      dataSources: [],
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: userContent },
      ],
      options: {
        ragOnly: false,
        skipRag: true,
        model: { id: "gpt-4o" },
      },
    },
  };

  const response = await fetch(VANDERBILT_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${vanderbiltToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Vanderbilt API error: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  const raw: string = json?.data ?? "";

  // Strip markdown code fences if present (e.g. ```json\n...\n```)
  const fenceMatch =
    raw.match(/```json\n([\s\S]*?)\n```/) ??
    raw.match(/```\n([\s\S]*?)\n```/);
  const jsonStr = fenceMatch ? fenceMatch[1] : raw.trim();

  const parsed: VanderbiltItinerary = JSON.parse(jsonStr);

  if (!parsed.days?.length) {
    throw new Error("AI couldn't generate a plan. Check that the Vanderbilt API is reachable.");
  }

  // Resolve each activity name via Google Places (serial to respect rate limits)
  const allActivities = parsed.days.flatMap((d) => d.activities);
  onProgress(0, allActivities.length);

  const resolvedMap: Record<string, ReturnType<typeof placeToStop>> = {};
  for (let i = 0; i < allActivities.length; i++) {
    const act = allActivities[i];
    if (!resolvedMap[act.name]) {
      const stop = await resolveActivityName(apiKey, act.name, city);
      if (stop) resolvedMap[act.name] = stop;
    }
    onProgress(i + 1, allActivities.length);
  }

  const resolvedDays: AIDayResult[] = parsed.days
    .map((day) => ({
      date: day.date,
      activities: day.activities
        .filter((act) => resolvedMap[act.name])
        .map((act) => ({
          ...resolvedMap[act.name]!,
          aiTime: act.timeOfDay,
          aiDurationMinutes:
            act.estimatedDurationMinutes ??
            act.estimatedActivityDurationMinutes ??
            60,
          aiCategory: act.type,
          aiTravelMode: parseTravelMode(act.transportToNext),
        })),
    }))
    .filter((day) => day.activities.length > 0);

  return resolvedDays;
}

export async function fetchExtras(
  apiKey: string,
  interests: string[],
  city: string,
  excludeIds: Set<string>
) {
  const places = await searchPlaces(
    apiKey,
    `${interests.join(", ")} in ${city}`,
    10
  );
  return places
    .filter((p) => !excludeIds.has(p.id))
    .slice(0, 6)
    .map((p) => placeToStop(apiKey, p));
}
