import { getCityLabelForDateKey } from "@/lib/itinerary/cityTimeline";

describe("cityTimeline", () => {
  it("prefers the destination that starts on the day when ranges overlap", () => {
    const destinations = [
      {
        itinerary_destination_id: 1,
        city: "Zürich",
        country: "Switzerland",
        from_date: "2026-03-31",
        to_date: "2026-04-03",
        order_number: 1,
      },
      {
        itinerary_destination_id: 2,
        city: "Paris",
        country: "France",
        from_date: "2026-04-03",
        to_date: "2026-04-07",
        order_number: 2,
      },
    ];

    expect(getCityLabelForDateKey("2026-04-02", destinations as any)).toBe("Zürich");
    expect(getCityLabelForDateKey("2026-04-03", destinations as any)).toBe("Zürich → Paris");
    expect(getCityLabelForDateKey("2026-04-04", destinations as any)).toBe("Paris");
  });
});

