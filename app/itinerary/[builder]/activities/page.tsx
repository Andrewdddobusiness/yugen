import React, { ReactNode } from "react";
import Image from "next/image";
import ItineraryCards from "@/components/cards/itineraryCards";

import BuilderLayout from "@/components/layouts/builderLayout";

import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";

import ActivityCards from "@/components/cards/activityCards";

import { MdMoneyOff, MdAttachMoney } from "react-icons/md";
import { Baby, MountainSnow, Palette } from "lucide-react";

export default function Activities() {
  return (
    <BuilderLayout
      title="Activities"
      activePage="activities"
      itineraryNumber={1}
    >
      <div className="m-4 border h-full rounded-lg">
        <div className="flex flex-col items-center">
          <div className="text-2xl text-black font-bold flex justify-left pt-8">
            Explore Activities
          </div>
          <div className="text-md text-zinc-500 flex justify-left">
            Search for activities that you want to do!
          </div>
          <Input
            type="search"
            placeholder="Search..."
            className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px] mt-2"
          />
          <div className="flex flex-row justify-between w-full mt-4">
            <div className="ml-8">
              <Toggle variant="outline" className="h-8 rounded-full">
                <MdMoneyOff size={16} className="pr-1" />
                <div>Free</div>
              </Toggle>
              <Toggle variant="outline" className="h-8 rounded-full ml-2 ">
                <MdAttachMoney size={16} className="pr-1" />
                <div>Paid</div>
              </Toggle>
            </div>
            <div className="mr-8">
              <Toggle variant="outline" className="h-8 rounded-full">
                <Baby size={16} className="pr-1" />
                <div>Kid-friendly</div>
              </Toggle>
              <Toggle variant="outline" className="h-8 rounded-full ml-2 ">
                <MountainSnow size={16} className="pr-1" />
                <div>Outdoors</div>
              </Toggle>
              <Toggle variant="outline" className="h-8 rounded-full ml-2 ">
                <Palette size={16} className="pr-1" />
                <div> Art & Culture</div>
              </Toggle>
            </div>
          </div>
          <Separator className="my-4" />

          <div className="mb-4 mx-4">
            <ActivityCards />
          </div>
        </div>
      </div>
    </BuilderLayout>
  );
}
