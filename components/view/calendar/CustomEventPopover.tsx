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
import { createItineraryCustomEvent, updateItineraryCustomEvent } from "@/actions/supabase/customEvents";
import type { ItineraryCustomEvent } from "@/store/itineraryCustomEventStore";
import { TimeRangePicker } from "./TimePicker";
import { useSchedulingContext } from "@/store/timeSchedulingStore";
import { colors } from "@/lib/colors/colors";

export type AnchorRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type CustomEventDraft =
  | {
      mode: "create";
      itineraryId: number;
      date: Date;
      startTime: string; // HH:MM:SS
      endTime: string; // HH:MM:SS
    }
  | {
      mode: "edit";
      itineraryId: number;
      eventId: number;
      title: string;
      notes: string | null;
      date: Date;
      startTime: string; // HH:MM:SS
      endTime: string; // HH:MM:SS
      colorHex: string | null;
    };

export function CustomEventPopover({
  open,
  onOpenChange,
  draft,
  anchorRect,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: CustomEventDraft | null;
  anchorRect: AnchorRect | null;
  onSaved: (event: ItineraryCustomEvent) => void;
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

  const presetColors = React.useMemo(
    () => [
      "#94a3b8", // slate-400
      colors.Blue,
      colors.Purple,
      colors.Green,
      colors.Yellow,
      colors.Orange,
      colors.Red,
    ],
    []
  );

  React.useEffect(() => {
    if (!open || !draft) return;
    if (draft.mode === "edit") {
      setTitle(draft.title);
      setNotes(draft.notes ?? "");
      setColorHex(draft.colorHex ?? "#94a3b8");
      setDate(draft.date);
    } else {
      setTitle("");
      setNotes("");
      setColorHex("#94a3b8");
      setDate(draft.date);
    }
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
      const result =
        draft.mode === "edit"
          ? await updateItineraryCustomEvent(String(draft.eventId), {
              title: title.trim(),
              notes: notes.trim() ? notes.trim() : null,
              date: dateStr,
              start_time: timeRange.startTime,
              end_time: timeRange.endTime,
              color_hex: colorHex || null,
            })
          : await createItineraryCustomEvent({
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
          title: draft.mode === "edit" ? "Could not update event" : "Could not create event",
          description: "Please try again.",
          variant: "destructive",
        });
        return;
      }

      onSaved(result.data as any);
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save custom event:", error);
      toast({
        title: draft.mode === "edit" ? "Could not update event" : "Could not create event",
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
          onInteractOutside={(event) => {
            const target = event.target as HTMLElement | null;
            if (target?.closest?.('[data-keep-parent-open="custom-event"]')) {
              event.preventDefault();
            }
          }}
          className={cn(
            "z-[2000] w-[360px] rounded-xl border border-stroke-200 bg-bg-0 p-4 shadow-lg outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
          )}
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-ink-900">
              {draft?.mode === "edit" ? "Edit custom event" : "Add custom event"}
            </div>
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
                <PopoverContent className="w-auto p-0" align="start" data-keep-parent-open="custom-event">
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
                keepParentOpenAttribute="custom-event"
              />
            </div>

            <div className="grid gap-2">
              <div className="text-xs font-semibold text-ink-700">Color</div>
              <div className="flex items-center justify-between gap-3 rounded-[12px] border border-stroke-200 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink-900">Quick colors</div>
                  <div className="text-xs text-muted-foreground">Pick a preset or customize.</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {presetColors.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      className={cn(
                        "h-7 w-7 rounded-full border border-stroke-200",
                        "transition-shadow hover:shadow-sm",
                        colorHex.toLowerCase() === hex.toLowerCase() &&
                          "ring-2 ring-brand-400 ring-offset-2 ring-offset-bg-0"
                      )}
                      style={{ backgroundColor: hex }}
                      onClick={() => setColorHex(hex)}
                      aria-label={`Set color to ${hex}`}
                      title={hex}
                    />
                  ))}

                  <label
                    className={cn(
                      "h-7 w-7 rounded-full grid place-items-center border cursor-pointer shrink-0",
                      "transition-shadow hover:shadow-sm",
                      !presetColors.some((hex) => hex.toLowerCase() === colorHex.toLowerCase()) &&
                        "ring-2 ring-brand-400 ring-offset-2 ring-offset-bg-0"
                    )}
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
                {isSaving
                  ? draft?.mode === "edit"
                    ? "Saving..."
                    : "Adding..."
                  : draft?.mode === "edit"
                    ? "Save"
                    : "Add"}
              </Button>
            </div>
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
