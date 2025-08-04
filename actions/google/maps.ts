"use server";

import type { Coordinates, DatabaseResponse } from "@/types/database";

/**
 * Geocoding and reverse geocoding functions for Google Maps integration
 */

/**
 * Converts an address to coordinates using Google Geocoding API
 */
export async function geocodeAddress(address: string): Promise<DatabaseResponse<{
  coordinates: Coordinates;
  formatted_address: string;
  place_id: string;
}>> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_GEOCODING_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
      return {
        success: false,
        error: { message: "Google Maps API key not configured" }
      };
    }

    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: { 
          message: "Geocoding API request failed",
          code: response.status.toString(),
          details: data
        }
      };
    }

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return {
        success: false,
        error: { 
          message: `Geocoding failed: ${data.status}`,
          details: data
        }
      };
    }

    const result = data.results[0];
    const location = result.geometry.location;

    return {
      success: true,
      data: {
        coordinates: {
          lat: location.lat,
          lng: location.lng
        },
        formatted_address: result.formatted_address,
        place_id: result.place_id
      }
    };

  } catch (error: any) {
    console.error("Error in geocodeAddress:", error);
    return {
      success: false,
      error: { 
        message: error.message || "Geocoding failed",
        details: error
      }
    };
  }
}

/**
 * Converts coordinates to address using Google Reverse Geocoding API
 */
export async function reverseGeocode(coordinates: Coordinates): Promise<DatabaseResponse<{
  formatted_address: string;
  address_components: any[];
  place_id: string;
}>> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_GEOCODING_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
      return {
        success: false,
        error: { message: "Google Maps API key not configured" }
      };
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coordinates.lat},${coordinates.lng}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: { 
          message: "Reverse geocoding API request failed",
          code: response.status.toString(),
          details: data
        }
      };
    }

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return {
        success: false,
        error: { 
          message: `Reverse geocoding failed: ${data.status}`,
          details: data
        }
      };
    }

    const result = data.results[0];

    return {
      success: true,
      data: {
        formatted_address: result.formatted_address,
        address_components: result.address_components,
        place_id: result.place_id
      }
    };

  } catch (error: any) {
    console.error("Error in reverseGeocode:", error);
    return {
      success: false,
      error: { 
        message: error.message || "Reverse geocoding failed",
        details: error
      }
    };
  }
}

/**
 * Gets nearby places using Google Places API
 */
export async function getNearbyPlaces(
  location: Coordinates,
  radius: number,
  type?: string
): Promise<DatabaseResponse<any[]>> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
      return {
        success: false,
        error: { message: "Google Maps API key not configured" }
      };
    }

    // Use the existing fetchNearbyActivities function
    const { fetchNearbyActivities } = await import("@/actions/google/actions");
    
    const activities = await fetchNearbyActivities(
      location.lat,
      location.lng,
      radius,
      type as any
    );

    return {
      success: true,
      data: activities
    };

  } catch (error: any) {
    console.error("Error in getNearbyPlaces:", error);
    return {
      success: false,
      error: { 
        message: error.message || "Failed to fetch nearby places",
        details: error
      }
    };
  }
}

/**
 * Gets place photos using Google Places API
 */
/**
 * Search for places using Google Places API Text Search
 */
export async function searchPlaces(
  query: string,
  type?: string
): Promise<DatabaseResponse<any[]>> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
      return {
        success: false,
        error: { message: "Google Maps API key not configured" }
      };
    }

    const encodedQuery = encodeURIComponent(query);
    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodedQuery}&key=${apiKey}`;
    
    if (type) {
      url += `&type=${type}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: { 
          message: "Places search API request failed",
          code: response.status.toString(),
          details: data
        }
      };
    }

    if (data.status !== 'OK') {
      return {
        success: false,
        error: { 
          message: `Places search failed: ${data.status}`,
          details: data
        }
      };
    }

    return {
      success: true,
      data: data.results || []
    };

  } catch (error: any) {
    console.error("Error in searchPlaces:", error);
    return {
      success: false,
      error: { 
        message: error.message || "Failed to search places",
        details: error
      }
    };
  }
}

