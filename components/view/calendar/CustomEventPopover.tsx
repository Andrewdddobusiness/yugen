"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { createItineraryCustomEvent } from "@/actions/supabase/customEvents";
import type { ItineraryCustomEvent } from "@/store/itineraryCustomEventStore";
import { TimeRangePicker } from "./TimePicker";
import { useSchedulingContext } from "@/store/timeSchedulingStore";

export type AnchorRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type CustomEventDraft = {
  itineraryId: number;
  date: Date;
  startTime: string; // HH:MM:SS
  endTime: string; // HH:MM:SS
};

export function CustomEventPopover({
  open,
  onOpenChange,
  draft,
  anchorRect,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: CustomEventDraft | null;
  anchorRect: AnchorRect | null;
  onCreated: (event: ItineraryCustomEvent) => void;
}) {
  const { toast } = useToast();
  const schedulingContext = useSchedulingContext();

  const [title, setTitle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [date, setDate] = React.useState<Date | null>(null);
  const [timeRange, setTimeRange] = React.useState<{
    startTime: string;
    endTime: string;
    duration: number;
  } | null>(null);
  const [colorHex, setColorHex] = React.useState<string>("#94a3b8"); // slate-400
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open || !draft) return;
    setTitle("");
    setNotes("");
    setColorHex("#94a3b8");
    setDate(draft.date);
    const duration = (() => {
      const [sh, sm] = draft.startTime.split(":").map(Number);
      const [eh, em] = draft.endTime.split(":").map(Number);
      const d = eh * 60 + em - (sh * 60 + sm);
      return Math.max(schedulingContext.config.interval, d);
    })();
    setTimeRange({ startTime: draft.startTime, endTime: draft.endTime, duration });
  }, [draft, open, schedulingContext.config.interval]);

  const canSubmit = Boolean(draft && title.trim() && date && timeRange?.startTime && timeRange?.endTime);

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
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Anchor asChild>
        <div
          aria-hidden="true"
          className="pointer-events-none"
          style={
            anchorRect
              ? {
                  position: "fixed",
                  top: anchorRect.top,
                  left: anchorRect.left,
                  width: anchorRect.width,
                  height: anchorRect.height,
                }
              : { position: "fixed", top: -1000, left: -1000, width: 1, height: 1 }
          }
        />
      </PopoverPrimitive.Anchor>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          side="bottom"
          align="center"
          sideOffset={10}
          collisionPadding={12}
          className={cn(
            "z-[2000] w-[360px] rounded-xl border border-stroke-200 bg-bg-0 p-4 shadow-lg outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-ink-900">Add custom event</div>
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-2 text-ink-500 hover:bg-bg-50 hover:text-ink-900"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Close
            </Button>
          </div>

          <div className="grid gap-3 pt-3">
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
                  <Calendar
                    mode="single"
                    selected={date ?? undefined}
                    onSelect={(d) => setDate(d ?? null)}
                    initialFocus
                  />
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

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={!canSubmit || isSaving}>
                {isSaving ? "Adding..." : "Add"}
              </Button>
            </div>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

