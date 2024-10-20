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

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

interface CalendarProps {
  isLoading: boolean;
}

const DragDropCalendar: React.FC<CalendarProps> = ({ isLoading }) => {
  const [view, setView] = useState("week");
  const { startDate, endDate } = useDateRangeStore();
  const [date, setDate] = useState(startDate || new Date());
  const { activities, updateActivity } = useItineraryActivityStore();

  const events = activities.map((item) => ({
    id: item.itinerary_activity_id,
    title: capitalizeFirstLetterOfEachWord(item.activities.activity_name),
    start: new Date(`${item.date}T${item.start_time}`),
    end: new Date(`${item.date}T${item.end_time}`),
  }));

  const handleEventDrop = async ({ event, start, end }: any) => {
    const activityToUpdate = activities.find(
      (activity) => activity.itinerary_activity_id === event.id
    );
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
      .setActivities(
        activities.map((a) =>
          a.itinerary_activity_id === updatedActivity.itinerary_activity_id
            ? updatedActivity
            : a
        )
      );

    // Then update the database
    try {
      await updateActivity(updatedActivity);
    } catch (error) {
      console.error("Error updating activity:", error);
      // Revert the local change if the database update fails
      useItineraryActivityStore.getState().setActivities(activities);
    }
  };

  const handleEventResize = async ({ event, start, end }: any) => {
    const activityToUpdate = activities.find(
      (activity) => activity.itinerary_activity_id === event.id
    );
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
      .setActivities(
        activities.map((a) =>
          a.itinerary_activity_id === updatedActivity.itinerary_activity_id
            ? updatedActivity
            : a
        )
      );

    // Update local store immediately
    useItineraryActivityStore.getState().updateActivity(updatedActivity);

    // Then update the database
    try {
      await updateActivity(updatedActivity);
    } catch (error) {
      console.error("Error updating activity:", error);
      // Revert the local change if the database update fails
      useItineraryActivityStore.getState().setActivities(activities);
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
      return (
        <div className="text-sm font-semibold text-gray-800 p-1 text-center h-10">
          {label}
        </div>
      );
    }
  };

  useEffect(() => {
    if (startDate) {
      setDate(startDate);
    }
  }, [startDate]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-full h-full rounded-xl border border-zinc-200 relative pb-14">
      <div className="w-full h-[50px] bg-zinc-100 rounded-t-xl border-b border-zinc-200 flex items-center justify-between">
        <div className="text-sm font-bold ml-4">{formatHeaderDate()}</div>

        <div className="mr-4 flex flex-row items-center">
          <div className="overflow-hidden flex flex-row">
            <Button
              className="h-8 px-4 py-2 rounded-l-lg rounded-r-none flex items-center"
              onClick={() =>
                handleNavigate(moment(date).subtract(1, view).toDate())
              }
            >
              <ChevronLeft size={12} />
            </Button>
            <Button
              className="h-8 px-4 py-2 rounded-none text-xs"
              onClick={() => setDate(new Date())}
            >
              Today
            </Button>
            <Button
              className="h-8 px-4 py-2 rounded-r-lg rounded-l-none flex items-center"
              onClick={() => handleNavigate(moment(date).add(1, view).toDate())}
            >
              <ChevronRight size={12} />
            </Button>
          </div>
          <Separator
            orientation="vertical"
            className="h-6 m==][x-4 border-zinc-200"
          />

          <Button
            className="text-xs px-4 h-8 rounded-lg"
            onClick={() => handleViewChange(view === "week" ? "day" : "week")}
          >
            {view === "week" ? "Day View" : "Week View"}
          </Button>
        </div>
      </div>

      <div className="h-[calc(100%-50px)] overflow-y-auto">
        <DnDCalendar
          localizer={localizer}
          events={events}
          view={view as View}
          onView={handleViewChange}
          date={date}
          onNavigate={handleNavigate}
          style={{ height: "100%" }}
          toolbar={false}
          popup
          draggableAccessor={(event: any) => true}
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
          resizable
          components={{
            timeSlotWrapper: ({ children }: any) => (
              <div className="text-xs font-medium text-gray-600">
                {children}
              </div>
            ),
            eventWrapper: ({ event, children }: any) => (
              <div className="text-xs">{children}</div>
            ),
            header: CustomHeader,
          }}
          dayPropGetter={(date: Date) => ({
            className:
              date.getDay() === 0 || date.getDay() === 6
                ? "bg-gray-100"
                : "bg-white",
          })}
          eventPropGetter={(event: any) => ({
            style: {
              backgroundColor: "#171717",
              color: "white",
              borderRadius: "4px",
              border: "none",
              fontSize: "0.65rem",
            },
          })}
        />
      </div>
    </div>
  );
};

export default DragDropCalendar;
