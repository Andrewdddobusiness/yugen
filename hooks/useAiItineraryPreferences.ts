"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  getAiItineraryPreferencesFromProfile,
  type AiItineraryPreferencesV1,
} from "@/lib/ai/itinerary/intelligence/preferences";
import {
  updateAiItineraryPreferences,
  type UpdateAiItineraryPreferencesInput,
} from "@/actions/supabase/profilePreferences";

export function useAiItineraryPreferences(args: { userId?: string | null }) {
  const userId = args.userId ?? null;
  const [preferences, setPreferences] = useState<AiItineraryPreferencesV1 | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.from("profiles").select("preferences").eq("user_id", userId).maybeSingle();
      if (error) throw error;

      const prefs = getAiItineraryPreferencesFromProfile((data as any)?.preferences);
      setPreferences(prefs);
    } catch (err: any) {
      setError(err?.message ? String(err.message) : "Failed to load preferences");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const savePreferences = useCallback(async (update: UpdateAiItineraryPreferencesInput) => {
    setError(null);
    const result = await updateAiItineraryPreferences(update);
    if (!result.success) {
      setError(result.message ?? "Failed to update preferences");
      return result;
    }
    setPreferences(result.data ?? null);
    return result;
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    refresh: fetchPreferences,
    update: savePreferences,
  };
}

