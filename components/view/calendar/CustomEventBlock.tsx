"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Clock, GripVertical, LogIn, LogOut, Plane, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSchedulingContext } from "@/store/timeSchedulingStore";
import { getCalendarSlotHeightPx } from "./layoutMetrics";
import { useToast } from "@/components/ui/use-toast";
import { createItineraryCustomEvent, deleteItineraryCustomEvent } from "@/actions/supabase/customEvents";
import { useItineraryCustomEventStore } from "@/store/itineraryCustomEventStore";
import type { AnchorRect } from "./CustomEventPopover";
import { CustomEventBlockPopover } from "./CustomEventBlockPopover";
import type { ScheduledCustomEvent } from "./hooks/useScheduledCustomEvents";

const kindToIcon = (kind: ScheduledCustomEvent["kind"]) => {
  switch (kind) {
    case "flight":
      return Plane;
    case "hotel_check_in":
      return LogIn;
    case "hotel_check_out":
      return LogOut;
    default:
      return StickyNote;
  }
};

export function CustomEventBlock({
  event,
  isOverlay = false,
  className,
  onResize,
  onEdit,
}: {
  event: ScheduledCustomEvent;
  isOverlay?: boolean;
  className?: string;
  onResize?: (eventId: string, newDuration: number, resizeDirection: "top" | "bottom") => void;
  onEdit?: (event: ScheduledCustomEvent, anchorRect: AnchorRect) => void;
}) {
  const schedulingContext = useSchedulingContext();
  const { toast } = useToast();
  const getCustomEventById = useItineraryCustomEventStore((s) => s.getCustomEventById);
  const upsertCustomEvent = useItineraryCustomEventStore((s) => s.upsertCustomEvent);
  const removeCustomEvent = useItineraryCustomEventStore((s) => s.removeCustomEvent);

  const minutesPerSlot = schedulingContext.config.interval;
  const slotHeightPx = getCalendarSlotHeightPx(minutesPerSlot);

  const [isResizing, setIsResizing] = React.useState(false);
  const [contextMenu, setContextMenu] = React.useState<null | { x: number; y: number }>(null);
  const [showPopover, setShowPopover] = React.useState(false);
  const [popoverPosition, setPopoverPosition] = React.useState({ x: 0, y: 0 });
  const blockRef = React.useRef<HTMLDivElement | null>(null);
  const contextMenuRef = React.useRef<HTMLDivElement | null>(null);
  const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const closeContextMenu = React.useCallback(() => setContextMenu(null), []);

  React.useEffect(() => {
    if (!contextMenu) return;
    setShowPopover(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const menu = contextMenuRef.current;
      if (!menu) {
        setContextMenu(null);
        return;
      }
      if (menu.contains(event.target as Node)) return;
      setContextMenu(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    };

    const handleScrollOrResize = () => {
      setContextMenu(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleScrollOrResize);
    window.addEventListener("scroll", handleScrollOrResize, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleScrollOrResize);
      window.removeEventListener("scroll", handleScrollOrResize, true);
    };
  }, [contextMenu]);

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

  const handleMouseEnter = React.useCallback(() => {
    if (isDragging || isResizing || isOverlay) return;
    if (contextMenu) return;

    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      const rect = blockRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPopoverPosition({ x: rect.left + rect.width / 2, y: rect.top });
      setShowPopover(true);
    }, 500);
  }, [contextMenu, isDragging, isOverlay, isResizing]);

  const handleMouseLeave = React.useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowPopover(false);
  }, []);

  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

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

  const KindIcon = kindToIcon(event.kind);

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
    <>
      <div
        ref={setBlockRef}
        style={style}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onContextMenu={(e) => {
          if (isOverlay) return;
          e.preventDefault();
          e.stopPropagation();

          const padding = 8;
          const menuWidth = 220;
          const menuHeight = 128;
          const nextX = Math.min(e.clientX, window.innerWidth - menuWidth - padding);
          const nextY = Math.min(e.clientY, window.innerHeight - menuHeight - padding);
          setContextMenu({ x: nextX, y: nextY });
        }}
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

        <div className={cn("relative z-10 flex-1 min-h-0 px-3 py-2", "flex flex-col gap-1")}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <KindIcon className="h-4 w-4 shrink-0 text-ink-700" aria-hidden="true" />
                <div className="text-sm font-semibold text-ink-900 truncate leading-tight">{event.title}</div>
              </div>
              <div className="mt-0.5 flex items-center text-xs text-ink-500">
                <Clock className="h-3 w-3 mr-1 flex-shrink-0" />
                <span className="truncate">
                  {formatDisplayTime(event.startTime)} - {formatDisplayTime(event.endTime)}
                </span>
              </div>
            </div>

            {!isOverlay ? (
              <div
                className={cn(
                  "shrink-0 rounded-md p-1 text-ink-500 hover:text-ink-900",
                  "cursor-grab active:cursor-grabbing"
                )}
                onClick={(e) => {
                  // Don't toggle hover state / popovers when clicking drag handle.
                  e.stopPropagation();
                }}
                {...listeners}
                {...attributes}
                aria-label="Drag custom event"
                title="Drag"
              >
                <GripVertical className="h-4 w-4" />
              </div>
            ) : null}
          </div>

          {event.notes ? <div className="text-[11px] text-ink-600 line-clamp-2">{event.notes}</div> : null}
        </div>
      </div>

      {contextMenu &&
        createPortal(
          <div
            ref={contextMenuRef}
            className="fixed z-[10000] min-w-56 rounded-lg border border-stroke-200 bg-bg-0 shadow-card p-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <button
              type="button"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-ink-900 hover:bg-bg-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const rect = blockRef.current?.getBoundingClientRect();
                if (!rect || !onEdit) {
                  closeContextMenu();
                  return;
                }
                onEdit(event, {
                  top: rect.top,
                  left: rect.left,
                  right: rect.right,
                  bottom: rect.bottom,
                  width: rect.width,
                  height: rect.height,
                });
                closeContextMenu();
              }}
            >
              Edit
            </button>

            <button
              type="button"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-ink-900 hover:bg-bg-50"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const row = getCustomEventById(event.id);
                if (!row || !row.date || !row.start_time || !row.end_time) {
                  toast({
                    title: "Could not duplicate event",
                    description: "Please try again.",
                    variant: "destructive",
                  });
                  closeContextMenu();
                  return;
                }

                const result = await createItineraryCustomEvent({
                  itinerary_id: row.itinerary_id,
                  itinerary_destination_id: row.itinerary_destination_id ?? null,
                  title: row.title,
                  notes: row.notes ?? null,
                  date: String(row.date).slice(0, 10),
                  start_time: String(row.start_time),
                  end_time: String(row.end_time),
                  color_hex: row.color_hex ?? null,
                });

                if (!result.success || !result.data) {
                  toast({
                    title: "Could not duplicate event",
                    description: "Please try again.",
                    variant: "destructive",
                  });
                  closeContextMenu();
                  return;
                }

                upsertCustomEvent(result.data as any);
                toast({ title: "Duplicated" });
                closeContextMenu();
              }}
            >
              Duplicate
            </button>

            <button
              type="button"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const result = await deleteItineraryCustomEvent(event.id);
                if (!result.success) {
                  toast({
                    title: "Could not remove from calendar",
                    description: "Please try again.",
                    variant: "destructive",
                  });
                  closeContextMenu();
                  return;
                }

                removeCustomEvent(Number(event.id));
                toast({ title: "Removed from calendar" });
                closeContextMenu();
              }}
            >
              Remove from calendar
            </button>
          </div>,
          document.body
        )}

      <CustomEventBlockPopover event={event} isVisible={showPopover} position={popoverPosition} />
    </>
  );
}
