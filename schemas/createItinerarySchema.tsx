import { z } from "zod";

export const itinerarySchema = z.object({
  user_id: z.string().uuid(),
});

export const itineraryDestinationsSchema = z.object({
  itinerary_id: z.number(),
  origin_city_id: z.number(),
  destination_city_id: z.number(),
  from_date: z.date(),
  to_date: z.date(),
  meals: z.any(),
});
