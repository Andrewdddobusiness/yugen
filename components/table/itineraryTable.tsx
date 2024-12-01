"use client";
import { useState } from "react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import TimePopover from "@/components/time/timePopover";
import { Badge } from "@/components/ui/badge";
import { DatePickerPopover } from "@/components/date/datePickerPopover";

import { formatCategoryType } from "@/utils/formatting/types";

import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { Textarea } from "../ui/textarea";
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

  return (
    <div className="rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Activity Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Address</TableHead>
            <TableHead>Time</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="w-[300px]">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="">
          {itineraryActivities.map((activity) => (
            <TableRow key={activity.itinerary_activity_id}>
              <TableCell>{activity.activity?.name}</TableCell>
              <TableCell>
                {activity.activity?.types && (
                  <Badge variant={getTypeBadgeVariant(activity?.activity.types[0])}>
                    <span className="line-clamp-1">{formatCategoryType(activity?.activity.types[0])}</span>
                  </Badge>
                )}
              </TableCell>
              <TableCell>{activity.activity?.address}</TableCell>
              <TableCell>
                <TimePopover
                  itineraryActivityId={Number(activity.itinerary_activity_id)}
                  storeStartTime={activity.start_time}
                  storeEndTime={activity.end_time}
                  showText={true}
                  styled={true}
                />
              </TableCell>
              <TableCell>
                <DatePickerPopover
                  itineraryActivityId={Number(activity.itinerary_activity_id)}
                  showText={true}
                  styled={true}
                />
              </TableCell>
              <TableCell>
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
