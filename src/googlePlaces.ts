// src/googlePlaces.ts
// Google Places API (New) v1 wrapper
// Docs:
// - Text Search (New): POST https://places.googleapis.com/v1/places:searchText :contentReference[oaicite:1]{index=1}
// - Nearby Search (New): POST https://places.googleapis.com/v1/places:searchNearby :contentReference[oaicite:2]{index=2}
// - Place Details (New): GET https://places.googleapis.com/v1/places/{placeId} (FieldMask required) :contentReference[oaicite:3]{index=3}
// - Photos (New): GET https://places.googleapis.com/v1/{photo.name}/media?... :contentReference[oaicite:4]{index=4}

export type LatLng = { lat: number; lng: number };

export type PlacesApiStatus =
  | "OK"
  | "ZERO_RESULTS"
  | "INVALID_REQUEST"
  | "OVER_QUERY_LIMIT"
  | "REQUEST_DENIED"
  | "UNKNOWN_ERROR";

export class GooglePlacesError extends Error {
  status?: PlacesApiStatus;
  endpoint?: string;
  constructor(message: string, opts?: { status?: PlacesApiStatus; endpoint?: string }) {
    super(message);
    this.name = "GooglePlacesError";
    this.status = opts?.status;
    this.endpoint = opts?.endpoint;
  }
}

const PLACES_V1_BASE = "https://places.googleapis.com/v1";

function assertApiKey(apiKey?: string) {
  if (!apiKey) {
    throw new GooglePlacesError(
      "Missing EXPO_PUBLIC_GOOGLE_PLACES_API_KEY. Add it to your .env and restart Expo."
    );
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

type DisplayName = { text: string; languageCode?: string };

export type PlacePhoto = {
  // In v1 search responses, photos contain a `name` like:
  // "places/{placeId}/photos/{photo_reference}"
  name: string;
  widthPx?: number;
  heightPx?: number;
  authorAttributions?: Array<{
    displayName?: string;
    uri?: string;
    photoUri?: string;
  }>;
};

export type PlaceV1 = {
  id: string; // stable place id
  displayName?: DisplayName;
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  photos?: PlacePhoto[];
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string; // enum-ish string in v1
  primaryType?: string;
  types?: string[];
  businessStatus?: string;
  googleMapsUri?: string;
  websiteUri?: string;
};

export type SearchTextResponse = {
  places?: PlaceV1[];
};

export type SearchNearbyResponse = {
  places?: PlaceV1[];
};

export type PlaceDetailsResponse = PlaceV1;

function buildHeaders(apiKey: string, fieldMask: string) {
  // Field mask is mandatory for these calls. :contentReference[oaicite:5]{index=5}
  return {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask": fieldMask,
  };
}

async function fetchJson<T>(url: string, init: RequestInit, endpointName: string): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new GooglePlacesError(`HTTP ${res.status} from Places v1. ${txt}`, {
      endpoint: endpointName,
    });
  }
  return (await res.json()) as T;
}

// ---------- Photos (New) ----------
export function getPlacePhotoUrl(params: {
  apiKey: string;
  photoName: string; // e.g. "places/{placeId}/photos/{photo_reference}"
  maxWidthPx?: number;
  maxHeightPx?: number;
  skipHttpRedirect?: boolean; // usually leave false
}) {
  const { apiKey, photoName, maxWidthPx, maxHeightPx, skipHttpRedirect } = params;
  assertApiKey(apiKey);

  // Must call getMedia with name "places/{placeId}/photos/{photo_reference}/media" :contentReference[oaicite:6]{index=6}
  const nameWithMedia = photoName.endsWith("/media") ? photoName : `${photoName}/media`;

  const url = new URL(`${PLACES_V1_BASE}/${nameWithMedia}`);
  url.searchParams.set("key", apiKey);

  // At least one of maxWidthPx/maxHeightPx is required in practice. :contentReference[oaicite:7]{index=7}
  if (maxWidthPx) url.searchParams.set("maxWidthPx", String(maxWidthPx));
  if (maxHeightPx) url.searchParams.set("maxHeightPx", String(maxHeightPx));
  if (!maxWidthPx && !maxHeightPx) url.searchParams.set("maxWidthPx", "1200");

  if (skipHttpRedirect) url.searchParams.set("skipHttpRedirect", "true");

  return url.toString();
}

