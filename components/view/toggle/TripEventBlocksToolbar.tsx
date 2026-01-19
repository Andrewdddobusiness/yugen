"use client";

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { TripEventBlockPill } from "@/components/view/calendar/TripEventBlockPill";
import { TRIP_EVENT_BLOCK_TEMPLATES } from "@/lib/customEvents/tripEventBlocks";
import type { TripEventKind } from "@/lib/customEvents/kinds";

function TripEventBlockDraggable({
  kind,
  colorHex,
  className,
}: {
  kind: TripEventKind;
  colorHex: string;
  className?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `trip:${kind}`,
    data: {
      type: "trip-block",
      kind,
    },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-50")}
      aria-label={`Drag ${kind} block onto calendar`}
      {...attributes}
      {...listeners}
    >
      <TripEventBlockPill kind={kind} colorHex={colorHex} compact className={className} />
    </div>
  );
}

export function TripEventBlocksToolbar({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="text-xs font-semibold text-ink-500 dark:text-white/60">Blocks</div>
      <div className="flex items-center gap-2">
        {TRIP_EVENT_BLOCK_TEMPLATES.map((template) => (
          <Tooltip key={template.kind}>
            <TooltipTrigger asChild>
              <TripEventBlockDraggable kind={template.kind} colorHex={template.colorHex} />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Drag onto the calendar to create a {template.title.toLowerCase()} event.
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
