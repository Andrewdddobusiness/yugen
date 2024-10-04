"use client";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Edit, Trash } from "lucide-react";
import TimePopover from "../time/timePopover";

const itinerary = [
  {
    day: "Monday",
    date: "2024-06-17",
    activities: [
      {
        title: "Visit Royal Botanic Gardens",
        description: "Explore the beautiful gardens and greenhouse.",
        timePeriod: "09:00 AM - 11:00 AM",
        cost: "$0.00",
      },
      {
        title: "Lunch at Local Cafe",
        description: "Enjoy a delicious meal at the nearby cafe.",
        timePeriod: "12:00 PM - 01:00 PM",
        cost: "$20.00",
      },
    ],
  },
  {
    day: "Tuesday",
    date: "2024-06-18",
    activities: [
      {
        title: "National Gallery Visit",
        description: "Admire the artworks and exhibitions.",
        timePeriod: "10:00 AM - 12:00 PM",
        cost: "$15.00",
      },
      {
        title: "City Tour",
        description: "Take a guided tour around the city.",
        timePeriod: "02:00 PM - 04:00 PM",
        cost: "$30.00",
      },
    ],
  },
  // Add more mock data as needed
];

export default function ItineraryTable() {
  const [currentDay, setCurrentDay] = useState("Monday");

  const handleDayChange = (day: any) => {
    setCurrentDay(day);
  };

  const handleDelete = (activity: any) => {
    // Handle delete activity logic here
  };

  const handleTimePeriodClick = (activity: any) => {
    // Handle time period adjustment logic here
  };

  return (
    <div className="flex flex-col p-2 px-4 sm:px-8 pt-4">
      {itinerary.map((dayPlan, index) => (
        <div key={index} className="mb-8">
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead colSpan={5} className="text-left text-lg">
                  <div className="flex items-center justify-between">
                    <span>{`${dayPlan.day}, ${dayPlan.date}`}</span>
                  </div>
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Time Period</TableHead>
                <TableHead>Day</TableHead>
                <TableHead className="text-right">Cost</TableHead>

                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dayPlan.activities.map((activity, activityIndex) => (
                <TableRow key={activityIndex}>
                  <TableCell className="font-medium">
                    {activity.title}
                  </TableCell>
                  <TableCell>{activity.description}</TableCell>
                  <TableCell>
                    <button onClick={() => handleTimePeriodClick(activity)}>
                      <TimePopover />
                      {/* {activity.timePeriod} */}
                    </button>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <button className="text-blue-500">{dayPlan.day}</button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {[
                          "Monday",
                          "Tuesday",
                          "Wednesday",
                          "Thursday",
                          "Friday",
                          "Saturday",
                          "Sunday",
                        ].map((day) => (
                          <DropdownMenuItem
                            key={day}
                            onClick={() => handleDayChange(day)}
                          >
                            {day}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-right">{activity.cost}</TableCell>

                  <TableCell>
                    <Trash
                      className="cursor-pointer h-5 w-5 text-red-500"
                      onClick={() => handleDelete(activity)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ))}
    </div>
  );
}
