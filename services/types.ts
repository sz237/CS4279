import type { TripStop } from "@/lib/trips";

export type TravelMode = "walk" | "transit" | "drive";

export type AIActivityStop = TripStop & {
  aiTime: string;
  aiDurationMinutes: number;
  aiCommuteMinutes: number | null;
  aiCategory: string;
  aiTravelMode: TravelMode;
};

export type AIDayResult = {
  date: string;
  activities: AIActivityStop[];
};
