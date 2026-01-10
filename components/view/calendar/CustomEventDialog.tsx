"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createItineraryCustomEvent } from "@/actions/supabase/customEvents";
import type { ItineraryCustomEvent } from "@/store/itineraryCustomEventStore";
import { TimeRangePicker } from "./TimePicker";
import { useSchedulingContext } from "@/store/timeSchedulingStore";

type CustomEventDialogDraft = {
  itineraryId: number;
  date: Date;
  startTime: string; // HH:MM:SS
  endTime: string; // HH:MM:SS
};

export function CustomEventDialog({
  open,
  onOpenChange,
  draft,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: CustomEventDialogDraft | null;
  onCreated: (event: ItineraryCustomEvent) => void;
}) {
  const { toast } = useToast();
  const schedulingContext = useSchedulingContext();

  const [title, setTitle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [date, setDate] = React.useState<Date | null>(null);
  const [timeRange, setTimeRange] = React.useState<{ startTime: string; endTime: string; duration: number } | null>(
    null
  );
  const [colorHex, setColorHex] = React.useState<string>("#94a3b8"); // slate-400
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !draft) return;
    setTitle("");
    setNotes("");
    setColorHex("#94a3b8");
    setDate(draft.date);
    const duration =
      (() => {
        const [sh, sm] = draft.startTime.split(":").map(Number);
        const [eh, em] = draft.endTime.split(":").map(Number);
        const d = (eh * 60 + em) - (sh * 60 + sm);
        return Math.max(schedulingContext.config.interval, d);
      })();
    setTimeRange({ startTime: draft.startTime, endTime: draft.endTime, duration });
  }, [open, draft, schedulingContext.config.interval]);

  const canSubmit = Boolean(
    draft &&
      title.trim() &&
      date &&
      timeRange?.startTime &&
      timeRange?.endTime
  );

  const handleSubmit = async () => {
    if (!draft || !canSubmit || !date || !timeRange) return;
    setIsSaving(true);

    const dateStr = format(date, "yyyy-MM-dd");

    try {
      const result = await createItineraryCustomEvent({
        itinerary_id: draft.itineraryId,
        title: title.trim(),
        notes: notes.trim() ? notes.trim() : null,
        date: dateStr,
        start_time: timeRange.startTime,
        end_time: timeRange.endTime,
        color_hex: colorHex || null,
      });

      if (!result.success || !result.data) {
        toast({
          title: "Could not create event",
          description: "Please try again.",
          variant: "destructive",
        });
        return;
      }

      onCreated(result.data as any);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to create custom event:", error);
      toast({
        title: "Could not create event",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add custom event</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="text-xs font-semibold text-ink-700">Title</div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hotel check-in"
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-semibold text-ink-700">Date</div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn("justify-start", !date && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "EEE, MMM d, yyyy") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date ?? undefined} onSelect={(d) => setDate(d ?? null)} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-semibold text-ink-700">Time</div>
            <TimeRangePicker
              value={timeRange ?? undefined}
              onChange={(range) => setTimeRange(range)}
              config={schedulingContext.config}
              className="w-full"
            />
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-semibold text-ink-700">Color</div>
            <div className="flex items-center justify-between gap-3 rounded-[12px] border border-stroke-200 p-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-ink-900">Customize</div>
                <div className="text-xs text-muted-foreground">Defaults to grey.</div>
              </div>
              <label
                className="h-9 w-9 rounded-full grid place-items-center border cursor-pointer shrink-0"
                style={{ borderColor: colorHex, backgroundColor: colorHex }}
                aria-label="Pick custom color"
                title="Pick custom color"
              >
                <input
                  type="color"
                  className="sr-only"
                  value={colorHex}
                  onChange={(event) => setColorHex(event.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="grid gap-2">
            <div className="text-xs font-semibold text-ink-700">Notes (optional)</div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any details..."
              className="min-h-[90px]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={!canSubmit || isSaving}>
              {isSaving ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

