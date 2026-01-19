"use server";

import { z } from "zod";
import { revalidateTag } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { builderBootstrapTag } from "@/lib/cacheTags";
import {
  ITINERARY_CUSTOM_EVENT_KIND_VALUES,
  type ItineraryCustomEventKind,
} from "@/lib/customEvents/kinds";
import type { DatabaseResponse, ItineraryCustomEvent } from "@/types/database";

const DATE_STRING = /^\d{4}-\d{2}-\d{2}$/;
const TIME_STRING = /^\d{2}:\d{2}(:\d{2})?$/;

const toTimeString = (value: string) => (value.length === 5 ? `${value}:00` : value);

const itineraryCustomEventKindSchema = z.enum(
  [...ITINERARY_CUSTOM_EVENT_KIND_VALUES] as [ItineraryCustomEventKind, ...ItineraryCustomEventKind[]]
);

function getSupabaseErrorSummary(
  error: unknown
): { code?: string; message?: string; details?: string; hint?: string } {
  if (!error || typeof error !== "object") return { message: error ? String(error) : undefined };
  const anyError = error as any;
  return {
    code: typeof anyError.code === "string" ? anyError.code : undefined,
    message: typeof anyError.message === "string" ? anyError.message : undefined,
    details: typeof anyError.details === "string" ? anyError.details : undefined,
    hint: typeof anyError.hint === "string" ? anyError.hint : undefined,
  };
}

const isMissingColumn = (error: unknown, column: string) => {
  if (!error || typeof error !== "object") return false;
  const summary = getSupabaseErrorSummary(error);
  const code = String(summary.code ?? "");
  if (code !== "42703") return false;
  const message = String(summary.message ?? "").toLowerCase();
  return message.includes(column.toLowerCase());
};

const CUSTOM_EVENT_SELECT_WITH_KIND =
  "itinerary_custom_event_id,itinerary_id,itinerary_destination_id,kind,title,notes,date,start_time,end_time,color_hex,created_by,updated_by,created_at,updated_at,deleted_at";
const CUSTOM_EVENT_SELECT_LEGACY =
  "itinerary_custom_event_id,itinerary_id,itinerary_destination_id,title,notes,date,start_time,end_time,color_hex,created_by,updated_by,created_at,updated_at,deleted_at";

const createCustomEventSchema = z.object({
  itinerary_id: z.number().int().positive(),
  itinerary_destination_id: z.number().int().positive().nullable().optional(),
  kind: itineraryCustomEventKindSchema.optional(),
  title: z.string().trim().min(1).max(140),
  notes: z.string().trim().max(2000).nullable().optional(),
  date: z.string().regex(DATE_STRING),
  start_time: z.string().regex(TIME_STRING),
  end_time: z.string().regex(TIME_STRING),
  color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
});

const updateCustomEventSchema = z.object({
  kind: itineraryCustomEventKindSchema.optional(),
  title: z.string().trim().min(1).max(140).optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  date: z.string().regex(DATE_STRING).nullable().optional(),
  start_time: z.string().regex(TIME_STRING).nullable().optional(),
  end_time: z.string().regex(TIME_STRING).nullable().optional(),
  color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  itinerary_destination_id: z.number().int().positive().nullable().optional(),
  deleted_at: z.string().nullable().optional(),
});

export async function listItineraryCustomEvents(
  itineraryId: string
): Promise<DatabaseResponse<ItineraryCustomEvent[]>> {
  const itineraryIdValue = String(itineraryId ?? "").trim();
  if (!/^\d+$/.test(itineraryIdValue)) {
    return { success: false, error: { message: "Invalid itinerary id" } };
  }

  const supabase = createClient();

  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user) {
    return { success: false, error: { message: "User not authenticated" } };
  }

  const { data, error } = await supabase
    .from("itinerary_custom_event")
    .select(CUSTOM_EVENT_SELECT_WITH_KIND)
    .eq("itinerary_id", itineraryIdValue)
    .is("deleted_at", null)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true })
    .limit(2000);

  if (error) {
    const summary = getSupabaseErrorSummary(error);
    const code = String(summary.code ?? "");
    if (code === "42P01") {
      // Table not present yet (migration not applied).
      return { success: true, data: [] };
    }
    if (isMissingColumn(error, "kind")) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("itinerary_custom_event")
        .select(CUSTOM_EVENT_SELECT_LEGACY)
        .eq("itinerary_id", itineraryIdValue)
        .is("deleted_at", null)
        .order("date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(2000);

      if (legacyError) {
        const legacySummary = getSupabaseErrorSummary(legacyError);
        const legacyCode = String(legacySummary.code ?? "");
        console.error("Error listing custom events (legacy):", legacySummary);
        return { success: false, error: { message: "Failed to load custom events", code: legacyCode } };
      }

      return { success: true, data: (legacyData ?? []) as ItineraryCustomEvent[] };
    }
    console.error("Error listing custom events:", summary);
    return { success: false, error: { message: "Failed to load custom events", code } };
  }

  return { success: true, data: (data ?? []) as ItineraryCustomEvent[] };
}

