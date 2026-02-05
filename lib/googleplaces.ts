const API_KEY = process.env.EXPO_PUBLIC_googlePlacesApiKey;

if (!API_KEY) {
  console.warn("Missing EXPO_PUBLIC_googlePlacesApiKey in .env");
}

type PlaceTextSearchResult = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
};

export async function placesTextSearch(query: string): Promise<PlaceTextSearchResult[]> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY || "",
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount",
    },
    body: JSON.stringify({ textQuery: query }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`placesTextSearch failed: ${res.status} ${t}`);
  }

  const data = await res.json();
  return (data.places || []) as PlaceTextSearchResult[];
}

type PlaceDetails = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  reviews?: Array<{
    rating?: number;
    text?: { text?: string };
    authorAttribution?: { displayName?: string };
  }>;
};

export async function placeDetails(placeId: string): Promise<PlaceDetails> {
  const url = `https://places.googleapis.com/v1/places/${placeId}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": API_KEY || "",
      "X-Goog-FieldMask":
        "id,displayName,formattedAddress,location,rating,userRatingCount,reviews",
    },
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`placeDetails failed: ${res.status} ${t}`);
  }

  return (await res.json()) as PlaceDetails;
}