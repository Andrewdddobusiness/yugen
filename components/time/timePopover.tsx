"use client";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Clock } from "lucide-react";
import { formatTime } from "@/utils/formatting/datetime";
import { cn } from "@/components/lib/utils";
import { setItineraryActivityTimes } from "@/actions/supabase/actions";
import { useQueryClient } from "@tanstack/react-query";

const generateTimeOptions = () => {
  const times = [];
  for (let i = 0; i < 24; i++) {
    for (let j = 0; j < 60; j += 30) {
      times.push(`${i.toString().padStart(2, "0")}:${j.toString().padStart(2, "0")}`);
    }
  }
  return times;
};

const timeOptions = generateTimeOptions();

export default function TimePopover({
  itineraryActivityId,
  storeStartTime,
  storeEndTime,
  showText = true,
  styled = true,
}: {
  itineraryActivityId: number;
  storeStartTime: string;
  storeEndTime: string;
  showText?: boolean;
  styled?: boolean;
}) {
  const queryClient = useQueryClient();

  const [startTime, setStartTime] = useState(storeStartTime);
  const [endTime, setEndTime] = useState(storeEndTime);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setStartTime(storeStartTime);
    setEndTime(storeEndTime);
  }, [storeStartTime, storeEndTime]);

  const handleTimeChange = (type: "start" | "end", value: string) => {
    let newStartTime = startTime;
    let newEndTime = endTime;

    if (type === "start") {
      newStartTime = value;
      setStartTime(value);
    } else {
      newEndTime = value;
      setEndTime(value);
    }

    if (newStartTime && newEndTime) {
      if (newStartTime >= newEndTime) {
        setError("Start time must be before end time.");
      } else {
        setError("");
      }
    }
  };

  const handleSave = async () => {
    if (!startTime || !endTime) {
      setError("Please select both start and end times.");
      return;
    }

    if (error) {
      return;
    }

    setIsLoading(true);
    try {
      await setItineraryActivityTimes(itineraryActivityId.toString(), startTime, endTime);
      queryClient.invalidateQueries({ queryKey: ["itineraryActivities"] });
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving times:", error);
      setError("Failed to save times. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger>
        <Button
          variant={styled ? "outline" : "ghost"}
          className={cn(
            styled && "w-full rounded-xl min-w-40 justify-start text-left font-normal text-xs",
            styled && "text-muted-foreground",
            !styled && "flex justify-center items-center p-0 h-auto "
          )}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} />
            {showText && (
              <p>
                {storeStartTime && storeEndTime
                  ? `${formatTime(storeStartTime)} - ${formatTime(storeEndTime)}`
                  : "Set Time"}
              </p>
            )}
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4">
        <div>
          <h3 className="font-semibold mb-2">Start Time</h3>
          <Select onValueChange={(value) => handleTimeChange("start", value)} value={startTime}>
            <SelectTrigger>
              <SelectValue>{startTime ? formatTime(startTime) : "Select start time"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((time, index) => (
                <SelectItem key={index} value={time}>
                  {formatTime(time)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4">
          <h3 className="font-semibold mb-2">End Time</h3>
          <Select onValueChange={(value) => handleTimeChange("end", value)} value={endTime}>
            <SelectTrigger>
              <SelectValue>{endTime ? formatTime(endTime) : "Select end time"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {timeOptions.map((time, index) => (
                <SelectItem key={index} value={time}>
                  {formatTime(time)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        <div className="mt-4 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!startTime || !endTime || !!error || isLoading}
            className="bg-[#3A86FF] hover:bg-[#3A86FF]/80 rounded-xl shadow-lg text-white active:scale-95 transition-all duration-300 ease-in-out"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
