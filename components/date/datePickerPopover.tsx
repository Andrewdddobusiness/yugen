"use client";

import React from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { format, isWithinInterval } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchFilteredTableData, setTableData } from "@/actions/supabase/actions";
import { createClient } from "@/utils/supabase/client";

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

  const updateDateMutation = useMutation({
    mutationFn: async (newDate: Date | undefined) => {
      console.log("Attempting to update itinerary_activity_id:", itineraryActivityId);
      console.log("New date:", newDate ? format(newDate, "yyyy-MM-dd") : null);
      
      const supabase = createClient();
      const { data, error } = await supabase
        .from("itinerary_activity")
        .update({
          date: newDate ? format(newDate, "yyyy-MM-dd") : null,
        })
        .eq("itinerary_activity_id", itineraryActivityId)
        .select();

      if (error) {
        console.error("Update error:", error);
        throw error;
      }

      console.log("Update successful:", data);
      return newDate;
    },
    onMutate: async (newDate) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["itineraryActivity", "date", itineraryActivityId],
      });

      // Snapshot the previous value
      const previousDate = queryClient.getQueryData(["itineraryActivity", "date", itineraryActivityId]);

      // Optimistically update to the new value
      queryClient.setQueryData(["itineraryActivity", "date", itineraryActivityId], newDate);

      // Return a context with the previous and new date
      return { previousDate, newDate };
    },
    onError: (err, newDate, context) => {
      // If the mutation fails, use the context to roll back
      if (context?.previousDate !== undefined) {
        queryClient.setQueryData(
          ["itineraryActivity", "date", itineraryActivityId], 
          context.previousDate
        );
      }
      console.error("Error saving date:", err);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure cache is correct
      queryClient.invalidateQueries({
        queryKey: ["itineraryActivities"],
      });
      queryClient.invalidateQueries({
        queryKey: ["itineraryActivity", "date", itineraryActivityId],
      });
    },
  });

  const handleDateSelect = (newDate: Date | undefined) => {
    updateDateMutation.mutate(newDate);
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
