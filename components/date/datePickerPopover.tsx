"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fetchFilteredTableData, setTableData } from "@/actions/supabase/actions";
import { useQueryClient } from "@tanstack/react-query";

interface DatePickerPopoverProps {
  itineraryActivityId: number;
}

export function DatePickerPopover({ itineraryActivityId }: DatePickerPopoverProps) {
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(true);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const fetchExistingDate = async () => {
      try {
        const result = await fetchFilteredTableData("itinerary_activity", "date", "itinerary_activity_id", [
          itineraryActivityId.toString(),
        ]);
        if (result.success && result.data && result.data.length > 0) {
          const { date } = result.data[0];
          if (date) {
            setDate(new Date(date));
          }
        }
      } catch (error) {
        console.error("Error fetching existing date:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExistingDate();
  }, [itineraryActivityId]);

  const handleDateSelect = async (newDate: Date | undefined) => {
    setDate(newDate);
    try {
      await setTableData(
        "itinerary_activity",
        {
          itinerary_activity_id: itineraryActivityId,
          date: newDate ? format(newDate, "yyyy-MM-dd") : null,
        },
        ["itinerary_activity_id"]
      );
      // Invalidate and refetch the itinerary activities query
      queryClient.invalidateQueries({ queryKey: ["itineraryActivities"] });
    } catch (error) {
      console.error("Error saving date:", error);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full min-w-40 justify-start text-left font-normal text-xs",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={handleDateSelect} initialFocus />
      </PopoverContent>
    </Popover>
  );
}
