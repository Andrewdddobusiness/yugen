// Database table types based on our Supabase schema

export interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  timezone: string;
  preferences: Record<string, any>;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Country {
  country_id: number;
  country_name: string;
  country_code: string | null;
  created_at: string;
}

export interface City {
  city_id: number;
  city_name: string;
  city_description: string | null;
  country_id: number | null;
  broadband_speed: string | null;
  mobile_speed: string | null;
  plugs: string | null;
  voltage: string | null;
  power_standard: string | null;
  frequency: string | null;
  emergency_fire: string | null;
  emergency_police: string | null;
  emergency_ambulance: string | null;
  created_at: string;
}

export interface Itinerary {
  itinerary_id: number;
  user_id: string;
  title: string | null;
  description: string | null;
  adults: number;
  kids: number;
  budget: number | null;
  currency: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ItineraryDestination {
  itinerary_destination_id: number;
  itinerary_id: number;
  destination_city_id: number | null;
  city: string;
  country: string;
  from_date: string;
  to_date: string;
  order_number: number;
  accommodation_notes: string | null;
  transportation_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  activity_id: number;
  place_id: string;
  name: string;
  coordinates: { x: number; y: number } | null; // PostgreSQL point type
  types: string[];
  price_level: string | null;
  address: string | null;
  rating: number | null;
  description: string | null;
  google_maps_url: string | null;
  website_url: string | null;
  photo_names: string[];
  duration: string | null; // PostgreSQL interval type
  phone_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  review_id: number;
  activity_id: number;
  description: string | null;
  rating: number | null;
  author: string | null;
  uri: string | null;
  publish_date_time: string | null;
  created_at: string;
}

export interface OpenHours {
  open_hours_id: number;
  activity_id: number;
  day: number; // 0 = Sunday, 1 = Monday, etc.
  open_hour: number | null;
  open_minute: number | null;
  close_hour: number | null;
  close_minute: number | null;
  created_at: string;
}

export interface ItineraryActivity {
  itinerary_activity_id: number;
  itinerary_id: number;
  itinerary_destination_id: number;
  activity_id: number;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  travel_mode_to_next?: string | null;
  is_booked: boolean;
  booking_reference: string | null;
  cost: number | null;
  order_in_day: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ItinerarySearchHistory {
  search_history_id: number;
  itinerary_id: number;
  itinerary_destination_id: number;
  place_id: string;
  searched_at: string;
}

export interface ItineraryCustomEvent {
  itinerary_custom_event_id: number;
  itinerary_id: number;
  itinerary_destination_id: number | null;
  title: string;
  notes: string | null;
  date: string | null;
  start_time: string | null;
  end_time: string | null;
  color_hex: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Extended types with joins
export interface ItineraryWithDestinations extends Itinerary {
  destinations: ItineraryDestination[];
}

export interface ActivityWithDetails extends Activity {
  reviews: Review[];
  open_hours: OpenHours[];
}

export interface ItineraryActivityWithActivity extends ItineraryActivity {
  activity: ActivityWithDetails;
}

// API Response types
export interface DatabaseResponse<T> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  success: boolean;
}

// Coordinate types for Google Maps integration
export interface Coordinates {
  lat: number;
  lng: number;
}
