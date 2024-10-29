"use server";

import axios from "axios";
import { excludedTypes } from "@/lib/googleMaps/excludedTypes";
import { IActivity, IReview } from "@/store/activityStore";
import { foodTypes, shoppingTypes, historicalTypes, SearchType, includedTypes } from "@/lib/googleMaps/includedTypes";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

export async function fetchCityCoordinates(cityName: string, countryName: string) {
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

  return { longitude, latitude };
}

function mapGooglePlaceToActivity(place: any): IActivity {
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

  const url = `https://places.googleapis.com/v1/places:searchNearby`;

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
    const response = await axios.post(url, requestBody, {
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
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
      },
    });
    console.log("response.data: ", response.data.places[0]);
    const activities: IActivity[] = response.data.places.map(mapGooglePlaceToActivity);
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
  const url = "https://places.googleapis.com/v1/places:autocomplete";

  try {
    const response = await axios.post(
      url,
      {
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
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
          "X-Goog-FieldMask": "suggestions",
        },
      }
    );
    console.log("response.data: ", response.data.suggestions[0].placePrediction);

    return response.data.suggestions.map((suggestion: any) => ({
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

    console.log("response.data: ", response.data);

    const place = response.data;
    // console.log("mapGooglePlaceToActivity(place); ", mapGooglePlaceToActivity(place));
    return mapGooglePlaceToActivity(place);
  } catch (error) {
    console.error("Error fetching place details:", error);
    throw error;
  }
};
