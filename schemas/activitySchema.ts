import { z } from "zod";

// Activity/Place schema
export const createActivitySchema = z.object({
  place_id: z.string().min(1, "Place ID is required"),
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).optional(),
  types: z.array(z.string()).default([]),
  price_level: z.string().max(10).optional(),
  address: z.string().max(300).optional(),
  rating: z.number().min(0).max(5).optional(),
  description: z.string().max(1000).optional(),
  google_maps_url: z.string().url().optional(),
  website_url: z.string().url().optional(),
  photo_names: z.array(z.string()).default([]),
  duration: z.number().positive("Duration must be positive").optional(), // in minutes
  phone_number: z.string().max(50).optional(),
});

export const scheduleActivitySchema = z.object({
  itinerary_id: z.number().positive("Invalid itinerary ID"),
  itinerary_destination_id: z.number().positive("Invalid destination ID"),
  activity_id: z.number().positive("Invalid activity ID"),
  date: z.date({ required_error: "Date is required" }),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  end_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  notes: z.string().max(500, "Notes too long").optional(),
  cost: z.number().positive("Cost must be positive").optional(),
  order_in_day: z.number().positive("Order must be positive").optional(),
}).refine((data) => data.end_time > data.start_time, {
  message: "End time must be after start time",
  path: ["end_time"],
});

export const updateActivityScheduleSchema = scheduleActivitySchema.partial().omit({
  itinerary_id: true,
  itinerary_destination_id: true,
  activity_id: true,
});

export const addToWishlistSchema = z.object({
  place_id: z.string().min(1, "Place ID is required"),
  itinerary_id: z.number().positive("Invalid itinerary ID").optional(),
  notes: z.string().max(500, "Notes too long").optional(),
  priority: z.number().min(1).max(5).default(3),
});

// Types derived from schemas
export type CreateActivityData = z.infer<typeof createActivitySchema>;
export type ScheduleActivityData = z.infer<typeof scheduleActivitySchema>;
export type UpdateActivityScheduleData = z.infer<typeof updateActivityScheduleSchema>;
export type AddToWishlistData = z.infer<typeof addToWishlistSchema>;