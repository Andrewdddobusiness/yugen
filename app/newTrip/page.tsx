// page.tsx
"use client";
import React, { useState } from "react";
import NewTripStepper from "@/components/stepper/newTripStepper";
import { DatePicker } from "@/components/calendar/datePIcker";

import DashboardLayout from "@/components/layouts/dashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewTrip() {
  const [step, setStep] = useState(0);
  return (
    <div>
      <DashboardLayout title="Explore" activePage="explore">
        <div className="flex flex-col items-center m-4 border h-screen rounded-lg">
          <div className="flex flex-col items-left w-1/2">
            <div className="text-5xl  font-semibold mt-8">
              <NewTripStepper step={step} />
            </div>
            <div className="text-5xl font-semibold mt-8">
              Plan your next holiday!
            </div>
            <div className="text-md text-zinc-500 mt-2">
              Let&apos;s get some details
            </div>
            <div className="text-xl font-semibold mt-8">
              Where do you want to go?
            </div>
            <div></div>
            Tlet create a new antoher thsil; tlaisld; failstSdjl
            <div>
              {" "}
              this is going th make a lot of people happy ahahdl t what else can
              we do to get his going ahahah ;Thsi w ahahahthis isa awesome ahha
              s sl;aojjajls;s
            </div>
            <div className="grid grid-cols-2 gap-4 text-5xl font-semibold mt-2">
              <div className="col-span-1">
                <Input type="search" placeholder="Enter an origin" />
              </div>
              <div className="col-span-1">
                <Input type="search" placeholder="Enter a destination" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-5xl font-semibold">
              <div className="col-span-1">
                <DatePicker />
              </div>
              <div className="col-span-1">
                <DatePicker />
              </div>
            </div>
            <div className="text-xl font-semibold mt-8"></div>
            <div className="text-xl font-semibold mt-8">
              How many people are going?
            </div>
            <div className="w-1/3 text-xl font-semibold mt-2 ">
              <Input id="stock-1" type="number" defaultValue="100" />
            </div>
            <div className="text-xl font-semibold mt-8">
              Who&apos;s travelling with you?
            </div>
            {step > 1 ? (
              <div className="flex flex-row justify-between mt-8">
                <Button
                  size="sm"
                  variant={"outline"}
                  onClick={() => setStep(step < 2 ? step : step - 1)}
                  className="text-sm w-16 px-2 py-1 text-slate-400 rounded-full"
                >
                  Back
                </Button>

                <Button
                  size="sm"
                  variant={"default"}
                  onClick={() => setStep(step > 4 ? step : step + 1)}
                  className={`${
                    step > 4 ? "pointer-events-none opacity-50" : ""
                  } text-sm w-20 rounded-full`}
                >
                  Continue
                </Button>
              </div>
            ) : (
              <div className="flex flex-row justify-end mt-8">
                <Button
                  size="sm"
                  variant={"default"}
                  onClick={() => setStep(step > 4 ? step : step + 1)}
                  className={`${
                    step > 4 ? "pointer-events-none opacity-50" : ""
                  } text-sm w-20 rounded-full`}
                >
                  Continue
                </Button>
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </div>
  );
}
