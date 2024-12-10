// DatePickerWithRange.tsx
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/components/lib/utils";
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

  const today = new Date();

  return (
    <div className={cn("grid gap-2 relative")}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal min-h-[44px]",
              "active:scale-95 transition-transform duration-200",
              "touch-manipulation",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[100]" align="start" sideOffset={4} side="bottom">
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
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)} className="min-h-[36px]">
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={!date?.from || !date?.to} className="min-h-[36px]">
              Confirm
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
