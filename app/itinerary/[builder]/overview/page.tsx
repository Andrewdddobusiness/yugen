"use client";
import React from "react";
import BuilderLayout from "@/components/layouts/builderLayout";
import Image from "next/image";
import { Separator } from "@/components/ui/separator";

export default function Overview() {
  return (
    <div>
      <BuilderLayout title="Overview" activePage="overview" itineraryNumber={1}>
        <div className="p-4 h-1/4 relative">
          <Image
            src="/bali.png"
            alt="Image"
            width="1920"
            height="1080"
            className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale rounded-lg"
          />
          <div className="absolute bottom-1 left-12 transform -translate-y-1/2 text-white text-7xl font-bold">
            Bali
          </div>
          <div className="absolute bottom-8 left-[51px] transform -translate-y-1/2 text-white text-lg font-bold">
            Indonesia
          </div>
        </div>
        <div className="flex flex-row">
          <div className="px-12 py-4 w-3/4">
            <div>
              <div className="col-span-1 text-2xl font-semibold text-black flex justify-left">
                About Bali
              </div>
              <div className="col-span-1 text-sm text-black flex justify-left mt-2">
                Ubud, Bali is a vibrant and exciting destination for tourists.
                Known for its stunning rice terraces, ancient temples, and rich
                cultural heritage, Ubud offers visitors a unique and
                unforgettable experience. From exploring local markets to
                indulging in traditional Balinese cuisine, there is something
                for everyone in this enchanting town.
              </div>
            </div>
            <div className="mt-8">
              <div className="col-span-1 text-2xl font-semibold text-black flex justify-left">
                Emergency Numbers
              </div>
              <div className="col-span-1 text-sm text-black mt-2">
                <ul className="list-disc list-inside">
                  <li>Fire: 112</li>
                  <li>Police: 112</li>
                  <li>Ambulance: 112</li>
                </ul>
              </div>
            </div>
            <div className="mt-8">
              <div className="col-span-1 text-2xl font-semibold text-black flex justify-left">
                Power information
              </div>
              <div className="col-span-1 text-sm text-black mt-2">
                <ul className="list-disc list-inside">
                  <li>Plugs: A, C, F, G</li>
                  <li>Voltage: 110V</li>
                  <li>Standard: SNI043892</li>
                  <li>Frequency: 50 Hz</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex h-screen px-4">
            <Separator orientation="vertical" />
          </div>
          <div className="px-4 w-1/4 mt-4">
            <div className="col-span-1 text-2xl font-semibold text-black flex justify-left">
              Insert Content Here
            </div>
            <div className="col-span-1 text-sm text-black flex justify-left mt-2">
              insert content here
            </div>
          </div>
        </div>
      </BuilderLayout>
    </div>
  );
}
