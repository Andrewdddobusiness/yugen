"use server";

import axios from "axios";
import { includedTypes } from "@/lib/googleMaps/includedTypes";
import { excludedTypes } from "@/lib/googleMaps/excludedTypes";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function fetchCityCoordinates(
  cityName: string,
  countryName: string
) {
  const searchQuery = `${cityName}, ${countryName}`;
  const geocodingUrl = `https://api.mapbox.com/search/searchbox/v1/forward?q=${encodeURIComponent(
    searchQuery
  )}&access_token=${process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}`;

  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = await geocodingResponse.json();

  if (!geocodingData.features || geocodingData.features.length === 0) {
    throw new Error(`No results found for: ${searchQuery}`);
  }

  const [longitude, latitude] = geocodingData.features[0].geometry.coordinates;
  console.log("LONG: ", longitude, "LONG: ", latitude);

  return { longitude, latitude };
}

export async function fetchNearbyActivities(
  latitude: number,
  longitude: number
) {
  const url = `https://places.googleapis.com/v1/places:searchNearby`;

  const requestBody = {
    includedTypes: includedTypes,
    excludedTypes: excludedTypes,
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: {
          latitude: latitude,
          longitude: longitude,
        },
        radius: 5000.0,
      },
    },
  };

  try {
    const response = await axios.post(url, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": [
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
      },
    });
    console.log("HERE: ", response.data.places);
    return response.data.places;
  } catch (error) {
    console.error("Error fetching nearby activities:", error);
    throw error;
  }
}
