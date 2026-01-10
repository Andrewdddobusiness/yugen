"use client";

import React from "react";
import { createPortal } from "react-dom";
import { Calendar, FileText } from "lucide-react";

interface ScheduledCustomEvent {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  duration: number;
  position: { day: number; startSlot: number; span: number };
  title: string;
  notes?: string | null;
  colorHex?: string | null;
}

interface CustomEventBlockPopoverProps {
  event: ScheduledCustomEvent;
  isVisible: boolean;
  position: { x: number; y: number };
}

export function CustomEventBlockPopover({ event, isVisible, position }: CustomEventBlockPopoverProps) {
  if (!isVisible) return null;

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getDurationText = (duration: number) => {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;

    if (hours === 0) return `${minutes} minutes`;
    if (minutes === 0) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return createPortal(
    <div
      className="fixed z-[9999] w-80 glass rounded-xl p-4 pointer-events-none"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -100%)",
      }}
    >
      {/* Header */}
      <div className="mb-3">
        <div className="font-semibold text-ink-900 dark:text-white/90 text-base leading-tight mb-1">
          {event.title || "Untitled note"}
        </div>
        <div className="text-sm text-ink-500 dark:text-white/60">Note</div>
      </div>

      {/* Date and Time */}
      <div className="flex items-center text-sm text-ink-700 dark:text-white/80 mb-3">
        <Calendar className="h-4 w-4 mr-2 text-ink-500 dark:text-white/60" />
        <div>
          <div className="font-medium">{formatDate(event.date)}</div>
          <div className="text-ink-500 dark:text-white/60">
            {formatTime(event.startTime)} - {formatTime(event.endTime)}
            <span className="ml-1">({getDurationText(event.duration)})</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      {event.notes ? (
        <div className="border-t border-stroke-200/60 dark:border-white/10 pt-3">
          <div className="flex items-start">
            <FileText className="h-4 w-4 text-ink-500 dark:text-white/60 mr-2 mt-0.5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-ink-500 dark:text-white/60 mb-1">Details</div>
              <p className="text-sm text-ink-700 dark:text-white/80 whitespace-pre-wrap break-words">
                {event.notes}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* Arrow pointer */}
      <div className="absolute top-full left-1/2 transform -translate-x-1/2">
        <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-stroke-200/60 dark:border-t-white/10" />
        <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white/75 dark:border-t-ink-900/55 absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-px" />
      </div>
    </div>,
    document.body
  );
}
