"use client";

import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { useItinerarySlotStore } from "@/store/itinerarySlotStore";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";

type SlotOptionsPopoverProps = {
  itineraryActivityId: string;
  className?: string;
  compact?: boolean;
};

type OptionRow = {
  itineraryActivityId: string;
  name: string;
  isPrimary: boolean;
};

const normalizeId = (value: unknown) => String(value ?? "").trim();
const EMPTY_LIST: string[] = [];

const optionLabel = (index: number) => {
  const letter = String.fromCharCode(65 + (index % 26));
  return `Option ${letter}`;
};

export function SlotOptionsPopover({ itineraryActivityId, className, compact }: SlotOptionsPopoverProps) {
  const slots = useItinerarySlotStore((s) => s.slots);
  const slotOptions = useItinerarySlotStore((s) => s.slotOptions);
  const upsertSlot = useItinerarySlotStore((s) => s.upsertSlot);

  const itineraryActivities = useItineraryActivityStore((s) => s.itineraryActivities);
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [savingActivityId, setSavingActivityId] = useState<string | null>(null);

  const slotIndex = useMemo(() => {
    const slotIdByActivityId = new Map<string, string>();
    const activityIdsBySlotId = new Map<string, string[]>();

    for (const option of slotOptions) {
      const slotId = normalizeId((option as any)?.itinerary_slot_id);
      const activityId = normalizeId((option as any)?.itinerary_activity_id);
      if (!slotId || !activityId) continue;
      slotIdByActivityId.set(activityId, slotId);
      const list = activityIdsBySlotId.get(slotId) ?? [];
      list.push(activityId);
      activityIdsBySlotId.set(slotId, list);
    }

    const primaryBySlotId = new Map<string, string | null>();
    for (const slot of slots) {
      const slotId = normalizeId((slot as any)?.itinerary_slot_id);
      if (!slotId) continue;
      const primary = normalizeId((slot as any)?.primary_itinerary_activity_id);
      primaryBySlotId.set(slotId, primary || null);
    }

    return { slotIdByActivityId, activityIdsBySlotId, primaryBySlotId };
  }, [slotOptions, slots]);

  const slotId = slotIndex.slotIdByActivityId.get(normalizeId(itineraryActivityId)) ?? null;
  const optionActivityIds = useMemo(
    () => (slotId ? slotIndex.activityIdsBySlotId.get(slotId) ?? EMPTY_LIST : EMPTY_LIST),
    [slotId, slotIndex]
  );
  const optionCount = optionActivityIds.length;
  const primaryId = slotId
    ? slotIndex.primaryBySlotId.get(slotId) ??
      optionActivityIds
        .slice()
        .sort((a, b) => Number(a) - Number(b))
        .find(Boolean) ??
      null
    : null;

  const activityNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of itineraryActivities) {
      const id = normalizeId((row as any)?.itinerary_activity_id);
      if (!id) continue;
      const name = String((row as any)?.activity?.name ?? "").trim();
      if (name) map.set(id, name);
    }
    return map;
  }, [itineraryActivities]);

  const options: OptionRow[] = useMemo(() => {
    if (!slotId || optionActivityIds.length <= 1) return [];

    const list: OptionRow[] = optionActivityIds
      .map((id) => {
        const normalized = normalizeId(id);
        return {
          itineraryActivityId: normalized,
          name: activityNameById.get(normalized) ?? `Activity ${normalized}`,
          isPrimary: primaryId ? normalized === primaryId : false,
        };
      })
      .filter((row) => row.itineraryActivityId);

    list.sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      const nameSort = a.name.localeCompare(b.name);
      if (nameSort !== 0) return nameSort;
      return a.itineraryActivityId.localeCompare(b.itineraryActivityId);
    });

    // If we don't have a primary id yet, treat the first item as primary for display purposes.
    if (!primaryId && list.length > 0) {
      list[0] = { ...list[0]!, isPrimary: true };
    }

    return list;
  }, [activityNameById, optionActivityIds, primaryId, slotId]);

  if (!slotId || optionCount <= 1) return null;

  const triggerClass = cn(
    "inline-flex items-center rounded-full border border-stroke-200 bg-bg-0 text-ink-700 shadow-sm",
    "hover:bg-bg-50",
    "dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10",
    compact ? "px-2 py-0.5 text-[10px] font-medium" : "px-2.5 py-1 text-xs font-medium",
    className
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={triggerClass}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Options (${optionCount})`}
        >
          Options ({optionCount})
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-72 p-3"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <div>
            <div className="text-sm font-semibold text-ink-900 dark:text-white/90">Options ({optionCount})</div>
            <div className="text-xs text-ink-500 dark:text-white/60">Pick a backup option for this time window.</div>
          </div>

          <div className="space-y-2">
            {options.map((opt, index) => {
              const isSaving = savingActivityId === opt.itineraryActivityId;
              return (
                <div
                  key={opt.itineraryActivityId}
                  className="rounded-lg border border-stroke-200/70 bg-bg-0 px-3 py-2 dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] font-medium text-ink-500 dark:text-white/60">
                        {optionLabel(index)}
                      </div>
                      <div className="truncate text-sm font-medium text-ink-900 dark:text-white/90">{opt.name}</div>
                    </div>

                    {opt.isPrimary ? (
                      <div className="inline-flex items-center gap-1 rounded-full bg-lime-500/15 px-2 py-1 text-[11px] font-medium text-ink-700 dark:text-white/80">
                        <Check className="h-3 w-3" />
                        Primary
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[11px]"
                        disabled={savingActivityId != null}
                        onClick={async () => {
                          setSavingActivityId(opt.itineraryActivityId);
                          try {
                            const { setItinerarySlotPrimaryActivity } = await import("@/actions/supabase/slots");
                            const result = await setItinerarySlotPrimaryActivity(slotId, opt.itineraryActivityId);
                            if (!result.success) {
                              throw new Error(result.message || "Failed to update primary option");
                            }
                            upsertSlot(result.data.slot as any);
                            toast({
                              title: "Updated slot option",
                              description: `"${opt.name}" is now the primary option for that time window.`,
                            });
                            setOpen(false);
                          } catch (error) {
                            toast({
                              title: "Could not update slot option",
                              description: error instanceof Error ? error.message : "Please try again.",
                              variant: "destructive",
                            });
                          } finally {
                            setSavingActivityId(null);
                          }
                        }}
                      >
                        {isSaving ? "Saving…" : "Make primary"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
