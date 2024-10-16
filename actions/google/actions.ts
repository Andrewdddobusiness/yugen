"use server";

import axios from "axios";
import { includedTypes } from "@/lib/googleMaps/includedTypes";
import { excludedTypes } from "@/lib/googleMaps/excludedTypes";
import { IActivity, IReview } from "@/store/activityStore";

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

function mapGooglePlaceToActivity(place: any): IActivity {
  return {
    place_id: place.id,
    name: place.displayName?.text || "",
    types: place.types || "",
    price_level: place.priceLevel ? place.priceLevel : "",
    address: place.formattedAddress || "",
    rating: place.rating || null,
    description: place.editorialSummary?.text || "",
    google_maps_url: `https://www.google.com/maps/place/?q=place_id:${place.id}`,
    website_url: place.websiteUri || "",
    photo_names: place.photos
      ? place.photos.map((photo: any) => `${photo.name}`)
      : [],
    duration: null,
    phone_number: place.nationalPhoneNumber || "",
    reviews: place.reviews
      ? place.reviews.map(
          (review: any): IReview => ({
            description:
              typeof review.text === "object" ? review.text.text : review.text,
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
    // console.log("HERE: ", response.data.places[0].reviews);

    const activities: IActivity[] = response.data.places.map(
      mapGooglePlaceToActivity
    );
    // console.log("Mapped activities:", activities[0]);
    return activities;
  } catch (error) {
    console.error("Error fetching nearby activities:", error);
    throw error;
  }
}
