"use client";

import React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, isWithinInterval } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchFilteredTableData, setTableData } from "@/actions/supabase/actions";

interface DatePickerPopoverProps {
  itineraryActivityId: number;
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
  const queryClient = useQueryClient();

  const { data: dateData, isLoading } = useQuery({
    queryKey: ["itineraryActivity", "date", itineraryActivityId],
    queryFn: async () => {
      const result = await fetchFilteredTableData("itinerary_activity", "date", "itinerary_activity_id", [
        itineraryActivityId.toString(),
      ]);

      if (result.success && result.data?.[0]?.date) {
        return new Date(result.data[0].date);
      }
      return null;
    },
    refetchOnWindowFocus: false,
    staleTime: Infinity,
  });

  const disabledDays = (date: Date) => {
    if (!startDate || !endDate) return false;
    // Set time to noon to avoid timezone issues
    const normalizedDate = new Date(date.setHours(12, 0, 0, 0));
    const normalizedStart = new Date(startDate.setHours(12, 0, 0, 0));
    const normalizedEnd = new Date(endDate.setHours(12, 0, 0, 0));

    return !isWithinInterval(normalizedDate, {
      start: normalizedStart,
      end: normalizedEnd,
    });
  };

  const handleDateSelect = async (newDate: Date | undefined) => {
    try {
      await setTableData(
        "itinerary_activity",
        {
          itinerary_activity_id: itineraryActivityId,
          date: newDate ? format(newDate, "yyyy-MM-dd") : null,
        },
        ["itinerary_activity_id"]
      );

      queryClient.invalidateQueries({
        queryKey: ["itineraryActivities"],
      });
      queryClient.invalidateQueries({
        queryKey: ["itineraryActivity", "date", itineraryActivityId],
      });
    } catch (error) {
      console.error("Error saving date:", error);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={styled ? "outline" : "ghost"}
          className={cn(
            styled && "w-full rounded-xl text-muted-foreground min-w-40 justify-start text-left font-normal text-xs",
            styled && !dateData && "text-muted-foreground",
            !styled && "flex justify-center items-center p-0 h-auto "
          )}
        >
          <div className="flex items-center gap-2">
            <CalendarIcon size={16} />
            {showText && (dateData ? format(dateData, "PPP") : <span>Pick a date</span>)}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={dateData || undefined}
          onSelect={handleDateSelect}
          disabled={disabledDays}
          defaultMonth={startDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
