"use server";
import { createClient } from "@/utils/supabase/client";
import axios from "axios";
import { IActivity } from "@/store/activityStore";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

const supabase = createClient();

interface TopPlace {
  city: string;
  country: string;
  activityName: string;
}

export async function insertTopPlaces(topPlaces: TopPlace[]) {
  for (const place of topPlaces) {
    const { city, country, activityName } = place;

    // Step 1: Get place details from Google Places API
    const placeDetails = await getPlaceDetails(city, country, activityName);

    if (!placeDetails) {
      console.error(`Failed to fetch details for ${activityName} in ${city}, ${country}`);
      continue;
    }

    // Step 2: Insert or update country
    const { data: countryData, error: countryError } = await supabase
      .from("country")
      .upsert({ country_name: country })
      .select("country_id")
      .single();

    if (countryError || !countryData) {
      console.error(`Failed to insert/update country: ${country}`, countryError);
      continue;
    }

    // Step 3: Insert or update city
    const { data: cityData, error: cityError } = await supabase
      .from("city")
      .upsert({ city_name: city, country_id: countryData.country_id })
      .select("city_id")
      .single();

    if (cityError || !cityData) {
      console.error(`Failed to insert/update city: ${city}`, cityError);
      continue;
    }

    // Step 4: Check if activity already exists
    const { data: existingActivity, error: existingActivityError } = await supabase
      .from("activity")
      .select("activity_id")
      .eq("place_id", placeDetails.place_id)
      .single();

    if (existingActivityError && existingActivityError.code !== "PGRST116") {
      console.error(`Error checking existing activity: ${activityName}`, existingActivityError);
      continue;
    }

    let activityId: string;

    if (existingActivity) {
      // Activity exists, update it
      const { data: updatedActivity, error: updateError } = await supabase
        .from("activity")
        .update({
          name: placeDetails.name,
          types: placeDetails.types,
          price_level: placeDetails.price_level,
          address: placeDetails.address,
          rating: placeDetails.rating,
          description: placeDetails.description,
          google_maps_url: placeDetails.google_maps_url,
          website_url: placeDetails.website_url,
          photo_names: placeDetails.photo_names,
          duration: placeDetails.duration,
          phone_number: placeDetails.phone_number,
          coordinates: placeDetails.coordinates,
          is_top_place: true,
        })
        .eq("activity_id", existingActivity.activity_id)
        .select("activity_id")
        .single();

      if (updateError) {
        console.error(`Failed to update activity: ${activityName}`, updateError);
        continue;
      }
      activityId = updatedActivity.activity_id;
    } else {
      // Activity doesn't exist, insert it
      const { data: newActivity, error: insertError } = await supabase
        .from("activity")
        .insert({
          place_id: placeDetails.place_id,
          city_id: cityData.city_id,
          name: placeDetails.name,
          types: placeDetails.types,
          price_level: placeDetails.price_level,
          address: placeDetails.address,
          rating: placeDetails.rating,
          description: placeDetails.description,
          google_maps_url: placeDetails.google_maps_url,
          website_url: placeDetails.website_url,
          photo_names: placeDetails.photo_names,
          duration: placeDetails.duration,
          phone_number: placeDetails.phone_number,
          coordinates: placeDetails.coordinates,
          is_top_place: true,
        })
        .select("activity_id")
        .single();

      if (insertError) {
        console.error(`Failed to insert activity: ${activityName}`, insertError);
        continue;
      }
      activityId = newActivity.activity_id;
    }

    // Step 5: Insert or update reviews
    if (placeDetails.reviews && placeDetails.reviews.length > 0) {
      const { error: reviewError } = await supabase.from("review").upsert(
        placeDetails.reviews.map((review) => ({
          activity_id: activityId,
          description: review.description,
          rating: review.rating,
          author: review.author,
          uri: review.uri,
          publish_date_time: review.publish_date_time,
        }))
      );

      if (reviewError) {
        console.error(`Failed to insert/update reviews for ${activityName}`, reviewError);
      }
    }

    // Step 6: Insert or update open hours
    if (placeDetails.open_hours && placeDetails.open_hours.length > 0) {
      const { error: openHoursError } = await supabase.from("open_hours").upsert(
        placeDetails.open_hours.map((hours) => ({
          activity_id: activityId,
          day: hours.day,
          open_hour: hours.open_hour,
          open_minute: hours.open_minute,
          close_hour: hours.close_hour,
          close_minute: hours.close_minute,
        }))
      );

      if (openHoursError) {
        console.error(`Failed to insert/update open hours for ${activityName}`, openHoursError);
      }
    }

    console.log(`Successfully processed top place: ${activityName} in ${city}, ${country}`);
  }
}

async function getPlaceDetails(city: string, country: string, activityName: string): Promise<IActivity | null> {
  try {
    // Step 1: Find the place ID
    const findPlaceUrl = `https://places.googleapis.com/v1/places:searchText`;
    const findPlaceResponse = await axios.post(
      findPlaceUrl,
      {
        textQuery: `${activityName} in ${city}, ${country}`,
        languageCode: "en",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": "places.id",
        },
      }
    );

    const placeId = findPlaceResponse.data.places[0]?.id;
    if (!placeId) {
      console.error(`Place ID not found for ${activityName} in ${city}, ${country}`);
      return null;
    }

    // Step 2: Get place details
    const placeDetailsUrl = `https://places.googleapis.com/v1/places/${placeId}`;
    const placeDetailsResponse = await axios.get(placeDetailsUrl, {
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

    const place = placeDetailsResponse.data;

    return {
      place_id: place.id,
      name: place.displayName?.text || "",
      coordinates: [place.location.latitude, place.location.longitude],
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
      reviews: place.reviews
        ? place.reviews.map((review: any) => ({
            description: typeof review.text === "object" ? review.text.text : review.text,
            rating: review.rating || null,
            author: review.authorAttribution.displayName || "",
            uri: review.authorAttribution.uri || "",
            publish_date_time: review.publishTime || "",
          }))
        : [],
      open_hours: place.currentOpeningHours?.periods
        ? place.currentOpeningHours.periods.map((period: any) => ({
            day: period.open.day,
            open_hour: period.open.hour,
            open_minute: period.open.minute,
            close_hour: period.close?.hour,
            close_minute: period.close?.minute,
          }))
        : [],
      is_top_place: true,
    };
  } catch (error) {
    console.error("Error fetching place details:", error);
    return null;
  }
}