// ---------- Text Search (New) ----------
export async function searchText(params: {
  apiKey: string;
  textQuery: string;
  locationBias?: { center: LatLng; radiusMeters: number }; // circle bias
  maxResultCount?: number; // default-ish 20 on server; set your own
  languageCode?: string;
  regionCode?: string;
}): Promise<SearchTextResponse> {
  const { apiKey, textQuery, locationBias, maxResultCount, languageCode, regionCode } = params;
  assertApiKey(apiKey);

  const fieldMask =
    "places.id,places.displayName,places.formattedAddress,places.location,places.photos,places.rating,places.userRatingCount,places.priceLevel,places.primaryType,places.types";

  const body: any = {
    textQuery,
    maxResultCount,
    languageCode,
    regionCode,
  };

  // locationBias uses locationRestriction.circle in v1 search methods. :contentReference[oaicite:8]{index=8}
  if (locationBias) {
    body.locationBias = {
      circle: {
        center: {
          latitude: locationBias.center.lat,
          longitude: locationBias.center.lng,
        },
        radius: locationBias.radiusMeters,
      },
    };
  }

  return fetchJson<SearchTextResponse>(
    `${PLACES_V1_BASE}/places:searchText`,
    {
      method: "POST",
      headers: buildHeaders(apiKey, fieldMask),
      body: JSON.stringify(body),
    },
    "places:searchText"
  );
}

// ---------- Nearby Search (New) ----------
export async function searchNearby(params: {
  apiKey: string;
  locationRestriction: { center: LatLng; radiusMeters: number };
  includedTypes?: string[]; // e.g. ["restaurant"] (primary types)
  excludedTypes?: string[];
  maxResultCount?: number;
  rankPreference?: "POPULARITY" | "DISTANCE";
  languageCode?: string;
  regionCode?: string;
}): Promise<SearchNearbyResponse> {
  const {
    apiKey,
    locationRestriction,
    includedTypes,
    excludedTypes,
    maxResultCount,
    rankPreference,
    languageCode,
    regionCode,
  } = params;

  assertApiKey(apiKey);

  const fieldMask =
    "places.id,places.displayName,places.formattedAddress,places.location,places.photos,places.rating,places.userRatingCount,places.priceLevel,places.primaryType,places.types";

  const body: any = {
    maxResultCount,
    rankPreference,
    languageCode,
    regionCode,
    locationRestriction: {
      circle: {
        center: {
          latitude: locationRestriction.center.lat,
          longitude: locationRestriction.center.lng,
        },
        radius: locationRestriction.radiusMeters,
      },
    },
    includedPrimaryTypes: includedTypes,
    excludedPrimaryTypes: excludedTypes,
  };

  return fetchJson<SearchNearbyResponse>(
    `${PLACES_V1_BASE}/places:searchNearby`,
    {
      method: "POST",
      headers: buildHeaders(apiKey, fieldMask),
      body: JSON.stringify(body),
    },
    "places:searchNearby"
  );
}

// ---------- Place Details (New) ----------
export async function placeDetails(params: {
  apiKey: string;
  placeId: string; // v1 uses the same stable id
  fields?: string; // field mask, no "places." prefix here because it's a single Place resource
}): Promise<PlaceDetailsResponse> {
  const { apiKey, placeId } = params;
  assertApiKey(apiKey);

  // FieldMask required or you'll get an error. :contentReference[oaicite:9]{index=9}
  const fields =
    params.fields ??
    "id,displayName,formattedAddress,location,photos,rating,userRatingCount,priceLevel,types,primaryType,googleMapsUri,websiteUri";

  return fetchJson<PlaceDetailsResponse>(
    `${PLACES_V1_BASE}/places/${encodeURIComponent(placeId)}`,
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": fields,
      },
    },
    "places:get"
  );
}

// ---------- Convenience helpers ----------
export function getBestName(place: PlaceV1) {
  return place.displayName?.text ?? "(Unnamed place)";
}

export function getBestAddress(place: PlaceV1) {
  return place.formattedAddress ?? "";
}

export function getBestPhotoUrl(params: { apiKey: string; place: PlaceV1; maxWidthPx?: number }) {
  const photoName = params.place.photos?.[0]?.name;
  if (!photoName) return undefined;
  return getPlacePhotoUrl({
    apiKey: params.apiKey,
    photoName,
    maxWidthPx: params.maxWidthPx ?? 1200,
  });
}