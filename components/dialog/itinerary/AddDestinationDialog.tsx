"use client";

import * as React from "react";
import { addDays, parseISO } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createDestination,
  deleteDestination,
  listItineraryDestinationsSummary,
  updateDestination,
} from "@/actions/supabase/destinations";
import { DestinationAutocompleteInput } from "@/components/destination/DestinationAutocompleteInput";
import { DatePickerWithRangePopover2 } from "@/components/form/date/DateRangePickerPopover2";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toIsoDateString } from "@/utils/dateOnly";
import type { Destination } from "@/store/createItineraryStore";

type AddDestinationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itineraryId: string;
  currentDestinationId?: number;
  nextOrderNumber: number;
  defaultDateRange?: DateRange;
  onDestinationCreated?: (destinationId: number, fromDate?: Date) => void;
};

type DestinationRow = {
  id: string;
  kind: "existing" | "new";
  itineraryDestinationId?: number;
  destination: Destination | null;
  dateRange?: DateRange;
  original?: {
    city: string;
    country: string;
    from: Date;
    to: Date;
  };
};

type DestinationsDraftV1 = {
  version: 1;
  savedAt: string;
  itineraryId: string;
  rows: Array<{
    id: string;
    kind: DestinationRow["kind"];
    itineraryDestinationId?: number;
    destination: Destination | null;
    dateRange?: { from?: string; to?: string };
    original?: { city: string; country: string; from: string; to: string };
  }>;
  deletedDestinationIds: number[];
};

const DRAFT_STORAGE_PREFIX = "yugi:manage-destinations-draft:v1:";

