"use server";

import { IActivity } from "@/store/activityStore";
import { foodTypes, shoppingTypes, historicalTypes, SearchType, includedTypes } from "@/lib/googleMaps/includedTypes";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

// Simple mapping function for Google Places to our activity format
function mapGooglePlaceToActivity(place: any): IActivity {
  return {
    place_id: place.id,
    name: place.displayName?.text || "",
    coordinates: [place.location.longitude, place.location.latitude], // Store as [lng, lat]
    types: place.types || [],
    price_level: place.priceLevel || "",
    address: place.formattedAddress || "",
    rating: place.rating || null,
    description: place.editorialSummary?.text || "",
    google_maps_url: `https://www.google.com/maps/place/?q=place_id:${place.id}`,
    website_url: place.websiteUri || "",
    photo_names: place.photos ? place.photos.map((photo: any) => photo.name) : [],
    duration: null,
    phone_number: place.nationalPhoneNumber || "",
    reviews: [],
    open_hours: [],
  };
}

// 1. Text search - search for places using natural language queries
export const searchPlacesByText = async (
  textQuery: string,
  latitude: number,
  longitude: number,
  radiusInMeters: number = 25000
): Promise<IActivity[]> => {
  if (!textQuery || textQuery.trim().length < 2) {
    throw new Error("Search query must be at least 2 characters");
  }

  const validRadius = Math.max(0, Math.min(50000, radiusInMeters));
  const { cachedSearch } = await import("@/lib/cache/searchCache");
  const cacheKey = `textSearch:${textQuery.toLowerCase().trim()}:${latitude.toFixed(4)},${longitude.toFixed(4)}:${validRadius}`;
  
  return await cachedSearch(
    cacheKey,
    async () => {
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY!,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.priceLevel,places.photos,places.editorialSummary,places.websiteUri,places.nationalPhoneNumber",
        },
        body: JSON.stringify({
          textQuery,
          pageSize: 20,
          locationBias: {
            circle: {
              center: { latitude, longitude },
              radius: validRadius,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Text search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.places?.map(mapGooglePlaceToActivity) || [];
    },
    5 * 60 * 1000
  );
};

// 2. Nearby search - find places in a wide area by type
export const fetchNearbyActivities = async (
  latitude: number,
  longitude: number,
  radiusInMeters: number = 25000,
  searchType: SearchType = "all"
): Promise<IActivity[]> => {
  const validRadius = Math.max(0, Math.min(50000, radiusInMeters));
  const { cachedSearch } = await import("@/lib/cache/searchCache");
  const cacheKey = `nearby:${latitude.toFixed(4)},${longitude.toFixed(4)}:${validRadius}:${searchType}`;
  
  return await cachedSearch(
    cacheKey,
    async () => {
      // Select place types based on search type
      let includedTypesForSearch;
      switch (searchType) {
        case "food":
          includedTypesForSearch = foodTypes.slice(0, 10); // Limit to avoid API issues
          break;
        case "shopping":
          includedTypesForSearch = shoppingTypes.slice(0, 10);
          break;
        case "historical":
          includedTypesForSearch = historicalTypes.slice(0, 10);
          break;
        default:
          includedTypesForSearch = includedTypes.slice(0, 10);
      }

      const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY!,
          "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types,places.rating,places.priceLevel,places.photos,places.editorialSummary,places.websiteUri,places.nationalPhoneNumber",
        },
        body: JSON.stringify({
          includedTypes: includedTypesForSearch,
          maxResultCount: 20,
          locationRestriction: {
            circle: {
              center: { latitude, longitude },
              radius: validRadius,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Nearby search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.places?.map(mapGooglePlaceToActivity) || [];
    },
    15 * 60 * 1000
  );
};

// 3. Autocomplete - get place suggestions as user types
export const getGoogleMapsAutocomplete = async (
  input: string,
  latitude: number | undefined,
  longitude: number | undefined,
  radiusInMeters: number = 25000
) => {
  if (!input || input.trim().length < 2) {
    return [];
  }

  const { cachedSearch } = await import("@/lib/cache/searchCache");
  const cacheKey = `autocomplete:${input.trim().toLowerCase()}:${latitude || 'no-lat'}:${longitude || 'no-lng'}:${radiusInMeters}`;
  
  return await cachedSearch(
    cacheKey,
    async () => {
      const requestBody: any = {
        input: input.trim(),
      };

      // Add location bias if coordinates are provided
      if (latitude && longitude) {
        requestBody.locationBias = {
          circle: {
            center: { latitude, longitude },
            radius: radiusInMeters,
          },
        };
      }

      const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY!,
          "X-Goog-FieldMask": "suggestions.placePrediction.place,suggestions.placePrediction.structuredFormat,suggestions.placePrediction.types",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Autocomplete failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.suggestions) {
        return [];
      }

      return data.suggestions.map((suggestion: any) => ({
        placeId: suggestion.placePrediction.place,
        mainText: suggestion.placePrediction.structuredFormat.mainText.text,
        secondaryText: suggestion.placePrediction.structuredFormat.secondaryText.text,
        types: suggestion.placePrediction.types,
      }));
    },
    5 * 60 * 1000
  );
};

// 4. Place details - get detailed information about a specific place
export const fetchPlaceDetails = async (placeId: string): Promise<IActivity> => {
  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY!,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location,types,priceLevel,rating,editorialSummary,websiteUri,nationalPhoneNumber,photos",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch place details: ${response.status} ${response.statusText}`);
  }

  const place = await response.json();
  return mapGooglePlaceToActivity(place);
};

// 5. Simple geocoding - get coordinates for a city
export const fetchCityCoordinates = async (cityName: string, countryName: string) => {
  const GEOCODING_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_GEOCODING_API_KEY || GOOGLE_MAPS_API_KEY;
  const searchQuery = `${cityName}, ${countryName}`;
  const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    searchQuery
  )}&key=${GEOCODING_API_KEY}`;

  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = await geocodingResponse.json();

  if (!geocodingData.results || geocodingData.results.length === 0) {
    throw new Error(`No results found for: ${searchQuery}`);
  }

  const { lng: longitude, lat: latitude } = geocodingData.results[0].geometry.location;
  return { longitude, latitude };
};

// 6. Photo fetching - get place photos from Google Places API
export const getPlacePhotoAction = async (photoName: string, maxWidth?: number, maxHeight?: number) => {
  try {
    // Handle new Places API v1 photo references
    if (photoName.startsWith("places/")) {
      const params = new URLSearchParams({
        maxHeightPx: (maxHeight || 1000).toString(),
        maxWidthPx: (maxWidth || 1000).toString(),
      });

      const response = await fetch(`https://places.googleapis.com/v1/${photoName}/media?${params}`, {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY!,
          Referer: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch photo: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = response.headers.get("content-type") || "image/jpeg";

      return {
        success: true,
        data: `data:${contentType};base64,${base64}`,
      };
    } else {
      // Handle legacy photo references
      const params = new URLSearchParams({
        photoreference: photoName,
        maxwidth: (maxWidth || 1000).toString(),
        key: GOOGLE_MAPS_API_KEY!,
      });

      const response = await fetch(`https://maps.googleapis.com/maps/api/place/photo?${params}`, {
        headers: {
          Referer: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch legacy photo: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = response.headers.get("content-type") || "image/jpeg";

      return {
        success: true,
        data: `data:${contentType};base64,${base64}`,
      };
    }
  } catch (error) {
    console.error("Error fetching place photo:", error);
    return {
      success: false,
      error: "Failed to fetch photo",
    };
  }
};