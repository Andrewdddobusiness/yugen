// DatePickerWithRange.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerWithRangeProps extends React.HTMLAttributes<HTMLDivElement> {
  selectedDateRange?: DateRange | undefined;
  onDateRangeConfirm: (dateRange: DateRange | undefined) => void;
}

export function DatePickerWithRangePopover2({
  className,
  selectedDateRange,
  onDateRangeConfirm,
}: DatePickerWithRangeProps) {
  // Local state for the calendar selection
  const [date, setDate] = useState<DateRange | undefined>(selectedDateRange);
  const [isOpen, setIsOpen] = useState(false);

  // Update local state when prop changes
  useEffect(() => {
    setDate(selectedDateRange);
  }, [selectedDateRange]);

  const handleSelect = (newDate: DateRange | undefined) => {
    setDate(newDate);
  };

  const handleConfirm = () => {
    onDateRangeConfirm(date);
    setIsOpen(false);
  };

  const handleCancel = () => {
    // Revert any unconfirmed selections in the popover.
    setDate(selectedDateRange);
    setIsOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    // If the user dismisses the popover (ESC / outside click), revert drafts.
    if (!nextOpen) {
      setDate(selectedDateRange);
    }
    setIsOpen(nextOpen);
  };

  const label = React.useMemo(() => {
    if (!date?.from) return "Pick a date range";
    if (!date.to) return format(date.from, "MMM d, yyyy");

    const from = date.from;
    const to = date.to;

    if (from.toDateString() === to.toDateString()) return format(from, "MMM d, yyyy");

    const sameYear = from.getFullYear() === to.getFullYear();
    const sameMonth = sameYear && from.getMonth() === to.getMonth();

    if (sameMonth) return `${format(from, "MMM d")} - ${format(to, "d, yyyy")}`;
    if (sameYear) return `${format(from, "MMM d")} - ${format(to, "MMM d, yyyy")}`;
    return `${format(from, "MMM d, yyyy")} - ${format(to, "MMM d, yyyy")}`;
  }, [date?.from, date?.to]);

  const today = new Date();

  return (
    <div className={cn("grid gap-2 relative z-50", className)}>
      <Popover modal={true} open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal min-h-[44px] min-w-0 overflow-hidden",
              "active:scale-95 transition-transform duration-200",
              "touch-manipulation cursor-pointer",
              !date && "text-muted-foreground"
            )}
            onClick={() => setIsOpen(true)}
          >
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[calc(100vw-2rem)] sm:w-auto p-0 z-[100]"
          align="center"
          sideOffset={4}
          side="bottom"
          forceMount
        >
          <div className="flex flex-col sm:flex-row">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleSelect}
              numberOfMonths={1}
              fromDate={today}
              className="rounded-md border-0"
            />
          </div>
          <div className="flex justify-end gap-2 p-3 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="min-h-[36px] rounded-xl shadow-lg text-gray-800"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={!date?.from || !date?.to}
              className="min-h-[36px] bg-[#3F5FA3] rounded-xl shadow-lg text-white hover:bg-[#3F5FA3]/90 active:scale-95 transition-all duration-300"
            >
              Confirm
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