const createDraftId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as any).randomUUID() as string;
  }
  return `draft_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const buildDraftStorageKey = (itineraryId: string) => `${DRAFT_STORAGE_PREFIX}${String(itineraryId)}`;

const loadDraft = (key: string): DestinationsDraftV1 | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DestinationsDraftV1;
    if (!parsed || parsed.version !== 1) return null;
    if (!Array.isArray(parsed.rows)) return null;
    if (!Array.isArray(parsed.deletedDestinationIds)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveDraft = (key: string, draft: DestinationsDraftV1) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Ignore storage quota / private mode errors.
  }
};

const clearDraft = (key: string) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
};

const buildExistingDestinationValue = (
  city: string,
  country: string,
  itineraryDestinationId: number
): Destination => ({
  id: String(itineraryDestinationId),
  name: city,
  city,
  country,
  formatted_address: `${city}, ${country}`,
  place_id: "",
  coordinates: { lat: 0, lng: 0 },
  timezone: "",
  photos: [],
});

const toDateRange = (fromDate: string, toDate: string): DateRange | undefined => {
  const from = parseISO(fromDate);
  const to = parseISO(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return undefined;
  return { from, to };
};

const isSameDay = (a: Date, b: Date) => a.getTime() === b.getTime();

export function AddDestinationDialog({
  open,
  onOpenChange,
  itineraryId,
  currentDestinationId: _currentDestinationId,
  nextOrderNumber,
  defaultDateRange,
  onDestinationCreated,
}: AddDestinationDialogProps) {
  const queryClient = useQueryClient();
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const draftStorageKey = React.useMemo(() => buildDraftStorageKey(itineraryId), [itineraryId]);
  const prevOpenRef = React.useRef(open);
  const skipNextDraftSaveRef = React.useRef(false);

  const [rows, setRows] = React.useState<DestinationRow[]>([]);
  const [deletedDestinationIds, setDeletedDestinationIds] = React.useState<number[]>([]);
  const [invalidRowIds, setInvalidRowIds] = React.useState<string[]>([]);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = React.useState(false);

  const { data: destinationsSummary = [], isLoading: isLoadingDestinations } = useQuery({
    queryKey: ["itineraryDestinationsSummary", itineraryId],
    queryFn: async () => {
      const result = await listItineraryDestinationsSummary(itineraryId);
      return result.success ? result.data ?? [] : [];
    },
    enabled: Boolean(open && itineraryId),
    staleTime: 10 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const sortedDestinations = React.useMemo(() => {
    return [...destinationsSummary].sort((a, b) => Number(a.order_number ?? 0) - Number(b.order_number ?? 0));
  }, [destinationsSummary]);

  React.useEffect(() => {
    if (!open) return;
    setInvalidRowIds([]);
    setIsSaving(false);
    setError(null);
    skipNextDraftSaveRef.current = false;

    const existingDraft = loadDraft(draftStorageKey);
    if (existingDraft) {
      const restoredRows: DestinationRow[] = existingDraft.rows.map((row) => {
        const rangeFrom = row.dateRange?.from ? parseISO(row.dateRange.from) : undefined;
        const rangeTo = row.dateRange?.to ? parseISO(row.dateRange.to) : undefined;
        const dateRange =
          rangeFrom && rangeTo && !Number.isNaN(rangeFrom.getTime()) && !Number.isNaN(rangeTo.getTime())
            ? { from: rangeFrom, to: rangeTo }
            : undefined;

        const originalFrom = row.original?.from ? parseISO(row.original.from) : undefined;
        const originalTo = row.original?.to ? parseISO(row.original.to) : undefined;
        const original =
          row.original &&
          originalFrom &&
          originalTo &&
          !Number.isNaN(originalFrom.getTime()) &&
          !Number.isNaN(originalTo.getTime())
            ? {
                city: row.original.city,
                country: row.original.country,
                from: originalFrom,
                to: originalTo,
              }
            : undefined;

        return {
          id: row.id,
          kind: row.kind,
          itineraryDestinationId: row.itineraryDestinationId ? Number(row.itineraryDestinationId) : undefined,
          destination: row.destination,
          dateRange,
          original,
        };
      });

      setRows(restoredRows);
      setDeletedDestinationIds(existingDraft.deletedDestinationIds.map((id) => Number(id)).filter(Number.isFinite));
      setHasInitialized(true);
      return;
    }

    setRows([]);
    setDeletedDestinationIds([]);
    setHasInitialized(false);
  }, [draftStorageKey, open]);

  React.useEffect(() => {
    if (!open) return;
    if (isLoadingDestinations) return;
    if (hasInitialized) return;

    const initialRows: DestinationRow[] = sortedDestinations.map((dest) => {
      const range = toDateRange(dest.from_date, dest.to_date);
      return {
        id: `existing_${dest.itinerary_destination_id}`,
        kind: "existing",
        itineraryDestinationId: Number(dest.itinerary_destination_id),
        destination: buildExistingDestinationValue(dest.city, dest.country, Number(dest.itinerary_destination_id)),
        dateRange: range,
        original: range?.from && range?.to
          ? {
              city: dest.city,
              country: dest.country,
              from: range.from,
              to: range.to,
            }
          : undefined,
      };
    });

    setRows(initialRows);
    setHasInitialized(true);
  }, [hasInitialized, isLoadingDestinations, open, sortedDestinations]);

  const clearInvalid = React.useCallback((rowId: string) => {
    setInvalidRowIds((prev) => prev.filter((id) => id !== rowId));
  }, []);

  const addRow = React.useCallback(() => {
    setError(null);
    setRows((prev) => {
      const last = prev[prev.length - 1];
      const seed = last?.dateRange?.to
        ? (() => {
            const from = addDays(last.dateRange!.to!, 1);
            return { from, to: from };
          })()
        : defaultDateRange;
      return [
        ...prev,
        {
          id: createDraftId(),
          kind: "new",
          destination: null,
          dateRange: seed,
        },
      ];
    });

    requestAnimationFrame(() => {
      const el = listRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    });
  }, [defaultDateRange]);

  const removeRow = React.useCallback((rowId: string) => {
    setError(null);
    setRows((prev) => {
      const row = prev.find((r) => r.id === rowId);
      if (row?.kind === "existing" && row.itineraryDestinationId) {
        setDeletedDestinationIds((ids) => [...ids, row.itineraryDestinationId!]);
      }
      return prev.filter((r) => r.id !== rowId);
    });
    clearInvalid(rowId);
  }, [clearInvalid]);

  const updateRowDestination = React.useCallback((rowId: string, destination: Destination | null) => {
    setError(null);
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, destination } : row)));
    clearInvalid(rowId);
  }, [clearInvalid]);

  const updateRowDateRange = React.useCallback((rowId: string, dateRange: DateRange | undefined) => {
    setError(null);
    setRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, dateRange } : row)));
    clearInvalid(rowId);
  }, [clearInvalid]);

  const hasInvalidRows = React.useMemo(() => {
    return rows.some((row) => {
      if (row.kind === "existing") {
        return !row.destination || !row.dateRange?.from || !row.dateRange?.to;
      }
      if (!row.destination) return false;
      return !row.dateRange?.from || !row.dateRange?.to;
    });
  }, [rows]);

  const hasChanges = React.useMemo(() => {
    if (deletedDestinationIds.length > 0) return true;

    const hasCreate = rows.some(
      (row) => row.kind === "new" && row.destination && row.dateRange?.from && row.dateRange?.to
    );
    if (hasCreate) return true;

    return rows.some((row) => {
      if (row.kind !== "existing") return false;
      if (!row.destination || !row.dateRange?.from || !row.dateRange?.to) return false;
      const original = row.original;
      if (!original) return true;
      if (row.destination.city !== original.city) return true;
      if (row.destination.country !== original.country) return true;
      if (!isSameDay(row.dateRange.from, original.from)) return true;
      if (!isSameDay(row.dateRange.to, original.to)) return true;
      return false;
    });
  }, [deletedDestinationIds.length, rows]);

  const hasDraft = React.useMemo(() => {
    if (deletedDestinationIds.length > 0) return true;
    if (rows.some((row) => row.kind === "new")) return true;

    return rows.some((row) => {
      if (row.kind !== "existing") return false;
      if (!row.destination || !row.dateRange?.from || !row.dateRange?.to) return true;
      const original = row.original;
      if (!original) return true;
      return (
        row.destination.city !== original.city ||
        row.destination.country !== original.country ||
        !isSameDay(row.dateRange.from, original.from) ||
        !isSameDay(row.dateRange.to, original.to)
      );
    });
  }, [deletedDestinationIds.length, rows]);

  const persistDraftNow = React.useCallback(() => {
    if (!hasDraft) {
      clearDraft(draftStorageKey);
      return;
    }

    const draft: DestinationsDraftV1 = {
      version: 1,
      itineraryId: String(itineraryId),
      savedAt: new Date().toISOString(),
      deletedDestinationIds: deletedDestinationIds.map((id) => Number(id)).filter(Number.isFinite),
      rows: rows.map((row) => ({
        id: row.id,
        kind: row.kind,
        itineraryDestinationId: row.itineraryDestinationId,
        destination: row.destination,
        dateRange: row.dateRange
          ? {
              from: row.dateRange.from ? row.dateRange.from.toISOString() : undefined,
              to: row.dateRange.to ? row.dateRange.to.toISOString() : undefined,
            }
          : undefined,
        original: row.original
          ? {
              city: row.original.city,
              country: row.original.country,
              from: row.original.from.toISOString(),
              to: row.original.to.toISOString(),
            }
          : undefined,
      })),
    };

    saveDraft(draftStorageKey, draft);
  }, [deletedDestinationIds, draftStorageKey, hasDraft, itineraryId, rows]);

  React.useEffect(() => {
    if (!open) return;
    if (isSaving) return;

    if (!hasDraft) {
      clearDraft(draftStorageKey);
      return;
    }

    const timer = window.setTimeout(() => {
      persistDraftNow();
    }, 400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [draftStorageKey, hasDraft, isSaving, open, persistDraftNow]);

  React.useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    if (!wasOpen || open) return;
    if (isSaving) return;

    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false;
      return;
    }

    // Flush any pending edits immediately on close (overlay click / ESC / X button).
    persistDraftNow();
  }, [isSaving, open, persistDraftNow]);

  const canUpdate = !isSaving && !hasInvalidRows && hasChanges;

  const handleUpdate = async () => {
    setError(null);
    setInvalidRowIds([]);

    const invalid = rows
      .filter((row) => {
        if (row.kind === "existing") {
          return !row.destination || !row.dateRange?.from || !row.dateRange?.to;
        }
        if (!row.destination) return false;
        return !row.dateRange?.from || !row.dateRange?.to;
      })
      .map((row) => row.id);

    if (invalid.length > 0) {
      setInvalidRowIds(invalid);
      setError("Please fill in destination and dates for the highlighted rows.");
      return;
    }

    const existingUpdates = rows
      .filter((row) => row.kind === "existing" && row.itineraryDestinationId)
      .filter((row) => Boolean(row.destination && row.dateRange?.from && row.dateRange?.to))
      .filter((row) => {
        const original = row.original;
        if (!original || !row.destination || !row.dateRange?.from || !row.dateRange?.to) return true;
        return (
          row.destination.city !== original.city ||
          row.destination.country !== original.country ||
          !isSameDay(row.dateRange.from, original.from) ||
          !isSameDay(row.dateRange.to, original.to)
        );
      }) as Array<DestinationRow & { itineraryDestinationId: number; destination: Destination; dateRange: Required<Pick<DateRange, "from" | "to">> }>;

    const newRowsToCreate = rows
      .filter((row) => row.kind === "new" && row.destination && row.dateRange?.from && row.dateRange?.to)
      .sort((a, b) => (a.dateRange!.from!.getTime() ?? 0) - (b.dateRange!.from!.getTime() ?? 0)) as Array<
      DestinationRow & { destination: Destination; dateRange: Required<Pick<DateRange, "from" | "to">> }
    >;

    const deletions = [...new Set(deletedDestinationIds)];

    if (existingUpdates.length === 0 && newRowsToCreate.length === 0 && deletions.length === 0) {
      onOpenChange(false);
      return;
    }

    setIsSaving(true);

    try {
      for (const row of existingUpdates) {
        const result = await updateDestination(String(row.itineraryDestinationId), {
          city: row.destination.city,
          country: row.destination.country,
          from_date: toIsoDateString(row.dateRange.from!),
          to_date: toIsoDateString(row.dateRange.to!),
        });

        if (!result.success) {
          setError(result.error?.message || "Failed to update destination");
          setIsSaving(false);
          return;
        }
      }

      const createdIds: number[] = [];
      for (const row of newRowsToCreate) {
        const result = await createDestination({
          itinerary_id: Number(itineraryId),
          city: row.destination.city,
          country: row.destination.country,
          from_date: toIsoDateString(row.dateRange.from!),
          to_date: toIsoDateString(row.dateRange.to!),
          order_number: nextOrderNumber,
        });

        if (!result.success || !result.data) {
          setError(result.error?.message || "Failed to add destination");
          setIsSaving(false);
          return;
        }

        createdIds.push(result.data.itinerary_destination_id);
      }

      for (const destinationId of deletions) {
        const result = await deleteDestination(String(destinationId));
        if (!result.success) {
          setError(result.error?.message || "Failed to delete destination");
          setIsSaving(false);
          return;
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["itineraryDestinationsSummary", itineraryId] });
      skipNextDraftSaveRef.current = true;
      clearDraft(draftStorageKey);
      onOpenChange(false);

      if (createdIds.length > 0) {
        onDestinationCreated?.(createdIds[0]!, newRowsToCreate[0]?.dateRange?.from);
      }
    } catch (err) {
      console.error("Error updating destinations:", err);
      setError("Failed to update destinations");
    } finally {
      setIsSaving(false);
    }
  };

  const footerHint = error ? error : "Changes are saved when you click Update.";
  const footerTone = error ? "text-red-600" : "text-ink-500";
  const handleCancel = () => {
    skipNextDraftSaveRef.current = true;
    clearDraft(draftStorageKey);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:w-full max-w-[900px] h-[650px] max-h-[85vh] p-0 gap-0 rounded-xl overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-stroke-200">
          <DialogTitle>Manage destinations</DialogTitle>
        </DialogHeader>

        <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-6 overscroll-contain">
          {isLoadingDestinations ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-stroke-200 bg-white px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-11 flex-1 rounded-xl" />
                    <Skeleton className="h-11 w-44 rounded-xl" />
                    <Skeleton className="h-11 w-11 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {rows.length === 0 ? (
                <div className="text-sm text-ink-500">No destinations yet. Add your first stop.</div>
              ) : null}

              {rows.map((row, index) => {
                const isInvalid = invalidRowIds.includes(row.id);
                return (
                  <div
                    key={row.id}
                    className={cn(
                      "rounded-2xl border border-stroke-200 bg-white px-3 py-3",
                      isInvalid && "border-red-300 bg-red-50/30"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-bg-50 text-ink-900 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                          {index + 1}
                        </div>

                        <div className="flex-1 min-w-0">
                          <DestinationAutocompleteInput
                            value={row.destination}
                            onChange={(next) => updateRowDestination(row.id, next)}
                            placeholder='Type a city (e.g. "Florence")…'
                            disabled={isSaving}
                            clearSelectionOnType={row.kind !== "existing"}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-full sm:w-[240px] min-w-0">
                          <DatePickerWithRangePopover2
                            selectedDateRange={row.dateRange}
                            onDateRangeConfirm={(range) => updateRowDateRange(row.id, range)}
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-11 w-11 rounded-full"
                          onClick={() => removeRow(row.id)}
                          disabled={isSaving}
                          aria-label="Remove destination"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={addRow}
                disabled={isSaving}
                className={cn(
                  "w-full rounded-2xl border border-dashed border-stroke-200 bg-white px-4 py-3 text-sm font-semibold text-brand-700 transition-colors",
                  "hover:bg-bg-50 disabled:opacity-60 disabled:cursor-not-allowed"
                )}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add another stop
                </span>
              </button>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-4 border-t border-stroke-200 flex items-center justify-end gap-2">
          <div className="flex-1 text-xs">
            <span className={footerTone}>{footerHint}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleUpdate} disabled={!canUpdate}>
              {isSaving ? "Updating…" : "Update"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
