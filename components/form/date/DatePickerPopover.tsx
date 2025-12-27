"use client";

import { format, isWithinInterval } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";

interface DatePickerPopoverProps {
  itineraryActivityId: string;
  showText?: boolean;
  styled?: boolean;
  startDate?: Date;
  endDate?: Date;
}

export function DatePickerPopover({
  itineraryActivityId,
  showText = true,
  styled = true,
  startDate,
  endDate,
}: DatePickerPopoverProps) {
  const itineraryDate = useItineraryActivityStore((s) => {
    const activity = s.itineraryActivities.find(
      (a) => a.itinerary_activity_id === itineraryActivityId
    );
    return activity?.date ?? null;
  });
  const dateData = itineraryDate ? new Date(`${itineraryDate}T00:00:00`) : null;
  const optimisticUpdateItineraryActivity = useItineraryActivityStore(
    (s) => s.optimisticUpdateItineraryActivity
  );

  const disabledDays = (date: Date) => {
    if (!startDate || !endDate) return false;
    
    // Ensure startDate and endDate are Date objects
    const startDateObj = startDate instanceof Date ? startDate : new Date(startDate);
    const endDateObj = endDate instanceof Date ? endDate : new Date(endDate);
    
    // Check if the dates are valid
    if (isNaN(startDateObj.getTime()) || isNaN(endDateObj.getTime())) return false;
    
    // Create new date objects to avoid mutating the originals
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
    const normalizedStart = new Date(startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate(), 12, 0, 0, 0);
    const normalizedEnd = new Date(endDateObj.getFullYear(), endDateObj.getMonth(), endDateObj.getDate(), 12, 0, 0, 0);

    return !isWithinInterval(normalizedDate, {
      start: normalizedStart,
      end: normalizedEnd,
    });
  };

  const handleDateSelect = async (newDate: Date | undefined) => {
    const isoDate = newDate ? format(newDate, "yyyy-MM-dd") : null;
    await optimisticUpdateItineraryActivity(itineraryActivityId, {
      date: isoDate,
    });
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={styled ? "outline" : "ghost"}
            className={cn(
              styled && "w-full rounded-xl text-muted-foreground min-w-32 justify-start text-left font-normal text-xs",
              styled && !dateData && "text-muted-foreground",
              !styled && "flex justify-center items-center p-0 h-auto "
            )}
          >
            <div className="flex items-center gap-2 line-clamp-1">
              <CalendarIcon size={16} />
              {showText && (dateData ? format(dateData, "PPP") : <span>Pick a date</span>)}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-0" 
          align="start"
        >
          <Calendar
            mode="single"
            selected={dateData || undefined}
            onSelect={handleDateSelect}
            disabled={disabledDays}
            defaultMonth={startDate instanceof Date ? startDate : startDate ? new Date(startDate) : new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
