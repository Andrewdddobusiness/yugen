// DatePickerWithRange.tsx
"use client";

import * as React from "react";
import { addDays, format, isValid, parseISO } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { setTableData, fetchFilteredTableData } from "@/actions/supabase/actions";
import { useDateRangeStore } from "@/store/dateRangeStore";
import { useEffect } from "react";

type DatePickerWithRangeProps = React.HTMLAttributes<HTMLDivElement> & {
  itineraryId?: string | null;
  fetchDateRangeProp?: boolean;
  onDateChange?: (dateRange: DateRange | undefined) => void;
};

export function DatePickerWithRangePopover({
  className,
  itineraryId,
  fetchDateRangeProp = true,
  onDateChange,
}: DatePickerWithRangeProps) {
  const [date, setDate] = React.useState<DateRange | undefined>(undefined);
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { setDateRange } = useDateRangeStore();

  useEffect(() => {
    const fetchDateRange = async () => {
      if (itineraryId && fetchDateRangeProp) {
        try {
          const result = await fetchFilteredTableData("itinerary_destination", "from_date, to_date", "itinerary_id", [
            itineraryId,
          ]);
          if (
            result.success &&
            result.data &&
            result.data.length > 0 &&
            "from_date" in result.data[0] &&
            "to_date" in result.data[0]
          ) {
            const { from_date, to_date } = result.data[0];
            const startDate = parseISO(from_date as string);
            const endDate = parseISO(to_date as string);
            if (!isValid(startDate) || !isValid(endDate)) return;
            setDate({
              from: startDate,
              to: endDate,
            });
            setDateRange(startDate, endDate);
            if (onDateChange) {
              onDateChange({ from: startDate, to: endDate }); // Call onRateChange with the fetched date range
            }
          }
        } catch (error) {
          console.error("Error fetching date range:", error);
          setError("Failed to fetch date range. Please try again.");
        }
      }
    };

    fetchDateRange();
  }, [itineraryId, setDateRange, fetchDateRangeProp, onDateChange]);

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    if (newDate?.from && newDate?.to) {
      setDateRange(newDate.from, newDate.to);
      if (onDateChange) {
        onDateChange(newDate);
      }
    }
  };

  const handleSave = async () => {
    if (!date?.from || !date?.to) return;

    setIsLoading(true);
    setError(null);

    try {
      if (fetchDateRangeProp) {
        if (!itineraryId) return;
        const result = await setTableData(
          "itinerary_destination",
          {
            itinerary_id: itineraryId,
            from_date: format(date.from, "yyyy-MM-dd"),
            to_date: format(date.to, "yyyy-MM-dd"),
          },
          ["itinerary_id"]
        );

        if (result.success) {
          setIsOpen(false);
        } else {
          setError("Failed to update date range. Please try again.");
        }
      } else {
        setDateRange(date.from, date.to);
        setIsOpen(false);
      }
    } catch (err) {
      console.error("Error updating date range:", err);
      setError("An error occurred while updating the date range.");
    } finally {
      setIsLoading(false);
    }
  };

  const today = new Date();

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !date && "text-muted-foreground",
              "touch-manipulation cursor-pointer"
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
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleDateChange}
            numberOfMonths={2}
            fromDate={today}
          />
          {error && <p className="text-red-500 p-2 text-sm">{error}</p>}
          <div className="flex justify-end p-2">
            <Button onClick={handleSave} disabled={!date?.from || !date?.to || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
