"use client";
import { useState } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import TimePopover from "@/components/time/timePopover";
import { Badge } from "@/components/ui/badge";
import { DatePickerPopover } from "@/components/date/datePickerPopover";

import { formatCategoryType } from "@/utils/formatting/types";

import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { NotesPopover } from "@/components/popover/notesPopover";

export function ItineraryTableView() {
  const { itineraryActivities } = useItineraryActivityStore();
  const [notes, setNotes] = useState<{ [key: string]: string }>({});

  const handleNotesChange = (id: string, value: string) => {
    setNotes((prev) => ({ ...prev, [id]: value }));
    // You might want to save this to your database
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

  // filter activities that are active and not deleted with delete_at
  const itineraryActivitiesOnlyActivities = itineraryActivities.filter(
    (itineraryActivity) => itineraryActivity.deleted_at === null
  );

  return (
    <div className="rounded-md w-full h-full overflow-x-auto bg-white">
      <Table className="relative">
        <TableHeader>
          <TableRow className="flex w-full text-md ">
            <TableHead className="flex items-center w-[20%] min-w-[200px] text-black">Activity Name</TableHead>
            <TableHead className="flex items-center w-[10%] min-w-[100px] text-black">Type</TableHead>
            <TableHead className="flex items-center w-[20%] min-w-[200px] text-blacks">Address</TableHead>
            <TableHead className="flex items-center w-[15%] min-w-[150px] text-black">Time</TableHead>
            <TableHead className="flex items-center w-[15%] min-w-[150px] text-black">Date</TableHead>
            <TableHead className="flex items-center w-[20%] min-w-[200px] text-black">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {itineraryActivitiesOnlyActivities.map((activity) => (
            <TableRow key={activity.itinerary_activity_id} className="flex w-full">
              <TableCell className=" w-[20%] min-w-[200px]">{activity.activity?.name}</TableCell>
              <TableCell className="w-[10%] min-w-[100px]">
                {activity.activity?.types && (
                  <Badge variant={getTypeBadgeVariant(activity.activity.types[0])}>
                    <span className="line-clamp-1">{formatCategoryType(activity.activity.types[0])}</span>
                  </Badge>
                )}
              </TableCell>
              <TableCell className="w-[20%] min-w-[200px]">{activity.activity?.address}</TableCell>
              <TableCell className="w-[15%] min-w-[150px]">
                <TimePopover
                  itineraryActivityId={Number(activity.itinerary_activity_id)}
                  storeStartTime={activity.start_time}
                  storeEndTime={activity.end_time}
                  showText={true}
                  styled={true}
                />
              </TableCell>
              <TableCell className="w-[15%] min-w-[150px]">
                <DatePickerPopover
                  itineraryActivityId={Number(activity.itinerary_activity_id)}
                  showText={true}
                  styled={true}
                />
              </TableCell>
              <TableCell className="w-[20%] min-w-[200px]">
                <NotesPopover
                  id={activity.itinerary_activity_id}
                  value={notes[activity.itinerary_activity_id] || ""}
                  onChange={handleNotesChange}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
