"use server";

import axios from "axios";
import { excludedTypes } from "@/lib/googleMaps/excludedTypes";
import { IActivity, IReview } from "@/store/activityStore";
import { foodTypes, shoppingTypes, historicalTypes, SearchType, includedTypes } from "@/lib/googleMaps/includedTypes";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const GOOGLE_MAPS_GEOCODING_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_GEOCODING_API_KEY;

export async function getPlacePhotoAction(photoName: string, maxWidth?: number, maxHeight?: number) {
  try {
    let response;

    // Check if it's a Places API v1 photo reference
    if (photoName.startsWith("places/")) {
      const baseUrl = "https://places.googleapis.com/v1";
      const params = new URLSearchParams({
        maxHeightPx: (maxHeight || 1000).toString(),
        maxWidthPx: (maxWidth || 1000).toString(),
      });

      response = await fetch(`${baseUrl}/${photoName}/media?${params}`, {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
          Referer: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        },
      });

      if (!response.ok) {
        console.error("Photo fetch failed:", {
          status: response.status,
          statusText: response.statusText,
          photoName,
        });
        throw new Error(`Failed to fetch photo: ${response.statusText}`);
      }
    } else {
      // For legacy photo references
      const baseUrl = "https://maps.googleapis.com/maps/api/place/photo";
      const params = new URLSearchParams({
        photoreference: photoName,
        maxwidth: (maxWidth || 1000).toString(),
        key: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
      });

      response = await fetch(`${baseUrl}?${params}`, {
        headers: {
          Referer: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        },
      });

      if (!response.ok) {
        console.error("Legacy photo fetch failed:", {
          status: response.status,
          statusText: response.statusText,
          photoName,
        });
        throw new Error(`Failed to fetch legacy photo: ${response.statusText}`);
      }
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return {
      success: true,
      data: `data:${contentType};base64,${base64}`,
    };
  } catch (error) {
    console.error("Error fetching place photo:", error);
    return {
      success: false,
      error: "Failed to fetch photo",
    };
  }
}

export async function fetchCityCoordinates(cityName: string, countryName: string) {
  const searchQuery = `${cityName}, ${countryName}`;
  const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    searchQuery
  )}&key=${GOOGLE_MAPS_GEOCODING_API_KEY}`;

  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = await geocodingResponse.json();

  if (!geocodingData.results || geocodingData.results.length === 0) {
    throw new Error(`No results found for: ${searchQuery}`);
  }

  const { lng: longitude, lat: latitude } = geocodingData.results[0].geometry.location;

  return { longitude, latitude };
}

function mapGooglePlaceToActivity(place: any) {
  return {
    place_id: place.id,
    name: place.displayName?.text || "",
    coordinates: [place.location.latitude, place.location.longitude],
    types: place.types || "",
    price_level: place.priceLevel ? place.priceLevel : "",
    address: place.formattedAddress || "",
    rating: place.rating || null,
    description: place.editorialSummary?.text || "",
    google_maps_url: `https://www.google.com/maps/place/?q=place_id:${place.id}`,
    website_url: place.websiteUri || "",
    photo_names: place.photos ? place.photos.map((photo: any) => `${photo.name}`) : [],
    duration: null,
    phone_number: place.nationalPhoneNumber || "",
    reviews: place.reviews
      ? place.reviews.map(
          (review: any): IReview => ({
            description: typeof review.text === "object" ? review.text.text : review.text,
            rating: review.rating || null,
            author: review.authorAttribution.displayName || "",
            uri: review.authorAttribution.uri || "",
            publish_date_time: review.publishTime || "",
          })
        )
      : [],
    open_hours: place.currentOpeningHours?.periods
      ? place.currentOpeningHours?.periods.map((period: any) => ({
          day: period.open.day,
          open_hour: period.open.hour,
          open_minute: period.open.minute,
          close_hour: period.close.hour,
          close_minute: period.close.minute,
        }))
      : [],
  };
}