export async function getPlacePhotos(
  photoReferences: string[],
  maxWidth: number = 1000,
  maxHeight: number = 1000
): Promise<DatabaseResponse<string[]>> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
      return {
        success: false,
        error: { message: "Google Maps API key not configured" }
      };
    }

    if (!photoReferences || photoReferences.length === 0) {
      return {
        success: true,
        data: []
      };
    }

    // Use the existing getPlacePhotoAction function
    const { getPlacePhotoAction } = await import("@/actions/google/actions");
    
    const photoPromises = photoReferences.map(photoRef => 
      getPlacePhotoAction(photoRef, maxWidth, maxHeight)
    );

    const photoResults = await Promise.allSettled(photoPromises);
    
    const successfulPhotos = photoResults
      .filter((result): result is PromiseFulfilledResult<any> => 
        result.status === 'fulfilled' && result.value.success
      )
      .map(result => result.value.data);

    return {
      success: true,
      data: successfulPhotos
    };

  } catch (error: any) {
    console.error("Error in getPlacePhotos:", error);
    return {
      success: false,
      error: { 
        message: error.message || "Failed to fetch place photos",
        details: error
      }
    };
  }
}

/**
 * Searches for places with text query
 */
export async function searchPlacesByText(
  query: string,
  location?: Coordinates,
  radius?: number
): Promise<DatabaseResponse<any[]>> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
      return {
        success: false,
        error: { message: "Google Maps API key not configured" }
      };
    }

    const baseUrl = "https://places.googleapis.com/v1/places:searchText";
    
    const requestBody: any = {
      textQuery: query,
      maxResultCount: 20
    };

    // Add location bias if provided
    if (location) {
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: location.lat,
            longitude: location.lng,
          },
          radius: radius || 50000, // Default 50km
        },
      };
    }

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
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
          "places.nationalPhoneNumber",
        ].join(","),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      return {
        success: false,
        error: { 
          message: "Text search API request failed",
          code: response.status.toString()
        }
      };
    }

    const data = await response.json();
    
    const results = data.places?.map((place: any) => ({
      place_id: place.id,
      name: place.displayName?.text || "",
      address: place.formattedAddress || "",
      coordinates: place.location ? {
        lat: place.location.latitude,
        lng: place.location.longitude
      } : null,
      types: place.types || [],
      price_level: place.priceLevel || null,
      rating: place.rating || null,
      description: place.editorialSummary?.text || "",
      website_url: place.websiteUri || "",
      phone_number: place.nationalPhoneNumber || "",
      photo_names: place.photos ? place.photos.map((photo: any) => photo.name) : [],
      source: "google_text_search"
    })) || [];

    return {
      success: true,
      data: results
    };

  } catch (error: any) {
    console.error("Error in searchPlacesByText:", error);
    return {
      success: false,
      error: { 
        message: error.message || "Text search failed",
        details: error
      }
    };
  }
}

/**
 * Gets autocomplete suggestions for place search
 */
export async function getPlaceAutocomplete(
  input: string,
  location?: Coordinates,
  radius?: number
): Promise<DatabaseResponse<any[]>> {
  try {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
      return {
        success: false,
        error: { message: "Google Maps API key not configured" }
      };
    }

    if (!input || input.trim().length < 2) {
      return {
        success: true,
        data: []
      };
    }

    // Use the existing getGoogleMapsAutocomplete function
    const { getGoogleMapsAutocomplete } = await import("@/actions/google/actions");
    
    const suggestions = await getGoogleMapsAutocomplete(
      input.trim(),
      location?.lat,
      location?.lng,
      radius || 50000
    );

    return {
      success: true,
      data: suggestions
    };

  } catch (error: any) {
    console.error("Error in getPlaceAutocomplete:", error);
    return {
      success: false,
      error: { 
        message: error.message || "Autocomplete failed",
        details: error
      }
    };
  }
}