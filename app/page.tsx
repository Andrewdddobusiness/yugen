"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import HomeLayout from "@/components/layouts/homeLayout";
import PopUpCreateItinerary from "@/components/popUp/popUpCreateItinerary";
import {
  Loader2,
  Plane,
  Plus,
  Map,
  Search,
  MapPin,
  List,
  Table,
  Calendar,
  FileText,
  HeartHandshake,
  NotebookTabs,
  Luggage,
  Binoculars,
  NotebookPen,
} from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { useState } from "react";
import { FeatureCard } from "@/components/cards/featureCard";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";

export default function Home() {
  const { user, isUserLoading } = useUserStore();
  const [activeImage, setActiveImage] = useState("map-search");

  // Add refs for each section
  const discoverRef = useRef(null);
  const organizeRef = useRef(null);
  const exportRef = useRef(null);
  const contactRef = useRef(null);

  // Check if sections are in view
  const isDiscoverInView = useInView(discoverRef, { once: true, margin: "-100px" });
  const isOrganizeInView = useInView(organizeRef, { once: true, margin: "-100px" });
  const isExportInView = useInView(exportRef, { once: true, margin: "-100px" });
  const isContactInView = useInView(contactRef, { once: true, margin: "-100px" });

  return (
    <HomeLayout>
      <div className="min-h-screen bg-white flex flex-col items-center justify-center relative overflow-hidden pt-32">
        {/* Noise texture overlay */}
        <div className="fixed inset-0 pointer-events-none z-0 opacity-50">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1000 1000"
            preserveAspectRatio="xMidYMid slice"
            className="absolute w-full h-full opacity-[0.5] mix-blend-overlay"
          >
            <image href="/home/noise.svg" width="100%" height="100%" />
          </svg>
        </div>

        {/* Gradient overlay */}
        {/* <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#1746A2]/30 to-[#1673e0]" /> */}

        {/* Main content */}
        <div className="relative z-10 max-w-2xl mx-auto text-center text-[#3A86FF] mt-32 px-4">
          {/* Plan SVG - Hide on mobile */}
          <div className="absolute z-0 -top-10 -left-10 -translate-x-3/4 w-32 h-32 -rotate-12 hidden sm:block">
            <Image src="/home/discover.svg" alt="Plan Icon" width={64} height={64} className="w-full h-full" priority />
          </div>
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-28 h-28 rotate-6 hidden sm:block">
            <Image src="/home/organise.svg" alt="Plan Icon" width={64} height={64} className="w-full h-full" priority />
          </div>
          <div className="absolute -top-10 -right-10 translate-x-3/4 w-40 h-40 rotate-12 hidden sm:block">
            <Image src="/home/travel.svg" alt="Plan Icon" width={64} height={64} className="w-full h-full" priority />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-medium mb-8 tracking-tight leading-tight px-4">
            Your Ultimate <br /> <span className="text-[#032bc0] font-semibold">Travel Itinerary Planner.</span>
          </h1>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {isUserLoading ? (
              <Button size="lg" className="text-lg rounded-xl w-48 bg-[#032bc0] shadow-lg" disabled>
                <Loader2 className="h-4 w-16 animate-spin" />
              </Button>
            ) : user ? (
              <PopUpCreateItinerary>
                <Button
                  size="lg"
                  className="text-md bg-[#032bc0] text-white hover:bg-[#032bc0]/90 rounded-xl w-30 shadow-lg transition-all duration-300 hover:scale-105"
                >
                  <Plus className="size-4 mr-2" />
                  Plan Trip
                </Button>
              </PopUpCreateItinerary>
            ) : (
              <Link href="/signUp">
                <Button
                  size="lg"
                  className="text-md shadow-lg bg-[#032bc0] text-white hover:bg-[#032bc0]/90 rounded-xl w-48 hover:scale-105 transition-all duration-300"
                >
                  <Plane className="size-4 mr-2" />
                  Get Started
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Browser mockup */}
        <div className="relative mt-20 w-full max-w-6xl px-4">
          <div className="rounded-t-xl shadow-2xl overflow-hidden">
            <div className="bg-white/10 backdrop-blur-sm p-2 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
            </div>
            <Image
              src="/demo-screenshot.png"
              alt="Journey App Demo"
              width={1200}
              height={800}
              className="w-full object-cover"
            />
          </div>
        </div>

        {/* Wave and content section */}
        <div className="relative w-full mt-20 overflow-hidden">
          {/* Blue Wave SVG */}
          {/* <div className="w-screen relative left-[50%] right-[50%] -mx-[50vw]">
            <Image
              src="/home/lightBlueWave.svg"
              alt="Wave Divider"
              width={1980}
              height={40}
              className="w-full h-auto"
            />
          </div> */}

          {/* Blue background section */}
          <div className="w-screen relative bg-[#3A86FF]">
            {/* Discover Section */}
            <motion.div
              ref={discoverRef}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: isDiscoverInView ? 1 : 0, y: isDiscoverInView ? 0 : 50 }}
              transition={{ duration: 0.6 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 sm:py-64"
            >
              <div className="flex flex-row gap-2 justify-center items-center">
                <Binoculars className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                <h2 className="text-3xl sm:text-4xl font-bold text-white text-center">Discover Your Next Adventure</h2>
              </div>
              <h3 className="text-lg sm:text-xl font-light text-white mb-8 sm:mb-12 text-center px-4">
                Search for things to do in any city, district, or region.
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
                <div className="relative aspect-video block sm:hidden">
                  <Image
                    src={`/features/${activeImage}.png`}
                    alt="Feature Preview"
                    width={800}
                    height={450}
                    className="rounded-xl shadow-2xl border-4 border-white/10 transition-all duration-300"
                  />
                </div>

                {/* Left Column - Feature Cards */}
                <div className="space-y-6">
                  <FeatureCard
                    title="Wide Map Search"
                    description="Explore activities across the entire city with our interactive map interface"
                    icon={<Map className="w-6 h-6" />}
                    onHover={() => setActiveImage("map-search")}
                  />
                  <FeatureCard
                    title="Direct Search"
                    description="Find specific attractions, restaurants, and activities instantly"
                    icon={<Search className="w-6 h-6" />}
                    onHover={() => setActiveImage("direct-search")}
                  />
                  <FeatureCard
                    title="Area-Based Search"
                    description="Discover activities by neighborhood, district, or region"
                    icon={<MapPin className="w-6 h-6" />}
                    onHover={() => setActiveImage("area-search")}
                  />
                </div>

                {/* Right Column - Feature Image */}
                <div className="relative aspect-video hidden sm:block">
                  <Image
                    src={`/features/${activeImage}.png`}
                    alt="Feature Preview"
                    width={800}
                    height={450}
                    className="rounded-xl shadow-2xl border-4 border-white/10 transition-all duration-300"
                  />
                </div>
              </div>
            </motion.div>

            {/* Organize Section */}
            <motion.div
              ref={organizeRef}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: isOrganizeInView ? 1 : 0, y: isOrganizeInView ? 0 : 50 }}
              transition={{ duration: 0.6 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32"
            >
              <div className="flex flex-row gap-2 justify-center items-center">
                <NotebookPen className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                <h2 className="text-3xl sm:text-4xl font-bold text-white text-center">Organize Your Perfect Trip.</h2>
              </div>
              <h3 className="text-lg sm:text-xl font-light text-white mb-12 text-center">
                Tools for the <span className="underline italic">meticulous</span> planner so you don&apos;t miss out on
                anything.
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                {/* Left Column - Feature Image */}
                <div className="relative aspect-video">
                  <Image
                    src={`/features/${activeImage}.png`}
                    alt="Feature Preview"
                    width={800}
                    height={450}
                    className="rounded-xl shadow-2xl border-4 border-white/10 transition-all duration-300"
                  />
                </div>
                {/* Right Column - Feature Cards */}
                <div className="space-y-6">
                  <FeatureCard
                    title="List View"
                    description="Organize your activities in a simple, drag-and-drop list format"
                    icon={<List className="w-6 h-6" />}
                    onHover={() => setActiveImage("list-view")}
                  />
                  <FeatureCard
                    title="Table View"
                    description="See all your activities in a detailed, sortable table"
                    icon={<Table className="w-6 h-6" />}
                    onHover={() => setActiveImage("table-view")}
                  />
                  <FeatureCard
                    title="Calendar View"
                    description="Plan your days with an intuitive calendar interface"
                    icon={<Calendar className="w-6 h-6" />}
                    onHover={() => setActiveImage("calendar-view")}
                  />
                </div>
              </div>
            </motion.div>

            {/* Export Section */}
            <motion.div
              ref={exportRef}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: isExportInView ? 1 : 0, y: isExportInView ? 0 : 50 }}
              transition={{ duration: 0.6 }}
              className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-64"
            >
              <div className="flex flex-row gap-2 justify-center items-center">
                <Plane className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                <h2 className="text-3xl sm:text-4xl font-bold text-white text-center">Export & Travel</h2>
              </div>
              <h3 className="text-lg sm:text-xl font-light text-white mb-12 text-center">
                We get it... you want to plan your trip and get travelling.
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="relative aspect-video block sm:hidden">
                  <Image
                    src={`/features/${activeImage}.png`}
                    alt="Feature Preview"
                    width={800}
                    height={450}
                    className="rounded-xl shadow-2xl border-4 border-white/10 transition-all duration-300"
                  />
                </div>

                {/* Left Column - Feature Cards */}
                <div className="space-y-6">
                  <FeatureCard
                    title="PDF Export"
                    description="Download a beautifully formatted PDF of your itinerary"
                    icon={<FileText className="w-6 h-6" />}
                    onHover={() => setActiveImage("pdf-export")}
                  />
                  <FeatureCard
                    title="Excel Export"
                    description="Export your itinerary to Excel for custom modifications"
                    icon={<Table className="w-6 h-6" />}
                    onHover={() => setActiveImage("excel-export")}
                  />
                  <FeatureCard
                    title="Google Calendar"
                    description="Sync your itinerary directly with Google Calendar"
                    icon={<Calendar className="w-6 h-6" />}
                    onHover={() => setActiveImage("calendar-export")}
                  />
                </div>

                {/* Right Column - Feature Image */}
                <div className="relative aspect-video hidden sm:block">
                  <Image
                    src={`/features/${activeImage}.png`}
                    alt="Feature Preview"
                    width={800}
                    height={450}
                    className="rounded-xl shadow-2xl border-4 border-white/10 transition-all duration-300"
                  />
                </div>
              </div>
            </motion.div>

            {/* Bottom Wave */}
            {/* <div className="w-screen relative left-[50%] right-[50%] -mx-[50vw] translate-y-6">
              <Image
                src="/home/lightBlueWave.svg"
                alt="Bottom Wave"
                width={1980}
                height={40}
                className="w-full h-auto rotate-180"
              />
            </div> */}
          </div>

          {/* Contact Section */}
          <motion.div
            ref={contactRef}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: isContactInView ? 1 : 0, y: isContactInView ? 0 : 50 }}
            transition={{ duration: 0.6 }}
            className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 sm:py-64"
          >
            <div className="flex flex-row gap-4 justify-center">
              <NotebookTabs className="w-6 h-6 sm:w-8 sm:h-8 text-[#FF006E]" />
              <HeartHandshake className="w-6 h-6 sm:w-8 sm:h-8 text-[#FF006E]" />
              <Luggage className="w-6 h-6 sm:w-8 sm:h-8 text-[#FF006E]" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-[#FF006E] mb-2 text-center px-4">
              Organize every detail of your trip, and get travelling.
            </h2>
            <h3 className="text-lg sm:text-xl font-light text-gray-500 text-center px-4">
              Journey was built by travellers who know the pain of planning and know that it could be{" "}
              <span className="underline italic">better</span>.
            </h3>
          </motion.div>
        </div>
      </div>
    </HomeLayout>
  );
}
