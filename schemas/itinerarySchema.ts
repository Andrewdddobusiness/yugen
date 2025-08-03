import { z } from "zod";

// Base itinerary schema
export const createItinerarySchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title too long"),
  description: z.string().max(500, "Description too long").optional(),
  adults: z.number().min(1, "At least 1 adult required").max(20, "Too many adults"),
  kids: z.number().min(0, "Kids cannot be negative").max(20, "Too many kids"),
  budget: z.number().positive("Budget must be positive").optional(),
  currency: z.string().length(3, "Invalid currency code").default("USD"),
  is_public: z.boolean().default(false),
});

export const updateItinerarySchema = createItinerarySchema.partial();

// Base destination schema without refinement
const baseDestinationSchema = z.object({
  city: z.string().min(1, "City is required").max(100, "City name too long"),
  country: z.string().min(1, "Country is required").max(100, "Country name too long"),
  from_date: z.date({ required_error: "Start date is required" }),
  to_date: z.date({ required_error: "End date is required" }),
  order_number: z.number().min(1, "Order must be positive").default(1),
  accommodation_notes: z.string().max(500, "Notes too long").optional(),
  transportation_notes: z.string().max(500, "Notes too long").optional(),
});

// Create destination schema with refinement
export const createDestinationSchema = baseDestinationSchema.refine(
  (data) => data.to_date >= data.from_date, 
  {
    message: "End date must be after start date",
    path: ["to_date"],
  }
);

// Update destination schema (partial of base schema without refinement)
export const updateDestinationSchema = baseDestinationSchema.partial();

// Types derived from schemas
export type CreateItineraryData = z.infer<typeof createItinerarySchema>;
export type UpdateItineraryData = z.infer<typeof updateItinerarySchema>;
export type CreateDestinationData = z.infer<typeof createDestinationSchema>;
export type UpdateDestinationData = z.infer<typeof updateDestinationSchema>;