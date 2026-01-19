"use client";

import * as React from "react";
import { Plane, LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCustomEventKindLabel, type TripEventKind } from "@/lib/customEvents/kinds";

const ICONS: Record<TripEventKind, React.ComponentType<{ className?: string }>> = {
  flight: Plane,
  hotel_check_in: LogIn,
  hotel_check_out: LogOut,
};

export function TripEventBlockPill({
  kind,
  colorHex,
  className,
  compact = false,
}: {
  kind: TripEventKind;
  colorHex: string;
  className?: string;
  compact?: boolean;
}) {
  const Icon = ICONS[kind] ?? Plane;
  const label = getCustomEventKindLabel(kind);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold shadow-sm select-none",
        "bg-bg-0 border-stroke-200 text-ink-900",
        "dark:bg-white/5 dark:border-white/10 dark:text-white/85",
        compact && "px-2.5 py-1.5 text-xs",
        className
      )}
      style={{ borderColor: colorHex }}
    >
      <span
        className={cn("h-2.5 w-2.5 rounded-full shrink-0", compact && "h-2 w-2")}
        aria-hidden="true"
        style={{ backgroundColor: colorHex }}
      />
      <Icon className={cn("h-4 w-4 shrink-0", compact && "h-3.5 w-3.5")} aria-hidden="true" />
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}

