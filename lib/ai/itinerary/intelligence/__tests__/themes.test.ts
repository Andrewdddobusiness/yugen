import { classifyThemesFromTypes, inferDayThemeFromMessage, primaryThemeFromTypes } from "@/lib/ai/itinerary/intelligence/themes";

describe("themes helpers", () => {
  it("classifies themes from Google place types", () => {
    expect(classifyThemesFromTypes(["shopping_mall"])).toEqual(["shopping"]);
    expect(classifyThemesFromTypes(["museum"])).toEqual(["museums"]);
    expect(classifyThemesFromTypes(["night_club"])).toEqual(["nightlife"]);
    expect(classifyThemesFromTypes(["national_park"])).toEqual(["nature"]);
  });

  it("picks a stable primary theme", () => {
    expect(primaryThemeFromTypes(["museum", "restaurant"])).toBe("museums");
    expect(primaryThemeFromTypes(["restaurant", "shopping_mall"])).toBe("shopping");
  });

  it("infers theme from user message", () => {
    expect(inferDayThemeFromMessage("Can you plan a shopping day for Rome?")).toBe("shopping");
    expect(inferDayThemeFromMessage("Let's do a museums + sights day.")).toBe("mixed");
  });
});

