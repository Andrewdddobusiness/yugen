"use client";

import * as React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Clock, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSchedulingContext } from "@/store/timeSchedulingStore";
import { getCalendarSlotHeightPx } from "./layoutMetrics";

type ScheduledCustomEvent = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  position: { day: number; startSlot: number; span: number };
  title: string;
  notes?: string | null;
  colorHex?: string | null;
};

export function CustomEventBlock({
  event,
  isOverlay = false,
  className,
  onResize,
}: {
  event: ScheduledCustomEvent;
  isOverlay?: boolean;
  className?: string;
  onResize?: (eventId: string, newDuration: number, resizeDirection: "top" | "bottom") => void;
}) {
  const schedulingContext = useSchedulingContext();
  const minutesPerSlot = schedulingContext.config.interval;
  const slotHeightPx = getCalendarSlotHeightPx(minutesPerSlot);

  const [isResizing, setIsResizing] = React.useState(false);
  const blockRef = React.useRef<HTMLDivElement | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: isOverlay ? `custom-overlay:${event.id}` : `custom:${event.id}`,
    data: {
      type: "custom-event",
      item: event,
    },
    disabled: isOverlay || isResizing,
  });

  const setBlockRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      setNodeRef(node);
      blockRef.current = node;
    },
    [setNodeRef]
  );

  const formatDisplayTime = (time: string) => {
    const [h, m] = time.slice(0, 5).split(":").map(Number);
    const normalizedHour = h === 24 ? 0 : h;
    const displayHour =
      normalizedHour > 12 ? normalizedHour - 12 : normalizedHour === 0 ? 12 : normalizedHour;
    const period = normalizedHour >= 12 ? "PM" : "AM";
    return `${displayHour}:${String(m).padStart(2, "0")} ${period}`;
  };

  const handleResizeStart = React.useCallback(
    (direction: "top" | "bottom", e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (!onResize) return;

      setIsResizing(true);
      const initialMouseY = e.clientY;
      const blockElement = blockRef.current;
      if (!blockElement) return;

      const baseTransform = blockElement.style.transform;
      const minDuration = minutesPerSlot;
      const initialDuration = Math.max(minDuration, event.duration);

      let lastCalculatedDuration = initialDuration;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!blockElement) return;
        moveEvent.preventDefault();
        moveEvent.stopPropagation();

        const deltaY = moveEvent.clientY - initialMouseY;
        const slotsChanged = Math.round(deltaY / slotHeightPx);
        const minutesChanged = slotsChanged * minutesPerSlot;

        let newDuration =
          direction === "bottom"
            ? Math.max(minDuration, initialDuration + minutesChanged)
            : Math.max(minDuration, initialDuration - minutesChanged);

        newDuration = Math.max(minDuration, Math.round(newDuration / minutesPerSlot) * minutesPerSlot);

        if (newDuration === lastCalculatedDuration) return;
        lastCalculatedDuration = newDuration;

        const newHeight = (newDuration / minutesPerSlot) * slotHeightPx;
        blockElement.style.height = `${newHeight}px`;

        if (direction === "top") {
          const heightDiff = ((newDuration - initialDuration) / minutesPerSlot) * slotHeightPx;
          blockElement.style.transform = baseTransform
            ? `${baseTransform} translateY(${-heightDiff}px)`
            : `translateY(${-heightDiff}px)`;
        }
      };

      const handleMouseUp = () => {
        setIsResizing(false);

        if (blockElement) {
          blockElement.style.transform = baseTransform;
          blockElement.style.height = "";
        }

        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);

        if (lastCalculatedDuration !== initialDuration) {
          onResize(event.id, lastCalculatedDuration, direction);
        }
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [event.duration, event.id, minutesPerSlot, onResize, slotHeightPx]
  );

  const style = {
    transform: transform ? CSS.Transform.toString(transform) : undefined,
  };

  const colorHex = event.colorHex || "#94a3b8";
  const tint = `${colorHex}1f`; // ~12% alpha

  return (
    <div
      ref={setBlockRef}
      style={style}
      className={cn(
        "relative h-full w-full rounded-xl border border-stroke-200 bg-bg-0 shadow-sm",
        "overflow-hidden flex flex-col",
        isDragging && "opacity-50",
        className
      )}
    >
      {/* Accent */}
      <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: colorHex }} />
      <div className="absolute inset-0" style={{ backgroundColor: tint }} />

      {/* Resize handles */}
      {onResize && !isOverlay ? (
        <>
          <button
            type="button"
            className="absolute left-0 right-0 top-0 h-2 cursor-ns-resize z-20"
            onMouseDown={(e) => handleResizeStart("top", e)}
            aria-label="Resize custom event (start time)"
          />
          <button
            type="button"
            className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize z-20"
            onMouseDown={(e) => handleResizeStart("bottom", e)}
            aria-label="Resize custom event (end time)"
          />
        </>
      ) : null}

      <div
        className={cn(
          "relative z-10 flex-1 min-h-0 px-3 py-2",
          "flex flex-col gap-1"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-ink-900 truncate leading-tight">
              {event.title}
            </div>
            <div className="mt-0.5 flex items-center text-xs text-ink-500">
              <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
              <span className="truncate">
                {formatDisplayTime(event.startTime)} – {formatDisplayTime(event.endTime)}
              </span>
            </div>
          </div>

          {!isOverlay ? (
            <div
              className={cn(
                "shrink-0 rounded-md p-1 text-ink-500 hover:text-ink-900",
                "cursor-grab active:cursor-grabbing"
              )}
              {...listeners}
              {...attributes}
              aria-label="Drag custom event"
              title="Drag"
            >
              <GripVertical className="h-4 w-4" />
            </div>
          ) : null}
        </div>

        {event.notes ? (
          <div className="text-[11px] text-ink-600 line-clamp-2">{event.notes}</div>
        ) : null}
      </div>
    </div>
  );
}
