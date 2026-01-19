"use server";

import { z } from "zod";
import { createClient } from "@/utils/supabase/server";
import {
  AiItineraryPreferencesV1Schema,
  getAiItineraryPreferencesFromProfile,
  type AiItineraryPreferencesV1,
  type ItineraryInterest,
  type ItineraryPace,
  type ItineraryTravelMode,
} from "@/lib/ai/itinerary/intelligence/preferences";
import { toJsonSafe } from "@/lib/security/toJsonSafe";

export type UpdateAiItineraryPreferencesInput = {
  pace?: ItineraryPace | null;
  dayStart?: string | null;
  dayEnd?: string | null;
  interests?: ItineraryInterest[] | null;
  travelMode?: ItineraryTravelMode | null;
};

const UpdateSchema = z.object({
  pace: z.enum(["relaxed", "balanced", "packed"]).nullable().optional(),
  dayStart: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  dayEnd: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  interests: z
    .array(z.enum(["shopping", "sights", "museums", "food", "nightlife", "nature"]))
    .max(10)
    .nullable()
    .optional(),
  travelMode: z.enum(["walking", "driving", "transit", "bicycling"]).nullable().optional(),
});

const removeNulls = (value: unknown): unknown => {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(removeNulls);

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === null) continue;
    out[key] = removeNulls(v);
  }
  return out;
};

export async function getAiItineraryPreferences(): Promise<{
  success: boolean;
  data?: AiItineraryPreferencesV1 | null;
  message?: string;
  error?: unknown;
}> {
  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user) {
    return { success: false, message: "User not authenticated" };
  }

  try {
    const { data, error } = await supabase.from("profiles").select("preferences").eq("user_id", auth.user.id).maybeSingle();
    if (error) {
      return { success: false, message: "Failed to load profile preferences", error: toJsonSafe(error) };
    }

    const prefs = getAiItineraryPreferencesFromProfile((data as any)?.preferences);
    return { success: true, data: prefs };
  } catch (error) {
    return { success: false, message: "Failed to load profile preferences", error: toJsonSafe(error) };
  }
}

export async function updateAiItineraryPreferences(
  input: UpdateAiItineraryPreferencesInput
): Promise<{
  success: boolean;
  data?: AiItineraryPreferencesV1;
  message?: string;
  error?: unknown;
}> {
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: "Invalid preferences", error: parsed.error.format() };
  }

  const supabase = createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user) {
    return { success: false, message: "User not authenticated" };
  }

  try {
    const { data: row, error: fetchError } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (fetchError) {
      return { success: false, message: "Failed to load existing preferences", error: toJsonSafe(fetchError) };
    }

    const existingPreferences = (row as any)?.preferences;
    const existingRecord = existingPreferences && typeof existingPreferences === "object" ? (existingPreferences as Record<string, any>) : {};
    const existingAi = getAiItineraryPreferencesFromProfile(existingRecord);

    const nextAi: AiItineraryPreferencesV1 = {
      version: 1,
      ...(existingAi ?? {}),
    };

    const applyField = <K extends keyof UpdateAiItineraryPreferencesInput>(key: K, apply: (value: any) => void) => {
      if (!(key in parsed.data)) return;
      apply((parsed.data as any)[key]);
    };

    applyField("pace", (value) => {
      if (value === null) delete (nextAi as any).pace;
      else nextAi.pace = value;
    });
    applyField("dayStart", (value) => {
      if (value === null) delete (nextAi as any).day_start;
      else nextAi.day_start = value;
    });
    applyField("dayEnd", (value) => {
      if (value === null) delete (nextAi as any).day_end;
      else nextAi.day_end = value;
    });
    applyField("interests", (value) => {
      if (value === null) delete (nextAi as any).interests;
      else nextAi.interests = value;
    });
    applyField("travelMode", (value) => {
      if (value === null) delete (nextAi as any).travel_mode;
      else nextAi.travel_mode = value;
    });

    const validatedAi = AiItineraryPreferencesV1Schema.parse(removeNulls(nextAi));
    const nextPreferences = {
      ...existingRecord,
      ai_itinerary: validatedAi,
    };

    const { error: writeError } = await supabase.from("profiles").upsert({
      user_id: auth.user.id,
      preferences: nextPreferences,
      updated_at: new Date().toISOString(),
    });

    if (writeError) {
      return { success: false, message: "Failed to update preferences", error: toJsonSafe(writeError) };
    }

    return { success: true, data: validatedAi };
  } catch (error) {
    return { success: false, message: "Failed to update preferences", error: toJsonSafe(error) };
  }
}

