"use client";

import React from "react";
import { ChevronRight, Plus, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";
import {
  ACTIVITY_ACCENT_DOT_CLASSES,
  ACTIVITY_CATEGORY_LABELS,
  type ActivityAccent,
  type ActivityCategory,
} from "@/lib/activityAccent";

const CATEGORY_ORDER: ActivityCategory[] = [
  "food",
  "sights",
  "shopping",
  "nature",
  "entertainment",
  "lodging",
  "transport",
];

const ACCENT_OPTIONS: Array<{ value: ActivityAccent; label: string }> = [
  { value: "brand", label: "Brand" },
  { value: "teal", label: "Teal" },
  { value: "amber", label: "Amber" },
  { value: "coral", label: "Coral" },
  { value: "lime", label: "Lime" },
  { value: "tan", label: "Tan" },
];

export function ActivityCategoryColorsPopover({ className }: { className?: string }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<ActivityCategory | null>(null);

  const activityCategoryAccents = useItineraryLayoutStore((s) => s.activityCategoryAccents);
  const setActivityCategoryAccent = useItineraryLayoutStore((s) => s.setActivityCategoryAccent);
  const activityCategoryCustomColors = useItineraryLayoutStore((s) => s.activityCategoryCustomColors);
  const setActivityCategoryCustomColor = useItineraryLayoutStore((s) => s.setActivityCategoryCustomColor);
  const resetActivityCategoryAccents = useItineraryLayoutStore((s) => s.resetActivityCategoryAccents);

  const editingAccent = editingCategory ? activityCategoryAccents[editingCategory] : null;
  const editingCustomHex = editingCategory ? activityCategoryCustomColors[editingCategory] : null;
  const editingLabel = editingCategory ? ACTIVITY_CATEGORY_LABELS[editingCategory] : null;
  const editingAccentLabel =
    editingAccent ? ACCENT_OPTIONS.find((option) => option.value === editingAccent)?.label : null;

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("shrink-0", className)}
          type="button"
          aria-label="Customize activity category colors"
        >
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Colors
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink-900 dark:text-ink-100">
              Activity colors
            </div>
            <div className="text-xs text-muted-foreground">Applies to calendar + sidebar + table.</div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => resetActivityCategoryAccents()}
            className="shrink-0 text-xs"
          >
            Reset
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {CATEGORY_ORDER.map((category) => {
            const accent = activityCategoryAccents[category];
            const customHex = activityCategoryCustomColors[category];
            const accentLabel = ACCENT_OPTIONS.find((option) => option.value === accent)?.label ?? "Color";
            return (
              <div key={category} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-ink-900 dark:text-ink-100">
                    {ACTIVITY_CATEGORY_LABELS[category]}
                  </span>
                </div>

                <button
                  type="button"
                  className={cn(
                    "inline-flex w-32 items-center justify-between gap-2 rounded-[12px] border px-3 h-9 text-xs font-semibold transition-colors",
                    "border-stroke-200 bg-transparent text-brand-700 hover:bg-bg-50 active:translate-y-0",
                    "dark:border-white/10 dark:text-white/80 dark:hover:bg-white/10"
                  )}
                  onClick={() => {
                    setIsOpen(false);
                    setEditingCategory(category);
                  }}
                  aria-label={`Change ${ACTIVITY_CATEGORY_LABELS[category]} color (currently ${customHex ? "custom" : accentLabel})`}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {customHex ? (
                      <span
                        aria-hidden="true"
                        className="h-3.5 w-3.5 rounded-full"
                        style={{ backgroundColor: customHex }}
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className={cn("h-3.5 w-3.5 rounded-full", ACTIVITY_ACCENT_DOT_CLASSES[accent])}
                      />
                    )}
                    <span className="min-w-0 truncate">{customHex ? "Custom" : accentLabel}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-70" />
                </button>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>

      <Dialog
        open={editingCategory !== null}
        onOpenChange={(open) => {
          if (!open) setEditingCategory(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingLabel ? `${editingLabel} color` : "Choose a color"}</DialogTitle>
            <DialogDescription>Applies to calendar + sidebar + table.</DialogDescription>
          </DialogHeader>

          {editingCategory ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <div className="text-xs font-semibold text-ink-700 dark:text-white/70">Presets</div>
                <div className="grid grid-cols-2 gap-2">
                  {ACCENT_OPTIONS.map((option) => {
                    const isSelected = !editingCustomHex && editingAccent === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          "flex items-center gap-2 rounded-[12px] border px-3 py-2 text-sm font-semibold transition-colors",
                          isSelected
                            ? "border-brand-500 bg-brand-500/5"
                            : "border-stroke-200 hover:bg-bg-50 dark:border-white/10 dark:hover:bg-white/10"
                        )}
                        onClick={() => {
                          setActivityCategoryAccent(editingCategory, option.value);
                          setActivityCategoryCustomColor(editingCategory, null);
                        }}
                      >
                        <span
                          aria-hidden="true"
                          className={cn("h-3.5 w-3.5 rounded-full", ACTIVITY_ACCENT_DOT_CLASSES[option.value])}
                        />
                        <span className="min-w-0 truncate">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-2">
                <div className="text-xs font-semibold text-ink-700 dark:text-white/70">Custom</div>
                <div className="flex items-center justify-between gap-3 rounded-[12px] border border-stroke-200 p-3 dark:border-white/10">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-ink-900 dark:text-ink-100">Pick a color</div>
                    <div className="text-xs text-muted-foreground">Overrides preset selection.</div>
                  </div>
                  <label
                    className={cn(
                      "h-9 w-9 rounded-full grid place-items-center border cursor-pointer transition-colors shrink-0",
                      editingCustomHex
                        ? "border-brand-500 ring-2 ring-brand-500/30"
                        : "border-stroke-200 hover:border-ink-300 dark:border-white/10 dark:hover:border-white/30"
                    )}
                    aria-label={`Pick a custom color for ${editingLabel ?? "category"}`}
                    title="Custom color"
                  >
                    <input
                      type="color"
                      className="sr-only"
                      value={editingCustomHex ?? "#3b82f6"}
                      onChange={(event) => {
                        setActivityCategoryCustomColor(editingCategory, event.target.value);
                      }}
                    />
                    {editingCustomHex ? (
                      <span aria-hidden="true" className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: editingCustomHex }} />
                    ) : (
                      <Plus className="h-4 w-4 text-ink-500 dark:text-white/60" />
                    )}
                  </label>
                </div>

                {editingCustomHex ? (
                  <button
                    type="button"
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700 text-left"
                    onClick={() => setActivityCategoryCustomColor(editingCategory, null)}
                  >
                    Clear custom color (use {editingAccentLabel ?? "preset"})
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
