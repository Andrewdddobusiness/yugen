"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { builderBootstrapTag } from "@/lib/cacheTags";

const parseIntId = (value: string) => {
  const trimmed = String(value ?? "").trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number(trimmed);
};

const isMissingTableError = (error: any, tableName: string) => {
  if (!error) return false;
  const code = String(error.code ?? "");
  const message = String(error.message ?? "").toLowerCase();
  const table = tableName.toLowerCase();

  // Postgres: undefined_table
  if (code === "42P01") return true;

  // PostgREST schema cache miss (table not found / not exposed)
  if (code.startsWith("PGRST") && message.includes("schema cache") && message.includes(table)) {
    return true;
  }
  if (code.startsWith("PGRST") && message.includes("could not find") && message.includes(table)) {
    return true;
  }

  // PostgREST sometimes wraps Postgres errors into a generic message.
  if (message.includes("does not exist") && message.includes(table)) return true;
  if (message.includes("relation") && message.includes("does not exist")) return true;

  return false;
};

type SlotRow = {
  itinerary_slot_id: number;
  itinerary_id: number;
  itinerary_destination_id: number;
  date: string;
  start_time: string;
  end_time: string;
  primary_itinerary_activity_id: number | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type SlotOptionRow = {
  itinerary_slot_option_id: number;
  itinerary_slot_id: number;
  itinerary_activity_id: number;
  created_by: string | null;
  created_at: string;
};

export async function addActivitiesAsAlternatives(
  targetItineraryActivityId: string,
  itineraryActivityIdsToAdd: string[]
): Promise<
  | {
      success: true;
      data: {
        slot: SlotRow;
        slotOptions: SlotOptionRow[];
        removedSlotIds: number[];
      };
    }
  | { success: false; message: string; error?: any }
> {
  const targetId = parseIntId(targetItineraryActivityId);
  if (!targetId) return { success: false, message: "Invalid target itinerary activity id" };

  const addIds = Array.from(
    new Set((itineraryActivityIdsToAdd ?? []).map(parseIntId).filter((id): id is number => !!id))
  ).filter((id) => id !== targetId);

  if (addIds.length === 0) {
    return { success: false, message: "No alternative activities provided" };
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { success: false, message: "User not authenticated" };

  const { data: target, error: targetError } = await supabase
    .from("itinerary_activity")
    .select("itinerary_activity_id,itinerary_id,itinerary_destination_id,date,start_time,end_time")
    .eq("itinerary_activity_id", targetId)
    .single();

  if (targetError || !target) {
    return { success: false, message: "Failed to load target activity", error: targetError };
  }

  if (!target.date || !target.start_time || !target.end_time) {
    return { success: false, message: "Target activity must be scheduled to create alternatives" };
  }

  // Check if slots are available in this environment.
  const { data: existingTargetOption, error: existingTargetOptionError } = await supabase
    .from("itinerary_slot_option")
    .select("itinerary_slot_id")
    .eq("itinerary_activity_id", targetId)
    .maybeSingle();

  if (existingTargetOptionError) {
    if (isMissingTableError(existingTargetOptionError, "itinerary_slot_option")) {
      return { success: false, message: "Slots are not available yet (migration missing)" };
    }
    return { success: false, message: "Failed to load slot data", error: existingTargetOptionError };
  }

  let slotId: number | null = existingTargetOption?.itinerary_slot_id ?? null;
  let slotRow: SlotRow | null = null;

  if (slotId) {
    const { data: slot, error: slotError } = await supabase
      .from("itinerary_slot")
      .select(
        "itinerary_slot_id,itinerary_id,itinerary_destination_id,date,start_time,end_time,primary_itinerary_activity_id,created_by,updated_by,created_at,updated_at,deleted_at"
      )
      .eq("itinerary_slot_id", slotId)
      .single();

    if (slotError || !slot) {
      return { success: false, message: "Failed to load slot", error: slotError };
    }

    slotRow = slot as unknown as SlotRow;
  } else {
    // Create a new slot using the target activity's existing time range.
    const { data: insertedSlot, error: insertSlotError } = await supabase
      .from("itinerary_slot")
      .insert({
        itinerary_id: target.itinerary_id,
        itinerary_destination_id: target.itinerary_destination_id,
        date: target.date,
        start_time: target.start_time,
        end_time: target.end_time,
        primary_itinerary_activity_id: targetId,
        deleted_at: null,
      })
      .select(
        "itinerary_slot_id,itinerary_id,itinerary_destination_id,date,start_time,end_time,primary_itinerary_activity_id,created_by,updated_by,created_at,updated_at,deleted_at"
      )
      .single();

    if (insertSlotError || !insertedSlot) {
      if (isMissingTableError(insertSlotError, "itinerary_slot")) {
        return { success: false, message: "Slots are not available yet (migration missing)" };
      }
      return { success: false, message: "Failed to create slot", error: insertSlotError };
    }

    slotId = insertedSlot.itinerary_slot_id as number;
    slotRow = insertedSlot as unknown as SlotRow;

    const { error: upsertTargetOptionError } = await supabase.from("itinerary_slot_option").upsert(
      {
        itinerary_slot_id: slotId,
        itinerary_activity_id: targetId,
      },
      { onConflict: "itinerary_activity_id" }
    );

    if (upsertTargetOptionError) {
      return {
        success: false,
        message: "Failed to attach target activity to slot",
        error: upsertTargetOptionError,
      };
    }
  }

  if (!slotId || !slotRow) {
    return { success: false, message: "Failed to resolve slot" };
  }

  // Read existing slot associations for the incoming alternatives so we can clean up source slots.
  const { data: existingAssociations, error: existingAssociationsError } = await supabase
    .from("itinerary_slot_option")
    .select("itinerary_slot_id,itinerary_activity_id")
    .in("itinerary_activity_id", addIds);

  if (existingAssociationsError) {
    return { success: false, message: "Failed to load existing slot associations", error: existingAssociationsError };
  }

  const candidateSlotIds = Array.from(
    new Set(
      (existingAssociations || [])
        .map((row) => row.itinerary_slot_id as number)
        .filter((id) => id != null && id !== slotId)
    )
  );

  // Remove any old associations for these activities (each activity belongs to at most one slot).
  if (existingAssociations && existingAssociations.length > 0) {
    const { error: deleteOldError } = await supabase
      .from("itinerary_slot_option")
      .delete()
      .in("itinerary_activity_id", addIds);

    if (deleteOldError) {
      return { success: false, message: "Failed to detach activities from old slots", error: deleteOldError };
    }
  }

  // Attach the alternatives to the target slot (upsert handles retries / duplicates).
  const rowsToUpsert = addIds.map((id) => ({
    itinerary_slot_id: slotId,
    itinerary_activity_id: id,
  }));

  const { error: upsertOptionsError } = await supabase
    .from("itinerary_slot_option")
    .upsert(rowsToUpsert, { onConflict: "itinerary_activity_id" });

  if (upsertOptionsError) {
    return { success: false, message: "Failed to attach alternatives to slot", error: upsertOptionsError };
  }

  // Align the alternatives' scheduled times to the slot time range so the calendar overlap works reliably.
  const { error: alignTimesError } = await supabase
    .from("itinerary_activity")
    .update({
      date: slotRow.date,
      start_time: slotRow.start_time,
      end_time: slotRow.end_time,
    })
    .in("itinerary_activity_id", addIds);

  if (alignTimesError) {
    return { success: false, message: "Failed to align activity times to the slot", error: alignTimesError };
  }

  // Clean up any source slots that are now singletons (slots are only used for alternatives).
  const removedSlotIds: number[] = [];
  for (const oldSlotId of candidateSlotIds) {
    const { count, error: countError } = await supabase
      .from("itinerary_slot_option")
      .select("itinerary_slot_option_id", { count: "exact", head: true })
      .eq("itinerary_slot_id", oldSlotId);

    if (countError) continue;
    const remaining = count ?? 0;
    if (remaining >= 2) continue;

    const { error: deleteSlotError } = await supabase
      .from("itinerary_slot")
      .delete()
      .eq("itinerary_slot_id", oldSlotId);

    if (!deleteSlotError) {
      removedSlotIds.push(oldSlotId);
    }
  }

  // Return fresh slot options so the client can update its local store.
  const { data: slotOptions, error: slotOptionsError } = await supabase
    .from("itinerary_slot_option")
    .select("itinerary_slot_option_id,itinerary_slot_id,itinerary_activity_id,created_by,created_at")
    .eq("itinerary_slot_id", slotId)
    .order("itinerary_slot_option_id", { ascending: true });

  if (slotOptionsError) {
    return { success: false, message: "Failed to load slot options", error: slotOptionsError };
  }

  revalidatePath(`/itinerary/${target.itinerary_id}`);
  revalidateTag(builderBootstrapTag(auth.user.id, String(target.itinerary_id), String(target.itinerary_destination_id)));

  return {
    success: true,
    data: {
      slot: slotRow,
      slotOptions: (slotOptions || []) as unknown as SlotOptionRow[],
      removedSlotIds,
    },
  };
}

export async function updateItinerarySlotTimeRange(
  itinerarySlotId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<{ success: true; data: { slot: SlotRow } } | { success: false; message: string; error?: any }> {
  const slotId = parseIntId(itinerarySlotId);
  if (!slotId) return { success: false, message: "Invalid slot id" };

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user) return { success: false, message: "User not authenticated" };

  const { data: slot, error: slotError } = await supabase
    .from("itinerary_slot")
    .update({
      date,
      start_time: startTime,
      end_time: endTime,
    })
    .eq("itinerary_slot_id", slotId)
    .select(
      "itinerary_slot_id,itinerary_id,itinerary_destination_id,date,start_time,end_time,primary_itinerary_activity_id,created_by,updated_by,created_at,updated_at,deleted_at"
    )
    .single();

  if (slotError || !slot) {
    return { success: false, message: "Failed to update slot", error: slotError };
  }

  const { data: optionRows, error: optionRowsError } = await supabase
    .from("itinerary_slot_option")
    .select("itinerary_activity_id")
    .eq("itinerary_slot_id", slotId);

  if (optionRowsError) {
    return { success: false, message: "Failed to load slot options", error: optionRowsError };
  }

  const activityIds = (optionRows || [])
    .map((row) => row.itinerary_activity_id as number)
    .filter((id) => typeof id === "number");

  if (activityIds.length > 0) {
    const { error: updateActivitiesError } = await supabase
      .from("itinerary_activity")
      .update({
        date,
        start_time: startTime,
        end_time: endTime,
      })
      .in("itinerary_activity_id", activityIds);

    if (updateActivitiesError) {
      return { success: false, message: "Failed to update activities in slot", error: updateActivitiesError };
    }
  }

  revalidatePath(`/itinerary/${slot.itinerary_id}`);
  revalidateTag(builderBootstrapTag(auth.user.id, String(slot.itinerary_id), String(slot.itinerary_destination_id)));

  return { success: true, data: { slot: slot as unknown as SlotRow } };
}
