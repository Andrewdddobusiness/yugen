"use client";
import { useState } from "react";
import { useIsMobile } from "@/components/hooks/use-mobile";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TimePopover from "@/components/shared/TimePopover";

import { DatePickerPopover } from "@/components/date/DatePickerPopover";

import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";
import { NotesPopover } from "@/components/shared/NotesPopover";
import { ChevronDown, MapPin, Phone, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useDateRangeStore } from "@/store/dateRangeStore";

import { useParams } from "next/navigation";
import ItineraryTableRow from "@/components/table/ItineraryTableRow";
import { ItineraryTableDateHeader } from "@/components/table/ItineraryTableDateHeader";
import { useQueryClient } from "@tanstack/react-query";

interface ItineraryTableViewProps {
  showMap?: boolean;
  onToggleMap?: () => void;
}

export function ItineraryTableView({ showMap, onToggleMap }: ItineraryTableViewProps) {
  const isMobile = useIsMobile();
  const { itineraryId } = useParams();
  const queryClient = useQueryClient();
  const { saveViewState, getViewState } = useItineraryLayoutStore();

  /* STATE */
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  
  // Initialize expanded cards from store
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>(() => {
    const viewState = getViewState('table');
    const expanded: { [key: string]: boolean } = {};
    viewState.expandedCards.forEach(cardId => {
      expanded[cardId] = true;
    });
    return expanded;
  });

  /* STORE */
  const { itineraryActivities, removeItineraryActivity } = useItineraryActivityStore();
  const { startDate, endDate } = useDateRangeStore();

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => {
      const newExpanded = {
        ...prev,
        [id]: !prev[id],
      };
      
      // Save expanded cards to store
      const expandedCardIds = Object.keys(newExpanded).filter(cardId => newExpanded[cardId]);
      saveViewState('table', {
        expandedCards: expandedCardIds
      });
      
      return newExpanded;
    });
  };

  const handleNotesChange = (id: string, value: string) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
  };

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

  const groupActivitiesByDate = (activities: typeof itineraryActivities) => {
    const groups: { [key: string]: typeof activities } = {
      unscheduled: [],
    };

    activities.forEach((activity) => {
      if (!activity.date) {
        groups.unscheduled.push(activity);
      } else {
        const date = new Date(activity.date).toISOString().split("T")[0];
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(activity);
      }
    });

    if (groups.unscheduled.length === 0) {
      delete groups.unscheduled;
    }

    return Object.entries(groups).sort(([dateA], [dateB]) => {
      if (dateA === "unscheduled") return 1;
      if (dateB === "unscheduled") return -1;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
  };

  const formatDate = (dateString: string) => {
    if (dateString === "unscheduled") return "Unscheduled";
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const itineraryActivitiesOnlyActivities = itineraryActivities.filter(
    (itineraryActivity) => itineraryActivity.deleted_at === null
  );

  const groupedActivities = groupActivitiesByDate(itineraryActivitiesOnlyActivities);

  const handleRemoveActivity = async (placeId: string) => {
    try {
      if (!itineraryId) return;
      await removeItineraryActivity(placeId, Array.isArray(itineraryId) ? itineraryId[0] : itineraryId);

      // Refresh the activities list
      queryClient.invalidateQueries({
        queryKey: ["itineraryActivities"],
      });
    } catch (error) {
      console.error("Error removing activity:", error);
    }
  };

  if (isMobile) {
    return (
      <div className="space-y-6 p-4 z-0 ">
        {groupedActivities.map(([date, activities], groupIndex) => (
          <div key={date} className="space-y-2">
            <h3 className="font-medium text-gray-900">{formatDate(date)}</h3>

            <div className="space-y-2">
              {activities.map((activity, index) => (
                <div
                  key={activity.itinerary_activity_id}
                  className={cn("bg-white rounded-lg shadow-sm border border-gray-200", index !== 0 && "-mt-[1px]")}
                >
                  <Button
                    variant="ghost"
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                    onClick={() => toggleCard(activity.itinerary_activity_id)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{activity.activity?.name}</span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "h-5 w-5 transition-transform duration-200",
                          expandedCards[activity.itinerary_activity_id] && "rotate-180"
                        )}
                      />
                    </div>
                  </Button>

                  <div
                    className={cn(
                      "grid transition-all duration-200 ease-in-out",
                      expandedCards[activity.itinerary_activity_id]
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="p-4 pt-0 space-y-3 border-t">
                        <div className="grid grid-cols-2 gap-2 pt-2">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Date</div>
                            <DatePickerPopover
                              itineraryActivityId={Number(activity.itinerary_activity_id)}
                              showText={true}
                              styled={true}
                              startDate={startDate || undefined}
                              endDate={endDate || undefined}
                            />
                          </div>

                          <div>
                            <div className="text-xs text-gray-500 mb-1">Time</div>
                            <TimePopover
                              itineraryActivityId={Number(activity.itinerary_activity_id)}
                              storeStartTime={activity.start_time}
                              storeEndTime={activity.end_time}
                              showText={true}
                              styled={true}
                            />
                          </div>
                        </div>

                        {activity.activity?.address && (
                          <div className="flex items-start space-x-3 text-sm text-gray-600">
                            <MapPin size={16} />
                            <span>{activity.activity.address}</span>
                          </div>
                        )}

                        {activity.activity?.phone_number && (
                          <div className="flex items-center space-x-3 text-sm text-gray-600">
                            <Phone size={16} />
                            <Link href={`tel:${activity.activity.phone_number}`} className="hover:underline">
                              {activity.activity.phone_number}
                            </Link>
                          </div>
                        )}

                        {activity.activity?.website_url && (
                          <div className="flex items-center space-x-3 text-sm text-gray-600">
                            <Globe size={16} />
                            <Link
                              href={activity.activity.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline truncate text-blue-500"
                            >
                              {activity.activity.website_url}
                            </Link>
                          </div>
                        )}

                        <div>
                          <div className="text-xs text-gray-500 mb-1">Notes</div>
                          <NotesPopover
                            id={activity.itinerary_activity_id}
                            value={notes[activity.itinerary_activity_id] || ""}
                            onChange={handleNotesChange}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-md w-full h-full overflow-x-auto bg-white">
      <Table className="relative">
        <TableHeader>
          <TableRow className="flex w-full text-md">
            <TableHead className="flex items-center w-[20%] min-w-[200px] text-black">Activity Name</TableHead>
            <TableHead className="flex items-center w-[10%] min-w-[100px] text-black">Type</TableHead>
            <TableHead className="flex items-center w-[20%] min-w-[200px] text-black">Address</TableHead>
            <TableHead className="flex items-center w-[15%] min-w-[150px] text-black">Date</TableHead>
            <TableHead className="flex items-center w-[15%] min-w-[150px] text-black">Time</TableHead>
            <TableHead className="flex items-center w-[20%] min-w-[200px] text-black">Notes</TableHead>
            <TableHead className="flex items-center w-[5%] min-w-[50px] text-black"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedActivities
            .map(([date, activities]) => [
              <ItineraryTableDateHeader key={`header-${date}`} date={date} formatDate={formatDate} />,
              ...activities.map((activity) => (
                <ItineraryTableRow
                  key={activity.itinerary_activity_id}
                  activity={activity}
                  notes={notes}
                  onNotesChange={handleNotesChange}
                  onRemoveActivity={handleRemoveActivity}
                  startDate={startDate || undefined}
                  endDate={endDate || undefined}
                  showMap={showMap}
                  onToggleMap={onToggleMap}
                />
              )),
            ])
            .flat()}
        </TableBody>
      </Table>
    </div>
  );
}
