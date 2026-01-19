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
import { ActivityCreatedBy } from "@/components/collaboration/ActivityCreatedBy";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";
import { ACTIVITY_ACCENT_DOT_CLASSES, getActivityThemeForTypes, hexToRgba } from "@/lib/activityAccent";
import { cn } from "@/lib/utils";
import { SlotOptionsPopover } from "@/components/itinerary/SlotOptionsPopover";

interface ItineraryTableRowProps {
  activity: any; // Replace with proper type
  onRemoveActivity: (placeId: string) => void;
  startDate?: Date;
  endDate?: Date;
  showMap?: boolean;
  onToggleMap?: () => void;
}

export default function ItineraryTableRow({
  activity,
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

  const activityCategoryAccents = useItineraryLayoutStore((s) => s.activityCategoryAccents);
  const activityCategoryCustomColors = useItineraryLayoutStore((s) => s.activityCategoryCustomColors);
  const activityTheme = getActivityThemeForTypes(
    activity.activity?.types,
    activity.activity_id || activity.itinerary_activity_id,
    activityCategoryAccents,
    activityCategoryCustomColors
  );
  const primaryType = activity.activity?.types?.[0];
  const primaryTypeLabel = primaryType ? formatCategoryType(primaryType) : null;
  const customTint = activityTheme.customHex ? hexToRgba(activityTheme.customHex, 0.12) : null;
  const dotClass = activityTheme.customHex ? "bg-transparent" : ACTIVITY_ACCENT_DOT_CLASSES[activityTheme.accent];
  const dotStyle = activityTheme.customHex ? { backgroundColor: activityTheme.customHex } : undefined;

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
      <TableCell className="w-[20%] min-w-[200px]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate">{activity.activity?.name}</div>
            <ActivityCreatedBy userId={activity.created_by} mode="text" textClassName="text-[11px]" />
          </div>
          <div
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <SlotOptionsPopover itineraryActivityId={String(activity.itinerary_activity_id)} />
          </div>
        </div>
      </TableCell>
      <TableCell className="w-[200px] min-w-[200px] shrink-0">
        {primaryTypeLabel && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger className="inline-flex max-w-full p-0">
                <Badge
                  className={cn(
                    "max-w-full min-w-0",
                    "inline-flex items-center gap-1.5",
                    "rounded-full border border-stroke-200",
                    "bg-bg-0 px-2.5 py-1 text-[11px] font-medium text-ink-900 shadow-sm",
                    "hover:bg-bg-50",
                    "dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
                  )}
                  style={activityTheme.customHex ? { borderColor: activityTheme.customHex, backgroundColor: customTint ?? undefined } : undefined}
                  title={primaryTypeLabel}
                >
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", dotClass)} style={dotStyle} />
                  <span className="min-w-0 truncate">{primaryTypeLabel}</span>
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px] break-words">
                <p className="font-medium">{primaryTypeLabel}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>
      <TableCell className="w-[20%] min-w-[200px]">{activity.activity?.address}</TableCell>
      <TableCell className="w-[15%] min-w-[150px]">
        <DatePickerPopover
          itineraryActivityId={activity.itinerary_activity_id}
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
          itineraryActivityId={activity.itinerary_activity_id}
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
          itineraryActivityId={activity.itinerary_activity_id}
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
