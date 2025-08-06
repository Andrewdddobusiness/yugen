import { z } from "zod";
import type { ActivityWithDetails } from "@/types/database";

// Validation schemas
export const addToWishlistSchema = z.object({
  place_id: z.string().min(1, "Place ID is required"),
  notes: z.string().max(500, "Notes too long").optional(),
  priority: z.number().min(1).max(5).default(3),
  categories: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  visit_status: z.enum(['want_to_go', 'been_there', 'not_interested']).default('want_to_go'),
});

export const updateWishlistSchema = addToWishlistSchema.partial();

// Types
export type AddToWishlistData = z.infer<typeof addToWishlistSchema>;
export type UpdateWishlistData = z.infer<typeof updateWishlistSchema>;

export interface WishlistItem {
  wishlist_id: number;
  user_id: string;
  place_id: string;
  notes?: string;
  priority: number;
  categories: string[];
  tags: string[];
  visit_status: string;
  saved_at: string;
  updated_at: string;
}

export interface WishlistItemWithActivity extends WishlistItem {
  activity?: ActivityWithDetails;
}

// Legacy aliases for backward compatibility
export const addToUserWishlistSchema = addToWishlistSchema;
export const updateUserWishlistSchema = updateWishlistSchema;
export type AddToUserWishlistData = AddToWishlistData;
export type UpdateUserWishlistData = UpdateWishlistData;
export type UserWishlistItem = WishlistItem;
export type UserWishlistItemWithActivity = WishlistItemWithActivity;