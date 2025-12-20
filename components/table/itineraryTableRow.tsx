import { useRef, useEffect } from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DatePickerPopover } from "@/components/form/date/DatePickerPopover";
import TimePopover from "@/components/form/TimePopover";
import { NotesPopover } from "@/components/form/NotesPopover";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCategoryType } from "@/utils/formatting/types";
import { useActivitiesStore } from "@/store/activityStore";
import { useMap } from "@vis.gl/react-google-maps";

interface ItineraryTableRowProps {
  activity: any; // Replace with proper type
  notes: { [key: string]: string };
  onNotesChange: (id: string, value: string) => void;
  onRemoveActivity: (placeId: string) => void;
  startDate?: Date;
  endDate?: Date;
  showMap?: boolean;
  onToggleMap?: () => void;
}

export default function ItineraryTableRow({
  activity,
  notes,
  onNotesChange,
  onRemoveActivity,
  startDate,
  endDate,
  showMap,
  onToggleMap,
}: ItineraryTableRowProps) {
  const { setSelectedActivity } = useActivitiesStore();
  const mapRef = useRef<google.maps.Map | null>(null);
  const map = useMap();

  useEffect(() => {
    if (map) {
      mapRef.current = map;
    }
  }, [map]);

  const getTypeBadgeVariant = (type: string) => {
    switch (type?.toLowerCase()) {
      case "restaurant":
        return "default";
      case "attraction":
        return "secondary";
      default:
        return "default";
    }
  };

  const handleRowClick = () => {
    if (activity.activity) {
      // If map is not visible, show it first
      if (!showMap && onToggleMap) {
        onToggleMap();
      }

      setSelectedActivity(activity.activity || null);
    }
  };

  return (
    <TableRow
      key={activity.itinerary_activity_id}
      className="flex w-full hover:bg-gray-50 cursor-pointer"
      onClick={handleRowClick}
    >
      <TableCell className="w-[20%] min-w-[200px]">{activity.activity?.name}</TableCell>
      <TableCell className="w-[10%] min-w-[100px]">
        {activity.activity?.types && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge
                  variant={getTypeBadgeVariant(activity.activity.types[0])}
                  className="bg-[#3F5FA3] hover:bg-[#3F5FA3]/80 px-2 flex items-center justify-start w-fit"
                >
                  <span className="line-clamp-1 text-left">{formatCategoryType(activity.activity.types[0])}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{formatCategoryType(activity.activity.types[0])}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>
      <TableCell className="w-[20%] min-w-[200px]">{activity.activity?.address}</TableCell>
      <TableCell className="w-[15%] min-w-[150px]">
        <DatePickerPopover
          itineraryActivityId={Number(activity.itinerary_activity_id)}
          showText={true}
          styled={true}
          startDate={startDate}
          endDate={endDate}
        />
      </TableCell>
      <TableCell 
        className="w-[15%] min-w-[150px]"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <TimePopover
          itineraryActivityId={Number(activity.itinerary_activity_id)}
          storeStartTime={activity.start_time}
          storeEndTime={activity.end_time}
          showText={true}
          styled={true}
        />
      </TableCell>
      <TableCell 
        className="w-[20%] min-w-[200px]"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <NotesPopover
          id={activity.itinerary_activity_id}
          value={notes[activity.itinerary_activity_id] || ""}
          onChange={onNotesChange}
        />
      </TableCell>
      <TableCell className="w-[5%] min-w-[50px]">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 cursor-pointer"
              onClick={() => onRemoveActivity(activity.activity?.place_id || "")}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}
