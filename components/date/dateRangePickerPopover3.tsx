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

export function DatePickerWithRangePopover3({ selectedDateRange, onDateRangeConfirm }: DatePickerWithRangeProps) {
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
    <div className={cn("grid gap-2")}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal text-xs rounded-full h-8",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 w-4 h-3.5" />
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
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
            fromDate={today}
          />
          <div className="flex justify-end gap-2 p-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm} disabled={!date?.from || !date?.to}>
              Update
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
