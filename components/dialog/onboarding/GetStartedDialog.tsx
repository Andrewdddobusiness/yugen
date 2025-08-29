"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PopUpGetStarted() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Step 1: Find Activities",
      description: "Explore and select activities to include in your vacation.",
      image: "/popup-explore-activities.jpg",
    },
    {
      title: "Step 2: Build Your Itinerary",
      description:
        "Organize your selected activities into a day-by-day itinerary.",
      image: "/popup-itinerary-builder.jpg",
    },
    {
      title: "Step 3: Share Your Plan",
      description: "Share your itinerary with friends and family.",
      image: "/popup-share.jpg",
    },
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      setOpen(false);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader className="flex flex-row justify-between items-center px-4 py-2">
            <AlertDialogTitle className="text-4xl">
              Let&apos;s build your next vacation!
            </AlertDialogTitle>
            <Button
              variant={"ghost"}
              size="icon"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </AlertDialogHeader>
          <AlertDialogDescription className="px-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-black">
                  {steps[step].title}
                </div>
                <div className="mt-2 text-lg">{steps[step].description}</div>
              </div>
              <div className="relative w-full h-[300px]">
                <Image
                  src={steps[step].image}
                  alt={steps[step].title}
                  layout="fill"
                  objectFit="cover"
                  className="rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-center mt-8">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-2 rounded-full mx-1 ${
                    index === step ? "bg-black" : "bg-gray-400"
                  }`}
                />
              ))}
            </div>
          </AlertDialogDescription>
          <AlertDialogFooter>
            {step > 0 && (
              <Button variant={"outline"} onClick={handleBack}>
                Back
              </Button>
            )}
            <Button onClick={handleNext}>
              {step < steps.length - 1 ? "Next" : "Close"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="fixed bottom-4 right-4">
        <Button
          variant={"default"}
          size="icon"
          onClick={() => setOpen(true)}
          className="rounded-full"
        >
          <Info size={24} />
        </Button>
      </div>
    </>
  );
}