export async function createItineraryCustomEvent(
  input: z.input<typeof createCustomEventSchema>
): Promise<DatabaseResponse<ItineraryCustomEvent>> {
  const supabase = createClient();

  try {
    const validated = createCustomEventSchema.parse(input);

    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth?.user) {
      return { success: false, error: { message: "User not authenticated" } };
    }

    const insertRow = {
      itinerary_id: validated.itinerary_id,
      itinerary_destination_id: validated.itinerary_destination_id ?? null,
      kind: validated.kind ?? "custom",
      title: validated.title,
      notes: validated.notes ?? null,
      date: validated.date,
      start_time: toTimeString(validated.start_time),
      end_time: toTimeString(validated.end_time),
      color_hex: validated.color_hex ?? null,
    };

    const insertWithoutKind = (() => {
      const { kind: _kind, ...rest } = insertRow as any;
      return rest;
    })();

    const { data, error } = await supabase
      .from("itinerary_custom_event")
      .insert(insertRow as any)
      .select(CUSTOM_EVENT_SELECT_WITH_KIND)
      .single();

    if (error && isMissingColumn(error, "kind")) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("itinerary_custom_event")
        .insert(insertWithoutKind)
        .select(CUSTOM_EVENT_SELECT_LEGACY)
        .single();

      if (legacyError || !legacyData) {
        const legacySummary = getSupabaseErrorSummary(legacyError);
        const legacyCode = String(legacySummary.code ?? "");
        console.error("Error creating custom event (legacy):", legacySummary);
        return { success: false, error: { message: "Failed to create custom event", code: legacyCode } };
      }

      revalidateTag(builderBootstrapTag("0", String(validated.itinerary_id), "0"));
      return { success: true, data: legacyData as ItineraryCustomEvent };
    }

    if (error || !data) {
      const summary = getSupabaseErrorSummary(error);
      const code = String(summary.code ?? "");
      console.error("Error creating custom event:", summary);
      return { success: false, error: { message: "Failed to create custom event", code } };
    }

    revalidateTag(builderBootstrapTag("0", String(validated.itinerary_id), "0"));
    return { success: true, data: data as ItineraryCustomEvent };
  } catch (err: any) {
    const summary = getSupabaseErrorSummary(err);
    const code = String(summary.code ?? "");
    console.error("Error creating custom event:", summary);
    return { success: false, error: { message: "Failed to create custom event", code } };
  }
}

export async function updateItineraryCustomEvent(
  itineraryCustomEventId: string,
  patch: z.input<typeof updateCustomEventSchema>
): Promise<DatabaseResponse<ItineraryCustomEvent>> {
  const itineraryCustomEventIdValue = String(itineraryCustomEventId ?? "").trim();
  if (!/^\d+$/.test(itineraryCustomEventIdValue)) {
    return { success: false, error: { message: "Invalid custom event id" } };
  }

  const supabase = createClient();

  try {
    const validated = updateCustomEventSchema.parse(patch);

    const updateRow: Record<string, any> = {};
    if (validated.kind !== undefined) updateRow.kind = validated.kind;
    if (validated.title !== undefined) updateRow.title = validated.title;
    if (validated.notes !== undefined) updateRow.notes = validated.notes;
    if (validated.date !== undefined) updateRow.date = validated.date;
    if (validated.start_time !== undefined) updateRow.start_time = validated.start_time ? toTimeString(validated.start_time) : null;
    if (validated.end_time !== undefined) updateRow.end_time = validated.end_time ? toTimeString(validated.end_time) : null;
    if (validated.color_hex !== undefined) updateRow.color_hex = validated.color_hex;
    if (validated.itinerary_destination_id !== undefined) {
      updateRow.itinerary_destination_id = validated.itinerary_destination_id;
    }
    if (validated.deleted_at !== undefined) updateRow.deleted_at = validated.deleted_at;

    const { kind: _kind, ...updateWithoutKind } = updateRow;

    const { data, error } = await supabase
      .from("itinerary_custom_event")
      .update(updateRow)
      .eq("itinerary_custom_event_id", itineraryCustomEventIdValue)
      .select(CUSTOM_EVENT_SELECT_WITH_KIND)
      .single();

    if (error && isMissingColumn(error, "kind")) {
      const { data: legacyData, error: legacyError } = await supabase
        .from("itinerary_custom_event")
        .update(updateWithoutKind)
        .eq("itinerary_custom_event_id", itineraryCustomEventIdValue)
        .select(CUSTOM_EVENT_SELECT_LEGACY)
        .single();

      if (legacyError || !legacyData) {
        const legacySummary = getSupabaseErrorSummary(legacyError);
        const legacyCode = String(legacySummary.code ?? "");
        console.error("Error updating custom event (legacy):", legacySummary);
        return { success: false, error: { message: "Failed to update custom event", code: legacyCode } };
      }

      revalidateTag(builderBootstrapTag("0", String((legacyData as any).itinerary_id), "0"));
      return { success: true, data: legacyData as ItineraryCustomEvent };
    }

    if (error || !data) {
      const summary = getSupabaseErrorSummary(error);
      const code = String(summary.code ?? "");
      console.error("Error updating custom event:", summary);
      return { success: false, error: { message: "Failed to update custom event", code } };
    }

    revalidateTag(builderBootstrapTag("0", String((data as any).itinerary_id), "0"));
    return { success: true, data: data as ItineraryCustomEvent };
  } catch (err: any) {
    const summary = getSupabaseErrorSummary(err);
    const code = String(summary.code ?? "");
    console.error("Error updating custom event:", summary);
    return { success: false, error: { message: "Failed to update custom event", code } };
  }
}

export async function setItineraryCustomEventDateTimes(
  itineraryCustomEventId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<DatabaseResponse<ItineraryCustomEvent>> {
  return updateItineraryCustomEvent(itineraryCustomEventId, {
    date,
    start_time: startTime,
    end_time: endTime,
  });
}

export async function deleteItineraryCustomEvent(
  itineraryCustomEventId: string
): Promise<DatabaseResponse<ItineraryCustomEvent>> {
  return updateItineraryCustomEvent(itineraryCustomEventId, {
    deleted_at: new Date().toISOString(),
  });
}
