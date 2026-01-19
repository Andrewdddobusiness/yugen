import { buildCustomEventOverlapWarnings } from "@/lib/ai/itinerary/intelligence/customEventOverlaps";

describe("buildCustomEventOverlapWarnings", () => {
  it("returns a warning when a planned item overlaps a custom event", () => {
    const warnings = buildCustomEventOverlapWarnings({
      planned: [
        {
          id: "1",
          name: "Colosseum",
          date: "2026-03-18",
          startTime: "10:00:00",
          endTime: "11:00:00",
        },
      ],
      blocks: [
        {
          id: "flight-1",
          title: "Flight to Rome",
          kind: "flight",
          date: "2026-03-18",
          startTime: "10:30:00",
          endTime: "12:30:00",
        },
      ],
    });

    expect(warnings).toEqual([
      'Overlap on 2026-03-18: "Colosseum" (10:00-11:00) overlaps Flight "Flight to Rome" (10:30-12:30).',
    ]);
  });

  it("returns empty when there are no overlaps", () => {
    const warnings = buildCustomEventOverlapWarnings({
      planned: [
        {
          id: "1",
          name: "Colosseum",
          date: "2026-03-18",
          startTime: "08:00:00",
          endTime: "09:00:00",
        },
      ],
      blocks: [
        {
          id: "check-in-1",
          title: "Hotel check-in",
          kind: "hotel_check_in",
          date: "2026-03-18",
          startTime: "09:30:00",
          endTime: "10:30:00",
        },
      ],
    });

    expect(warnings).toEqual([]);
  });

  it("caps warnings and reports suppressed overlaps", () => {
    const warnings = buildCustomEventOverlapWarnings({
      maxWarnings: 1,
      planned: [
        {
          id: "1",
          name: "Colosseum",
          date: "2026-03-18",
          startTime: "10:00:00",
          endTime: "11:00:00",
        },
        {
          id: "2",
          name: "Trevi Fountain",
          date: "2026-03-18",
          startTime: "10:15:00",
          endTime: "11:15:00",
        },
      ],
      blocks: [
        {
          id: "flight-1",
          title: "Flight to Rome",
          kind: "flight",
          date: "2026-03-18",
          startTime: "10:30:00",
          endTime: "12:30:00",
        },
      ],
    });

    expect(warnings).toEqual([
      'Overlap on 2026-03-18: "Colosseum" (10:00-11:00) overlaps Flight "Flight to Rome" (10:30-12:30).',
      "Overlap warnings omitted for 1 other item(s).",
    ]);
  });
});

