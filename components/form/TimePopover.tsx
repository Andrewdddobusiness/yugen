"use client";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Clock } from "lucide-react";
import { formatTime } from "@/utils/formatting/datetime";
import { cn } from "@/lib/utils";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";

const normalizeTimeToHHmm = (time: string | null | undefined) => {
  if (!time) return "";
  const parts = time.split(":");
  if (parts.length < 2) return "";
  return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
};

const toTimeWithSeconds = (timeHHmm: string) => {
  if (!timeHHmm) return "";
  return timeHHmm.length === 5 ? `${timeHHmm}:00` : timeHHmm;
};

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
  itineraryActivityId: string;
  storeStartTime: string | null;
  storeEndTime: string | null;
  showText?: boolean;
  styled?: boolean;
}) {
  const optimisticUpdateItineraryActivity = useItineraryActivityStore(
    (s) => s.optimisticUpdateItineraryActivity
  );

  const [startTime, setStartTime] = useState(normalizeTimeToHHmm(storeStartTime));
  const [endTime, setEndTime] = useState(normalizeTimeToHHmm(storeEndTime));
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setStartTime(normalizeTimeToHHmm(storeStartTime));
    setEndTime(normalizeTimeToHHmm(storeEndTime));
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
      const result = await optimisticUpdateItineraryActivity(itineraryActivityId, {
        start_time: toTimeWithSeconds(startTime),
        end_time: toTimeWithSeconds(endTime),
      });
      if (!result.success) {
        setError(result.error || "Failed to save times. Please try again.");
        return;
      }
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving times:", error);
      setError("Failed to save times. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => {
        if (open) {
          // When opening
          setIsOpen(true);
        } else {
          // When closing
          setIsOpen(false);
        }
      }}
    >
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant={styled ? "outline" : "ghost"}
          className={cn(
            styled && "w-full rounded-xl min-w-32 justify-start text-left font-normal text-xs",
            styled && "text-muted-foreground",
            !styled && "flex justify-center items-center p-0 h-auto "
          )}
        >
          <div className="flex items-center gap-2 line-clamp-1">
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
      <PopoverContent className="w-72 p-4" onClick={(e) => e.stopPropagation()}>
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
            className="bg-[#3F5FA3] hover:bg-[#3F5FA3]/80 rounded-xl shadow-lg text-white active:scale-95 transition-all duration-300 ease-in-out"
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
