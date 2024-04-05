import React from "react";
import { hoursOfDay } from "./data";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { ChevronLeft, ChevronRight } from "lucide-react";

const DragDropCalendar: React.FC = () => {
  return (
    <div className="w-full h-full rounded-xl border border-zinc-200 relative pb-14">
      <div className="w-full h-[50px] bg-zinc-100 rounded-t-xl border-b border-zinc-200 flex items-center justify-between">
        <div className="text-sm font-bold ml-4"> January 2024</div>

        <div className="mr-4 flex flex-row items-center">
          <div className="overflow-hidden flex flex-row">
            <Button className="h-8 px-4 py-2 rounded-l-lg rounded-r-none flex items-center">
              <ChevronLeft size={12} />
            </Button>
            <Button className="h-8 px-4 py-2 rounded-none text-xs">
              Today
            </Button>
            <Button className="h-8 px-4 py-2 rounded-r-lg rounded-l-none flex items-center">
              <ChevronRight size={12} />
            </Button>
          </div>
          <Separator
            orientation="vertical"
            className="h-6 mx-4 border-zinc-200"
          />

          <Button className="text-xs px-4 h-8 rounded-lg">+ Add Event</Button>
        </div>
      </div>

      <div className="overflow-y-scroll h-full">
        <div className="w-full min-h-[35px] grid grid-cols-10 lg:grid-cols-23 grid-rows-1 border-b border-zinc-200 shadow-md sticky top-0 z-10 bg-white">
          <div className="col-span-1 border-r"></div>
          <div className="col-span-2 lg:col-span-3 border-r flex justify-center items-center">
            <div className="text-xs text-zinc-500">Mon</div>
            <div className="text-xs text-zinc-900 font-bold ml-1">1</div>
          </div>
          <div className="col-span-2 lg:col-span-3 border-r flex justify-center items-center">
            <div className="text-xs text-zinc-500">Tue</div>
            <div className="text-xs text-zinc-900 font-bold ml-1">2</div>
          </div>
          <div className="col-span-2 lg:col-span-3 border-r flex justify-center items-center">
            <div className="text-xs text-zinc-500">Wed</div>
            <div className="text-xs text-zinc-900 font-bold ml-1">3</div>
          </div>
          <div className="col-span-2 lg:col-span-3 border-r flex justify-center items-center">
            <div className="text-xs text-zinc-500">Thu</div>
            <div className="text-xs text-zinc-900 font-bold ml-1">4</div>
          </div>
          <div className="hidden lg:flex lg:col-span-3 border-r justify-center items-center">
            <div className="text-xs text-zinc-500">Fri</div>
            <div className="text-xs text-zinc-900 font-bold ml-1">5</div>
          </div>
          <div className="hidden lg:flex lg:col-span-3 border-r justify-center items-center">
            <div className="text-xs text-zinc-500">Sat</div>
            <div className="text-xs text-zinc-900 font-bold ml-1">6</div>
          </div>
          <div className="hidden lg:flex lg:col-span-3 border-r justify-center items-center">
            <div className="text-xs text-zinc-500">Sun</div>
            <div className="text-xs text-zinc-900 font-bold ml-1">7</div>
          </div>
          <div className="col-span-1"></div>
        </div>

        <div className="h-auto">
          <div className="min-w-full">
            {hoursOfDay.map((hour, index) => (
              <div key={index}>
                <div className="w-full h-[35px] grid grid-cols-10 lg:grid-cols-23 grid-rows-1 border-zinc-200">
                  <div className="col-span-1 border-r text-xs text-zinc-500"></div>
                  <div className="col-span-2 lg:col-span-3 border-r flex justify-center items-center border-b"></div>
                  <div className="col-span-2 lg:col-span-3 border-r flex justify-center items-center border-b"></div>
                  <div className="col-span-2 lg:col-span-3 border-r flex justify-center items-center border-b"></div>
                  <div className="col-span-2 lg:col-span-3 border-r flex justify-center items-center border-b"></div>
                  <div className="hidden lg:flex lg:col-span-3 border-r justify-center items-center border-b"></div>
                  <div className="hidden lg:flex lg:col-span-3 border-r justify-center items-center border-b"></div>
                  <div className="hidden lg:flex lg:col-span-3 border-r justify-center items-center border-b"></div>

                  <div className="col-span-1 border-b"></div>
                </div>
                <div className="w-full h-[35px] grid grid-cols-10 lg:grid-cols-23 grid-rows-1 border-zinc-200">
                  <div className="col-span-1 border-r text-xs text-zinc-500 flex justify-center">
                    {hour}
                  </div>
                  <div className="col-span-2 lg:col-span-3 border-r flex justify-center items-center border-b"></div>
                  <div className="col-span-2 lg:col-span-3 border-r flex justify-center items-center border-b"></div>
                  <div className="col-span-2 lg:col-span-3 border-r flex justify-center items-center border-b"></div>
                  <div className="col-span-2 lg:col-span-3 border-r flex justify-center items-center border-b"></div>
                  <div className="hidden lg:flex lg:col-span-3 border-r justify-center items-center border-b"></div>
                  <div className="hidden lg:flex lg:col-span-3 border-r justify-center items-center border-b"></div>
                  <div className="hidden lg:flex lg:col-span-3 border-r justify-center items-center border-b"></div>

                  <div className="col-span-1 border-b"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DragDropCalendar;
