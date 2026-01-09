"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DatePickerWithRangePopover2 } from "@/components/form/date/DateRangePickerPopover2";
import DestinationSelector from "@/components/destination/DestinationSelector";
import { createDestination } from "@/actions/supabase/destinations";
import type { Destination } from "@/store/createItineraryStore";
import type { DateRange } from "react-day-picker";
import { MapPin } from "lucide-react";
import { format } from "date-fns";

type AddDestinationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itineraryId: string;
  nextOrderNumber: number;
  defaultDateRange?: DateRange;
  onDestinationCreated?: (destinationId: number) => void;
};

export function AddDestinationDialog({
  open,
  onOpenChange,
  itineraryId,
  nextOrderNumber,
  defaultDateRange,
  onDestinationCreated,
}: AddDestinationDialogProps) {
  const [showSelector, setShowSelector] = React.useState(false);
  const [destination, setDestination] = React.useState<Destination | null>(null);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(defaultDateRange);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setShowSelector(false);
    setIsSubmitting(false);
    setError(null);
    setDestination(null);
    setDateRange(defaultDateRange);
  }, [open, defaultDateRange]);

  const canSubmit = Boolean(destination && dateRange?.from && dateRange?.to);

  const handleCreate = async () => {
    if (!destination || !dateRange?.from || !dateRange?.to) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createDestination({
        itinerary_id: Number(itineraryId),
        city: destination.city,
        country: destination.country,
        from_date: dateRange.from,
        to_date: dateRange.to,
        order_number: nextOrderNumber,
      });

      if (!result.success || !result.data) {
        setError(result.error?.message || "Failed to add destination");
        setIsSubmitting(false);
        return;
      }

      onOpenChange(false);
      onDestinationCreated?.(result.data.itinerary_destination_id);
    } catch (err) {
      console.error("Error adding destination:", err);
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90%] sm:w-full max-w-[900px] h-[650px] p-0 gap-0 rounded-xl">
        {showSelector ? (
          <DestinationSelector
            onDestinationSelect={(picked) => {
              setDestination(picked);
              setShowSelector(false);
            }}
            onClose={() => setShowSelector(false)}
            initialDestination={destination}
          />
        ) : (
          <div className="flex h-full flex-col">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-stroke-200">
              <DialogTitle>Add destination</DialogTitle>
              <DialogDescription className="text-ink-500">
                Add another city to this itinerary. You can switch destinations from the sidebar.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-6">
              <div className="space-y-2">
                <div className="text-xs font-medium text-ink-700">Destination</div>
                {destination ? (
                  <div className="flex items-center justify-between p-3 border border-gray-300 rounded-md bg-blue-50">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="p-2 bg-blue-600 rounded-lg">
                        <MapPin className="h-4 w-4 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{destination.name}</div>
                        <div className="text-sm text-gray-600 truncate">{destination.country}</div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSelector(true)}
                      className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowSelector(true)}
                    className="w-full h-12 justify-start text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                  >
                    <MapPin className="h-5 w-5 mr-3" />
                    Choose your destination...
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-ink-700">Travel Dates</div>
                <DatePickerWithRangePopover2 selectedDateRange={dateRange} onDateRangeConfirm={setDateRange} />
                {dateRange?.from && dateRange?.to ? (
                  <div className="text-[11px] text-ink-500">
                    {format(dateRange.from, "MMM d, yyyy")} – {format(dateRange.to, "MMM d, yyyy")}
                  </div>
                ) : null}
              </div>

              {error ? <div className="text-sm text-red-600">{error}</div> : null}
            </div>

            <div className="px-6 pb-6 pt-4 border-t border-stroke-200 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="button" onClick={handleCreate} disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Adding…" : "Add destination"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