export const fetchNearbyActivities = async (
  latitude: number | undefined,
  longitude: number | undefined,
  radiusInMeters: number,
  searchType: SearchType = "all"
) => {
  if (typeof latitude !== "number" || typeof longitude !== "number") {
    throw new Error("Invalid coordinates provided");
  }

  let includedTypesForSearch;
  switch (searchType) {
    case "food":
      includedTypesForSearch = foodTypes;
      break;
    case "shopping":
      includedTypesForSearch = shoppingTypes;
      break;
    case "historical":
      includedTypesForSearch = historicalTypes;
      break;
    default:
      includedTypesForSearch = includedTypes;
  }

  const baseUrl = "https://places.googleapis.com/v1/places:searchNearby";

  const requestBody = {
    includedTypes: includedTypesForSearch,
    excludedTypes: excludedTypes,
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: {
          latitude: latitude,
          longitude: longitude,
        },
        radius: radiusInMeters,
      },
    },
  };

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        "X-Goog-FieldMask": [
          "places.id",
          "places.displayName",
          "places.formattedAddress",
          "places.location",
          "places.photos",
          "places.types",
          "places.currentOpeningHours",
          "places.nationalPhoneNumber",
          "places.priceLevel",
          "places.rating",
          "places.editorialSummary",
          "places.reviews",
          "places.websiteUri",
        ].join(","),
        Referer: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch nearby activities: ${response.statusText}`);
    }

    const data = await response.json();
    const activities: IActivity[] = data.places.map(mapGooglePlaceToActivity);

    return activities;
  } catch (error) {
    console.error("Error fetching nearby activities:", error);
    throw error;
  }
};

export async function getGoogleMapsAutocomplete(
  input: string,
  latitude: number | undefined,
  longitude: number | undefined,
  radiusInMeters: number
) {
  const baseUrl = "https://places.googleapis.com/v1/places:autocomplete";

  const requestBody = {
    input: input,
    locationBias: {
      circle: {
        center: {
          latitude: latitude,
          longitude: longitude,
        },
        radius: radiusInMeters,
      },
    },
  };

  try {
    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
        "X-Goog-FieldMask": [
          "suggestions.placePrediction.place",
          "suggestions.placePrediction.structuredFormat",
          "suggestions.placePrediction.types",
        ].join(","),
        Referer: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch autocomplete results: ${response.statusText}`);
    }

    const data = await response.json();
    return data.suggestions.map((suggestion: any) => ({
      placeId: suggestion.placePrediction.place,
      mainText: suggestion.placePrediction.structuredFormat.mainText.text,
      secondaryText: suggestion.placePrediction.structuredFormat.secondaryText.text,
      types: suggestion.placePrediction.types,
    }));
  } catch (error) {
    console.error("Error fetching autocomplete results:", error);
    return [];
  }
}

export const fetchPlaceDetails = async (placeId: string): Promise<IActivity> => {
  try {
    const url = `https://places.googleapis.com/v1/places/${placeId}`;
    const response = await axios.get(url, {
      headers: {
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": [
          "id",
          "displayName",
          "formattedAddress",
          "location",
          "types",
          "priceLevel",
          "rating",
          "editorialSummary",
          "websiteUri",
          "nationalPhoneNumber",
          "photos",
          "currentOpeningHours",
          "reviews",
        ].join(","),
      },
    });

    // console.log("response.data: ", response.data);

    const place = response.data;
    const activity = mapGooglePlaceToActivity(place);
    // Ensure coordinates is a tuple of [number, number]
    if (!Array.isArray(activity.coordinates) || activity.coordinates.length !== 2) {
      throw new Error("Invalid coordinates format");
    }
    return activity as IActivity;
  } catch (error) {
    console.error("Error fetching place details:", error);
    throw error;
  }
};

export async function fetchAreaActivities(areaName: string, cityName: string, polygonCoordinates: number[][]) {
  try {
    const bounds = polygonCoordinates.reduce(
      (acc, coord) => ({
        north: Math.max(acc.north, coord[1]),
        south: Math.min(acc.south, coord[1]),
        east: Math.max(acc.east, coord[0]),
        west: Math.min(acc.west, coord[0]),
      }),
      { north: -90, south: 90, east: -180, west: 180 }
    );

    // Calculate center point of the polygon
    const center = {
      latitude: (bounds.north + bounds.south) / 2,
      longitude: (bounds.east + bounds.west) / 2,
    };

    // Calculate radius in meters (approximate distance from center to corner)
    const radius = Math.max(
      getDistanceFromLatLonInMeters(center.latitude, center.longitude, bounds.north, bounds.east),
      getDistanceFromLatLonInMeters(center.latitude, center.longitude, bounds.south, bounds.west)
    );

    const url = "https://places.googleapis.com/v1/places:searchNearby";
    const response = await axios.post(
      url,
      {
        locationRestriction: {
          circle: {
            center: center,
            radius: radius,
          },
        },
        includedTypes: includedTypes,
        maxResultCount: 20,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.types",
            "places.priceLevel",
            "places.rating",
            "places.editorialSummary",
            "places.websiteUri",
            "places.photos",
            "places.currentOpeningHours",
          ].join(","),
          Referer: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        },
      }
    );

    const activities = response.data.places.map(mapGooglePlaceToActivity);

    // Filter results to only include places within the polygon
    return activities.filter((activity: any) =>
      isPointInPolygon([activity.coordinates[1], activity.coordinates[0]], polygonCoordinates)
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Error fetching area activities:", {
        status: error.response?.status,
        message: error.response?.data?.error?.message || error.message,
      });
    } else {
      console.error("Error fetching area activities:", error);
    }
    throw error;
  }
}

// Helper function to calculate distance between two points in meters
function getDistanceFromLatLonInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Helper function to check if a point is inside a polygon
function isPointInPolygon(point: number[], polygon: number[][]) {
  const [x, y] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}
