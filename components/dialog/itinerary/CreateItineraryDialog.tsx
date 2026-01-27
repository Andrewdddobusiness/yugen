"use client";
import { ReactNode, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";

import { Button } from "@/components/ui/button";
import { Plus, Minus, Loader2, MapPin, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";

import DestinationSelector from "@/components/destination/DestinationSelector";

import { createItinerary } from "@/actions/supabase/itinerary";
import { useCreateItineraryStore, type Destination, type CreateItineraryLeg } from "@/store/createItineraryStore";
import { DatePickerWithRangePopover2 } from "@/components/form/date/DateRangePickerPopover2";
import { format } from "date-fns";
import { toIsoDateString } from "@/utils/dateOnly";

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

  // **** STORES ****
  const { legs, addLeg, removeLeg, setLegDestination, setLegDateRange, resetStore } = useCreateItineraryStore();

  // **** STATES ****
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [destinationSelectorLegId, setDestinationSelectorLegId] = useState<string | null>(null);
  const [adultsCount, setAdultsCount] = useState(1);
  const [kidsCount, setKidsCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showDestinationSelector = destinationSelectorLegId !== null;

  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      destination: "",
      numberOfPeople: "1",
    },
  });

  const getValidLegs = (): Array<
    CreateItineraryLeg & { destination: Destination; dateRange: NonNullable<CreateItineraryLeg["dateRange"]> }
  > => {
    return (legs ?? []).filter(
      (
        leg
      ): leg is CreateItineraryLeg & {
        destination: Destination;
        dateRange: NonNullable<CreateItineraryLeg["dateRange"]>;
      } => Boolean(leg.destination && leg.dateRange?.from && leg.dateRange?.to)
    );
  };

  const steps = [
    {
      title: "Step 1: Where and when do you want to go?",
      image: "/popup-explore-activities.jpg",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            {legs.map((leg, index) => {
              const destination = leg.destination;
              const dateRange = leg.dateRange;

              return (
                <div key={leg.id} className="rounded-xl border border-stroke-200 bg-white p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-ink-900">
                      Destination {index + 1}
                    </div>
                    {legs.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeLeg(leg.id)}
                        title="Remove destination"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>

                  <div className="mt-3 space-y-3">
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-ink-700">Destination</div>
                      {destination ? (
                        <div className="flex items-center justify-between p-3 border border-gray-300 rounded-md bg-blue-50">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-blue-600 rounded-lg">
                              <MapPin className="h-4 w-4 text-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900 truncate">{destination.name}</div>
                              <div className="text-sm text-gray-600 truncate">{destination.country}</div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDestinationSelectorLegId(leg.id)}
                            className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
                          >
                            Change
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setDestinationSelectorLegId(leg.id)}
                          className="w-full h-12 justify-start text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                        >
                          <MapPin className="h-5 w-5 mr-3" />
                          Choose your destination...
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs font-medium text-ink-700">Travel Dates</div>
                      <DatePickerWithRangePopover2
                        selectedDateRange={dateRange}
                        onDateRangeConfirm={(range) => setLegDateRange(leg.id, range)}
                      />
                      {dateRange?.from && dateRange?.to ? (
                        <div className="text-[11px] text-ink-500">
                          {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 rounded-xl"
            onClick={() => addLeg()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add another destination
          </Button>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}
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
                <Button type="button" variant={"outline"} size={"sm"} onClick={() => handleDecreaseCount("adults")}>
                  <Minus size={12} />
                </Button>
                <Button type="button" variant={"outline"} size={"sm"} onClick={() => handleIncreaseCount("adults")}>
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
                <Button type="button" variant={"outline"} size={"sm"} onClick={() => handleDecreaseCount("kids")}>
                  <Minus size={12} />
                </Button>
                <Button type="button" variant={"outline"} size={"sm"} onClick={() => handleIncreaseCount("kids")}>
                  <Plus size={12} />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const handleCreateItinerary = async () => {
    const validLegs = getValidLegs();
    
    if (validLegs.length === 0) {
      setError(getStepError() ?? "Please select at least one destination and travel dates.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const sorted = [...validLegs].sort((a, b) => {
        const aTime = a.dateRange.from!.getTime();
        const bTime = b.dateRange.from!.getTime();
        return aTime - bTime;
      });
      const first = sorted[0]?.destination;
      const last = sorted[sorted.length - 1]?.destination;

      const titleBase = first?.city || first?.name || "Trip";
      const title =
        sorted.length > 1 && first?.city && last?.city && first.city !== last.city
          ? `Trip: ${first.city} → ${last.city}`
          : `Trip to ${titleBase}`;

      const result = await createItinerary({
        title,
        adults: adultsCount,
        kids: kidsCount,
        currency: "USD",
        is_public: false,
        destinations: sorted.map((leg, index) => ({
          city: leg.destination.city,
          country: leg.destination.country,
          from_date: toIsoDateString(leg.dateRange.from!),
          to_date: toIsoDateString(leg.dateRange.to!),
          order_number: index + 1,
        })),
      });

      if (result.success) {
        await queryClient.invalidateQueries({ queryKey: ["itineraries"] });
        setOpen(false);
        resetStore();
        router.push("/itineraries");
      } else {
        const message = result.error?.message || "Failed to create itinerary";
        setError(message === "User not authenticated" ? "Please sign in to create an itinerary." : message);
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
        return getValidLegs().length === legs.length;
      case 1:
        return adultsCount >= 1;
      default:
        return false;
    }
  };

  const getStepError = () => {
    if (step === 0) {
      if (legs.some((leg) => !leg.destination)) return "Please select a destination";
      if (legs.some((leg) => !leg.dateRange?.from || !leg.dateRange?.to)) return "Please select travel dates";
    }
    return null;
  };

  // ***** HANDLERS *****
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
    if (!destinationSelectorLegId) return;
    setLegDestination(destinationSelectorLegId, destination);
    setDestinationSelectorLegId(null);
  };

  const handleCloseDestinationSelector = () => {
    setDestinationSelectorLegId(null);
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
      <DialogContent
        className={`w-[90%] sm:w-full ${
          showDestinationSelector
            ? "max-w-[900px] h-[min(90vh,720px)] max-h-[90vh]"
            : "max-w-[1100px] grid grid-cols-1 sm:grid-cols-[1fr_2fr] h-[min(90vh,760px)] sm:h-[min(90vh,720px)] max-h-[90vh]"
        } p-0 gap-0 rounded-xl overflow-hidden`}
      >
        {showDestinationSelector ? (
          <DestinationSelector
            onDestinationSelect={handleDestinationSelect}
            onClose={handleCloseDestinationSelector}
            initialDestination={legs.find((leg) => leg.id === destinationSelectorLegId)?.destination ?? null}
          />
        ) : (
          <>
            <div className="relative hidden h-full w-full overflow-hidden sm:block">
              <Image src={steps[step].image} alt={steps[step].title} fill className="object-cover" priority />
            </div>

            <DialogDescription className="flex min-h-0 flex-col px-4 sm:px-6 pt-6 sm:pt-8 pb-6 h-full overflow-hidden">
              <VisuallyHidden.Root>
                <DialogTitle>Create New Itinerary</DialogTitle>
              </VisuallyHidden.Root>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full min-h-0">
                  {/* Header - always visible */}
                  <div className="flex-shrink-0">
                    <DialogTitle className="text-2xl sm:text-3xl text-black">
                      Let&apos;s build your next vacation!
                    </DialogTitle>
                    <div className="text-lg sm:text-xl font-medium text-zinc-800">{steps[step].title}</div>
                  </div>

                  {/* Body */}
                  <div className="mt-4 flex-1 min-h-0 flex flex-col">
                    {step === 0 ? (
                      <>
                        {/* Only the destination cards scroll */}
                        <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                          <div className="space-y-3">
                            {legs.map((leg, index) => {
                              const destination = leg.destination;
                              const dateRange = leg.dateRange;

                              return (
                                <div key={leg.id} className="rounded-xl border border-stroke-200 bg-white p-3">
                                  <div className="flex items-center justify-between">
                                    <div className="text-sm font-semibold text-ink-900">Destination {index + 1}</div>
                                    {legs.length > 1 ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => removeLeg(leg.id)}
                                        title="Remove destination"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    ) : null}
                                  </div>

                                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
                                    <div className="min-w-0">
                                      {destination ? (
                                        <div className="flex items-center justify-between px-3 py-2 h-14 border border-gray-300 rounded-md bg-blue-50">
                                          <div className="flex items-center space-x-3 min-w-0">
                                            <div className="p-2 bg-blue-600 rounded-lg flex-shrink-0">
                                              <MapPin className="h-4 w-4 text-white" />
                                            </div>
                                            <div className="min-w-0">
                                              <div className="font-medium text-gray-900 truncate">{destination.name}</div>
                                              <div className="text-sm text-gray-600 truncate">{destination.country}</div>
                                            </div>
                                          </div>
                                          <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setDestinationSelectorLegId(leg.id)}
                                            className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white flex-shrink-0"
                                          >
                                            Change
                                          </Button>
                                        </div>
                                      ) : (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => setDestinationSelectorLegId(leg.id)}
                                          className="w-full h-14 justify-start text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                                        >
                                          <MapPin className="h-5 w-5 mr-3" />
                                          Choose your destination...
                                        </Button>
                                      )}
                                    </div>

                                    <div className="min-w-0">
                                      <DatePickerWithRangePopover2
                                        selectedDateRange={dateRange}
                                        onDateRangeConfirm={(range) => setLegDateRange(leg.id, range)}
                                        triggerClassName="h-14"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Non-scroll actions */}
                        <div className="pt-4 flex-shrink-0 space-y-3">
                          <Button type="button" variant="outline" className="w-full h-11 rounded-xl" onClick={() => addLeg()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add another destination
                          </Button>
                          {error ? <div className="text-sm text-red-600">{error}</div> : null}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                        {steps[step].content}
                        {error ? <div className="text-sm text-red-600 mt-4">{error}</div> : null}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex flex-row mt-4 justify-between flex-shrink-0">
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
                      className="flex w-28 bg-[#3F5FA3] rounded-xl shadow-md shadow-[#3F5FA3] text-white hover:bg-[#3F5FA3]/90 active:scale-95 transition-all duration-300"
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
