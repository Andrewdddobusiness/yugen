"use client";
import { ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

import { Button } from "../ui/button";
import { Plus, Minus, Loader2, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { ComboBox } from "@/components/comboBox/comboBox";
import { Skeleton } from "@/components/ui/skeleton";
import DestinationSelector from "@/components/destination/DestinationSelector";

import { whitelistedLocations } from "@/lib/googleMaps/whitelistedLocations";
import { capitalizeFirstLetterOfEachWord } from "@/utils/formatting/capitalise";

import { createItinerary } from "@/actions/supabase/itinerary";
import { createClient } from "@/utils/supabase/client";
import { useCreateItineraryStore } from "@/store/createItineraryStore";
import { DatePickerWithRangePopover2 } from "../date/dateRangePickerPopover2";

interface Destination {
  id: string;
  name: string;
  country: string;
  city: string;
  formatted_address: string;
  place_id: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  timezone: string;
  photos?: string[];
  description?: string;
}

const formSchema = z.object({
  destination: z.string().min(2, {
    message: "Destination must be at least 2 characters.",
  }),
  startDate: z.date({
    required_error: "A start date is required.",
  }),
  endDate: z.date({
    required_error: "An end date is required.",
  }),
  numberOfPeople: z.string(),
});

interface PageLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export default function PopUpCreateItinerary({ children, className, ...props }: PageLayoutProps): React.ReactElement {
  const router = useRouter();
  const queryClient = useQueryClient();
  const supabase = createClient();

  // **** STORES ****
  const { destination, destinationData, setDestination, setDestinationData, dateRange, setDateRange, resetStore } = useCreateItineraryStore();

  // **** STATES ****
  const [user, setUser] = useState<any>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [showDestinationSelector, setShowDestinationSelector] = useState(false);
  const [destinationError, setDestinationError] = useState(false);
  const [dateRangeError, setDateRangeError] = useState(false);
  const [adultsCount, setAdultsCount] = useState(1);
  const [kidsCount, setKidsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destination: "",
      numberOfPeople: "1",
    },
  });

  const locationList = whitelistedLocations.map(
    (location) =>
      `${capitalizeFirstLetterOfEachWord(location.city)}, ${capitalizeFirstLetterOfEachWord(location.country)}`
  );

  const steps = [
    {
      title: "Step 1: Where and when do you want to go?",
      image: "/popup-explore-activities.jpg",
      content: (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="destination"
            render={() => (
              <FormItem className="flex flex-col">
                <FormLabel>Destination</FormLabel>
                <FormControl>
                  {destinationData ? (
                    <div className="flex items-center justify-between p-3 border border-gray-300 rounded-md bg-blue-50">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                          <MapPin className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{destinationData.name}</div>
                          <div className="text-sm text-gray-600">{destinationData.country}</div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleOpenDestinationSelector}
                        className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleOpenDestinationSelector}
                      className="w-full h-12 justify-start text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                    >
                      <MapPin className="h-5 w-5 mr-3" />
                      Choose your destination...
                    </Button>
                  )}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startDate"
            render={() => (
              <FormItem className="flex flex-col">
                <FormLabel>Travel Dates</FormLabel>
                <FormControl>
                  <div className="flex">
                    <DatePickerWithRangePopover2
                      selectedDateRange={dateRange}
                      onDateRangeConfirm={handleDateRangeConfirm}
                    />
                  </div>
                </FormControl>
                {dateRangeError && <div className="text-sm text-red-500 mt-2">Please select a date range.</div>}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ),
    },
    {
      title: "Step 2: How many people are going?",
      image: "/popup-itinerary-builder.jpg",
      content: (
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <div className="flex flex-row justify-between items-center text-xl border rounded-md p-1">
              <div className="flex justify-between items-center gap-2 text-md p-2">
                <div className="flex justify-center items-center rounded-md border w-10 h-10">{adultsCount}</div>
                <div>Adults</div>
              </div>
              <div className="flex justify-between gap-2 p-2">
                <Button variant={"outline"} size={"sm"} onClick={() => handleDecreaseCount("adults")}>
                  <Minus size={12} />
                </Button>
                <Button variant={"outline"} size={"sm"} onClick={() => handleIncreaseCount("adults")}>
                  <Plus size={12} />
                </Button>
              </div>
            </div>

            <div className="flex flex-row justify-between items-center text-xl border rounded-md p-1">
              <div className="flex justify-between items-center gap-2 text-md p-2">
                <div className="flex justify-center items-center rounded-md border w-10 h-10">{kidsCount}</div>
                <div>Kids</div>
              </div>
              <div className="flex justify-between gap-2 p-2">
                <Button variant={"outline"} size={"sm"} onClick={() => handleDecreaseCount("kids")}>
                  <Minus size={12} />
                </Button>
                <Button variant={"outline"} size={"sm"} onClick={() => handleIncreaseCount("kids")}>
                  <Plus size={12} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // **** EFFECTS ****
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { auth } = supabase;
        const { data: user } = await auth.getUser();
        if (!user.user) {
          throw new Error("User not authenticated");
        }
        setUser(user.user);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchUserData();
  }, [supabase]);

  const handleCreateItinerary = async () => {
    const currentDestination = destinationData || (destination ? { city: destination.split(", ")[0], country: destination.split(", ")[1] || destination } : null);
    
    if (!user?.id || !currentDestination || !dateRange?.from || !dateRange?.to) {
      setError("Missing required information");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const city = destinationData?.city || currentDestination.city;
      const country = destinationData?.country || currentDestination.country;

      const result = await createItinerary({
        title: `Trip to ${city}`,
        adults: adultsCount,
        kids: kidsCount,
        currency: "USD",
        is_public: false,
        destination: {
          city: city,
          country: country,
          from_date: dateRange.from,
          to_date: dateRange.to,
          order_number: 1,
        }
      });

      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["itineraries"] });
        setOpen(false);
        resetStore();
        router.push("/itineraries");
      } else {
        setError(result.error?.message || "Failed to create itinerary");
      }
    } catch (err) {
      console.error("Error creating itinerary:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 0:
        return (destination && destination.length >= 2 || destinationData) && dateRange?.from && dateRange?.to;
      case 1:
        return adultsCount >= 1;
      default:
        return false;
    }
  };

  const getStepError = () => {
    if (step === 0) {
      if (!destination && !destinationData) {
        return "Please select a destination";
      }
      if (!dateRange?.from || !dateRange?.to) {
        return "Please select travel dates";
      }
    }
    return null;
  };

  // ***** HANDLERS *****
  const handleDestinationChange = (location: string) => {
    setDestination(location);
    setDestinationError(false);
  };

  const handleDateRangeConfirm = (newDate: any | undefined) => {
    setDateRange(newDate);
    setDateRangeError(false);
  };

  const handleIncreaseCount = (type: string) => {
    if (type === "adults" && adultsCount < 10) {
      setAdultsCount((prevCount) => prevCount + 1);
    } else if (type === "kids" && kidsCount < 10) {
      setKidsCount((prevCount) => prevCount + 1);
    }
  };

  const handleDecreaseCount = (type: string) => {
    if (type === "adults" && adultsCount > 1) {
      setAdultsCount((prevCount) => prevCount - 1);
    } else if (type === "kids" && kidsCount > 0) {
      setKidsCount((prevCount) => prevCount - 1);
    }
  };

  const handleDestinationSelect = (destination: Destination) => {
    setDestinationData(destination);
    setShowDestinationSelector(false);
    setDestinationError(false);
  };

  const handleOpenDestinationSelector = () => {
    setShowDestinationSelector(true);
  };

  const handleCloseDestinationSelector = () => {
    setShowDestinationSelector(false);
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    handleCreateItinerary();
  }

  const handleNext = () => {
    if (!isStepValid()) {
      return;
    }

    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleCreateItinerary();
    }
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className={`inline-flex ${className}`}>{children}</div>
      </DialogTrigger>
      <DialogContent className={`w-[90%] sm:w-full ${showDestinationSelector ? 'max-w-[900px] h-[650px]' : 'max-w-[1000px] h-[400px] grid grid-cols-1 sm:grid-cols-2'} p-0 gap-0 rounded-xl`}>
        {showDestinationSelector ? (
          <DestinationSelector
            onDestinationSelect={handleDestinationSelect}
            onClose={handleCloseDestinationSelector}
            initialDestination={destinationData}
          />
        ) : (
          <>
            <div className="relative w-full h-full hidden sm:block">
              <Image src={steps[step].image} alt={steps[step].title} fill className="object-cover rounded-l-md" priority />
            </div>

            <DialogDescription className="flex flex-col px-4 sm:px-6 pt-8 sm:pt-10 pb-6 h-full justify-between">
              <VisuallyHidden.Root>
                <DialogTitle>Create New Itinerary</DialogTitle>
              </VisuallyHidden.Root>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full justify-between">
                  <div className="flex flex-col gap-1">
                    <DialogTitle className="text-2xl sm:text-3xl text-black">
                      Let&apos;s build your next vacation!
                    </DialogTitle>
                    <div className="text-lg sm:text-xl font-medium text-zinc-800">{steps[step].title}</div>
                    <div className="mt-4">{steps[step].content}</div>
                  </div>

                  <div className="flex flex-row mt-4 justify-between">
                    <Button
                      type="button"
                      className="flex w-28 rounded-xl shadow-lg"
                      variant={"outline"}
                      onClick={handleBack}
                      disabled={step === 0}
                    >
                      Back
                    </Button>
                    <div className="flex flex-row justify-center items-center">
                      {steps.map((_, index) => (
                        <div
                          key={index}
                          className={`h-2 w-2 rounded-full mx-1 ${index === step ? "bg-black" : "bg-gray-400"}`}
                        />
                      ))}
                    </div>
                    <Button
                      type="button"
                      className="flex w-28 bg-[#3A86FF] rounded-xl shadow-md shadow-[#3A86FF] text-white hover:bg-[#3A86FF]/90 active:scale-95 transition-all duration-300"
                      onClick={handleNext}
                      disabled={!isStepValid() || loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : step < steps.length - 1 ? (
                        "Next"
                      ) : (
                        "Create itinerary"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogDescription>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
