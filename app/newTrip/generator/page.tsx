// page.tsx
"use client";
import React, { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import NewTripStepper from "@/components/stepper/newTripStepper";
import DashboardLayout from "@/components/layouts/dashboardLayout";
import { DatePickerWithRangePopover } from "@/components/date/dateRangePickerPopover";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

import { Plus, Minus } from "lucide-react";
import { DateRange } from "react-day-picker";

const items = [
  {
    id: "vegetarian",
    label: "Vegetarian",
  },
  {
    id: "gluten-free",
    label: "Gluten-Free",
  },
  {
    id: "dairy-free",
    label: "Dairy-Free",
  },
  {
    id: "nut-free",
    label: "Nut-Free",
  },
  {
    id: "halal",
    label: "Halal",
  },
  {
    id: "kosher",
    label: "Kosher",
  },
  {
    id: "pescatarian",
    label: "Pescatarian",
  },
] as const;

const FormSchema = z.object({
  items: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one item.",
  }),
});

export default function NewTrip() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      items: ["recents", "home"],
    },
  });

  const [step, setStep] = useState(1);
  const [adultsCount, setAdultsCount] = useState(0);
  const [kidsCount, setKidsCount] = useState(0);
  const [mealSelections, setMealSelections] = useState<string[]>([]);

  const handleDecreaseCount = (type: string) => {
    if (type === "adults" && adultsCount > 1) {
      setAdultsCount((prevCount) => prevCount - 1);
    } else if (type === "kids" && kidsCount > 0) {
      setKidsCount((prevCount) => prevCount - 1);
    }
  };

  const handleIncreaseCount = (type: string) => {
    if (type === "adults" && adultsCount < 10) {
      setAdultsCount((prevCount) => prevCount + 1);
    } else if (type === "kids" && kidsCount < 10) {
      setKidsCount((prevCount) => prevCount + 1);
    }
  };

  const handleMealSelections = (selectedMeals: string[]) => {
    setMealSelections(selectedMeals);
  };

  return (
    <div>
      <DashboardLayout title="Itineraries" activePage="itineraries">
        <div className="flex flex-col items-center m-4  h-screen ">
          <div className="flex flex-col items-left w-1/2">
            <div className="text-5xl  font-semibold mt-8">
              <NewTripStepper step={step} />
            </div>

            {/* STEP 1 */}
            {step === 1 && (
              <>
                <div className="text-5xl font-semibold mt-8">Plan your next holiday!</div>
                <div className="text-md text-zinc-500 mt-2">Let&apos;s get some details</div>
                <div className="text-xl font-semibold mt-8">Where do you want to go?</div>
                <div className="flex flex-row w-3/4 gap-4 text-5xl mt-2">
                  <Input type="search" placeholder="Enter a destination" />
                </div>
                <div className="flex flex-row text-5xl mt-2">
                  <DatePickerWithRangePopover
                    onDateChange={function (date: DateRange | undefined): void {
                      throw new Error("Function not implemented.");
                    }}
                  />
                </div>
                <div className="flex flex-row text-5xl mt-2">
                  <Button className="rounded-full text-sm" size={"sm"} variant={"secondary"}>
                    <Plus size={12} className="mr-1" /> Add Destination
                  </Button>
                </div>

                <div className="text-xl font-semibold mt-8">How many people are going?</div>
                <div className="flex flex-row justify-between items-center text-xl mt-2 border rounded-md p-1">
                  <div className="flex justify-between items-center gap-2 text-md p-2">
                    <div className="flex justify-center items-center rounded-md border w-10 h-10 ">{adultsCount}</div>
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
                <div className="flex flex-row justify-between items-center text-xl mt-2 border rounded-md p-1">
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
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <div className="text-5xl font-semibold mt-8">Meal preferences</div>
                <div className="text-md text-zinc-500 mt-2">Let&apos;s get some details</div>
                <div className="text-xl font-semibold mt-8">Budget level:</div>
                <div className="flex flex-col gap-4 text-5xl mt-2">
                  <div className="text-md text-zinc-500">
                    Depending on the budget level, we will select least or more expensive restaurants.
                  </div>
                  <Slider defaultValue={[1]} max={2} step={1} />
                  <div className="flex flex-row justify-between text-sm">
                    <div>Cheap</div>
                    <div>Mid</div>
                    <div>High</div>
                  </div>
                </div>

                <div className="text-xl font-semibold mt-8">Meals to include</div>
                <div className="flex flex-col text-xl mt-2 ">
                  <div className="text-md text-zinc-500">
                    Prices are an estimate of each meal within this city location.
                  </div>
                  <ToggleGroup
                    type="multiple"
                    variant="outline"
                    value={mealSelections}
                    onValueChange={(value) => handleMealSelections(value)}
                    className="flex w-full mt-4"
                  >
                    <ToggleGroupItem value="breakfast" className="flex flex-col p-8 flex-grow">
                      <div>Breakfast</div>
                      <div>($12 per meal)</div>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="lunch" className="flex flex-col p-8 flex-grow">
                      <div>Lunch</div>
                      <div>($12 per meal)</div>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="dinner" className="flex flex-col p-8 flex-grow">
                      <div>Dinner</div>
                      <div>($12 per meal)</div>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="text-xl font-semibold mt-8">Dietary requirements:</div>

                <div className="text-md text-zinc-500 mt-2">Select any dietary requirements for your trip.</div>

                <Form {...form}>
                  <form className="space-y-8 mt-4">
                    <FormField
                      control={form.control}
                      name="items"
                      render={() => (
                        <FormItem>
                          {items.map((item) => (
                            <FormField
                              key={item.id}
                              control={form.control}
                              name="items"
                              render={({ field }) => {
                                return (
                                  <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value, item.id])
                                            : field.onChange(field.value?.filter((value) => value !== item.id));
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal">{item.label}</FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </form>
                </Form>
              </>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <>
                <div className="text-5xl font-semibold mt-8">Activity preferences</div>
                <div className="text-md text-zinc-500 mt-2">Let&apos;s get some details</div>
                <div className="text-xl font-semibold mt-8">What kinds of activities are you looking for?</div>
                <div className="text-md text-zinc-500 mt-2">
                  Prices are an estimate of each meal within this city location.
                </div>
                <div className="flex flex-col text-xl ">
                  <ToggleGroup
                    type="multiple"
                    variant="outline"
                    value={mealSelections}
                    onValueChange={(value) => handleMealSelections(value)}
                    className="grid grid-cols-3 w-full mt-4"
                  >
                    <ToggleGroupItem value="museums" className="flex flex-col p-8 flex-grow">
                      <div>Museums</div>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="shopping" className="flex flex-col p-8 flex-grow">
                      <div>Shopping</div>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="historical" className="flex flex-col p-8 flex-grow">
                      <div>Historical</div>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="outdoors" className="flex flex-col p-8 flex-grow">
                      <div>Outdoors</div>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="art" className="flex flex-col p-8 flex-grow">
                      <div>Art</div>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="amusement-parks" className="flex flex-col p-8 flex-grow">
                      <div>Amusement Parks</div>
                    </ToggleGroupItem>
                    <ToggleGroupItem value="entertainment" className="flex flex-col p-8 flex-grow">
                      <div>Entertainment</div>
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </>
            )}

            {/* STEP 4 */}
            {step === 4 && (
              <>
                <div className="text-5xl font-semibold mt-8">Shall we generate your itinerary?</div>
                <div className="text-md text-zinc-500 mt-2">Don’t worry... we can make further edits later.</div>
                <div className="text-2xl font-semibold mt-8">Summary</div>

                <div className="text-md font-semibold mt-4">Destination</div>
                <div className="text-md text-zinc-500">Jan 20, 2022 - Feb 09, 2022</div>
                <div className="text-md font-semibold mt-4">Adults</div>
                <div className="text-md text-zinc-500">4</div>
                <div className="text-md font-semibold mt-4">Children</div>
                <div className="text-md text-zinc-500">0</div>
                <div className="text-md font-semibold mt-4">Budget level:</div>
                <div className="text-md text-zinc-500">Mid</div>
                <div className="text-md font-semibold mt-4">Meals to include</div>
                <div className="text-md text-zinc-500">Lunch, Dinner</div>
                <div className="text-md font-semibold mt-4">Dietary requirements</div>
                <div className="text-md text-zinc-500">Vegetarian, Gluten-Free</div>
                <div className="text-md font-semibold mt-4">Interested activities</div>
                <div className="text-md text-zinc-500">Shopping, Historical, Outdoors</div>
              </>
            )}

            {/* BUTTONS NAVIGATION */}
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
                {step === 4 ? (
                  <Button
                    size="sm"
                    variant={"default"}
                    // onClick={() => setStep(step > 4 ? step : step + 1)}
                    className={`${step > 4 ? "pointer-events-none opacity-50" : ""} text-sm w-20 rounded-full`}
                  >
                    Confirm
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant={"default"}
                    onClick={() => setStep(step > 4 ? step : step + 1)}
                    className={`${step > 4 ? "pointer-events-none opacity-50" : ""} text-sm w-20 rounded-full`}
                  >
                    Continue
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-row justify-end mt-8">
                <Button
                  size="sm"
                  variant={"default"}
                  onClick={() => setStep(step > 4 ? step : step + 1)}
                  className={`${step > 4 ? "pointer-events-none opacity-50" : ""} text-sm w-20 rounded-full`}
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
