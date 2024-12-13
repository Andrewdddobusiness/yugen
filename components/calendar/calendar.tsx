"use client";
import React, { useState, useEffect } from "react";
import { Calendar, momentLocalizer, View } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "./calendar-custom.css";
import { capitalizeFirstLetterOfEachWord } from "@/utils/formatting/capitalise";
import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { useDateRangeStore } from "@/store/dateRangeStore";
import { setItineraryActivityDateTimes } from "@/actions/supabase/actions";

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

interface CalendarProps {
  isLoading: boolean;
}

const DragDropCalendar: React.FC<CalendarProps> = ({ isLoading }) => {
  const [view, setView] = useState("week");
  const { startDate } = useDateRangeStore();
  const [date, setDate] = useState<Date | null>(null);
  const { itineraryActivities, setItineraryActivities } = useItineraryActivityStore();

  // Initialize calendar with start date
  useEffect(() => {
    if (startDate) {
      setDate(new Date(startDate));
    } else {
      // Fallback to today if no start date
      setDate(new Date());
    }
    console.log("startDate: ", startDate);
  }, [startDate]);

  // Don't render calendar until we have a valid date
  if (!date || isLoading) {
    return <div>Loading...</div>;
  }

  const events = itineraryActivities
    .filter((item) => item.date && item.start_time && item.end_time) // Filter out invalid items
    .map((item) => ({
      id: item.itinerary_activity_id,
      title: capitalizeFirstLetterOfEachWord(item.activity?.name || ""),
      start: new Date(`${item.date}T${item.start_time}`),
      end: new Date(`${item.date}T${item.end_time}`),
    }));

  const handleEventDrop = async ({ event, start, end }: any) => {
    const activityToUpdate = itineraryActivities.find((activity: any) => activity.itinerary_activity_id === event.id);
    if (!activityToUpdate) return;

    const updatedActivity = {
      ...activityToUpdate,
      date: moment(start).format("YYYY-MM-DD"),
      start_time: moment(start).format("HH:mm:ss"),
      end_time: moment(end).format("HH:mm:ss"),
    };

    // Update local store immediately
    useItineraryActivityStore
      .getState()
      .setItineraryActivities(
        itineraryActivities.map((a) =>
          a.itinerary_activity_id === updatedActivity.itinerary_activity_id ? updatedActivity : a
        )
      );

    // Then update the database
    try {
      await setItineraryActivityDateTimes(
        updatedActivity.itinerary_activity_id,
        updatedActivity.date,
        updatedActivity.start_time,
        updatedActivity.end_time
      );
    } catch (error) {
      console.error("Error updating activity:", error);
      // Revert the local change if the database update fails
      setItineraryActivities(itineraryActivities);
    }
  };

  const handleEventResize = async ({ event, start, end }: any) => {
    const activityToUpdate = itineraryActivities.find((activity) => activity.itinerary_activity_id === event.id);
    if (!activityToUpdate) return;

    const updatedActivity = {
      ...activityToUpdate,
      date: moment(start).format("YYYY-MM-DD"),
      start_time: moment(start).format("HH:mm:ss"),
      end_time: moment(end).format("HH:mm:ss"),
    };

    // Update local store immediately
    useItineraryActivityStore
      .getState()
      .setItineraryActivities(
        itineraryActivities.map((a) =>
          a.itinerary_activity_id === updatedActivity.itinerary_activity_id ? updatedActivity : a
        )
      );

    // Update local store immediately
    useItineraryActivityStore.getState().updateItineraryActivity(updatedActivity);

    // Then update the database
    try {
      await setItineraryActivityDateTimes(
        updatedActivity.itinerary_activity_id,
        updatedActivity.date,
        updatedActivity.start_time,
        updatedActivity.end_time
      );
    } catch (error) {
      console.error("Error updating activity:", error);
      // Revert the local change if the database update fails
      setItineraryActivities(itineraryActivities);
    }
  };

  const handleNavigate = (newDate: Date) => {
    setDate(newDate);
  };

  const handleViewChange = (newView: string) => {
    setView(newView);
  };

  const formatHeaderDate = () => {
    if (view === "day") {
      return moment(date).format("dddd, MMMM D, YYYY");
    } else {
      return moment(date).format("MMMM YYYY");
    }
  };

  const CustomHeader = ({ date, label, view }: any) => {
    if (view === "day") {
      return null;
    } else {
      return <div className="text-sm font-semibold text-gray-800 p-1 text-center h-10 ">{label}</div>;
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="w-full bg-white flex items-center justify-between p-4">
        <div className="text-sm font-bold">{formatHeaderDate()}</div>

        <div className="flex flex-row items-center">
          <div className="overflow-hidden flex flex-row">
            <Button
              className="h-8 px-4 py-2 rounded-l-lg rounded-r-none flex items-center"
              onClick={() =>
                handleNavigate(
                  moment(date)
                    .subtract(1, view === "week" ? "weeks" : "days")
                    .toDate()
                )
              }
            >
              <ChevronLeft size={12} />
            </Button>
            <Button className="h-8 px-4 py-2 rounded-none text-xs" onClick={() => setDate(new Date())}>
              Today
            </Button>
            <Button
              className="h-8 px-4 py-2 rounded-r-lg rounded-l-none flex items-center"
              onClick={() =>
                handleNavigate(
                  moment(date)
                    .add(1, view === "week" ? "weeks" : "days")
                    .toDate()
                )
              }
            >
              <ChevronRight size={12} />
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6 " />

          <Button
            className="text-xs px-4 h-8 rounded-lg"
            onClick={() => handleViewChange(view === "week" ? "day" : "week")}
          >
            {view === "week" ? "Day View" : "Week View"}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white">
        <DnDCalendar
          className="h-full"
          localizer={localizer}
          events={events}
          view={view as View}
          onView={handleViewChange}
          date={date}
          onNavigate={handleNavigate}
          toolbar={false}
          popup
          draggableAccessor={(event: any) => true}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          resizable
          components={{
            timeSlotWrapper: ({ children }: any) => <div className="text-xs font-medium text-gray-600">{children}</div>,
            eventWrapper: ({ event, children }: any) => <div className="text-xs">{children}</div>,
            header: CustomHeader,
          }}
          dayPropGetter={(date: Date) => ({
            className: date.getDay() === 0 || date.getDay() === 6 ? "bg-gray-100" : "bg-white",
          })}
        />
      </div>
    </div>
  );
};

export default DragDropCalendar;
