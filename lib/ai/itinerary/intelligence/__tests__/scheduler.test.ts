import { autoScheduleActivities, listIsoDatesInRange } from "@/lib/ai/itinerary/intelligence/scheduler";
import type { OpenHoursRow } from "@/lib/ai/itinerary/intelligence/openHours";

describe("autoScheduleActivities", () => {
  it("assigns dates and sequential times across a range", () => {
    const datePool = listIsoDatesInRange("2026-01-05", "2026-01-06");

    const items = [
      // Cluster A (near 0,0)
      { itineraryActivityId: "a1", name: "A1", coords: { lat: 0, lng: 0 }, durationMin: 60, preferredDate: null, openHours: null },
      { itineraryActivityId: "a2", name: "A2", coords: { lat: 0.001, lng: 0.001 }, durationMin: 60, preferredDate: null, openHours: null },
      { itineraryActivityId: "a3", name: "A3", coords: { lat: 0.002, lng: 0.001 }, durationMin: 60, preferredDate: null, openHours: null },
      { itineraryActivityId: "a4", name: "A4", coords: { lat: 0.003, lng: 0.002 }, durationMin: 60, preferredDate: null, openHours: null },
      // Cluster B (far away)
      { itineraryActivityId: "b1", name: "B1", coords: { lat: 10, lng: 10 }, durationMin: 60, preferredDate: null, openHours: null },
      { itineraryActivityId: "b2", name: "B2", coords: { lat: 10.001, lng: 10.001 }, durationMin: 60, preferredDate: null, openHours: null },
      { itineraryActivityId: "b3", name: "B3", coords: { lat: 10.002, lng: 10.001 }, durationMin: 60, preferredDate: null, openHours: null },
      { itineraryActivityId: "b4", name: "B4", coords: { lat: 10.003, lng: 10.002 }, durationMin: 60, preferredDate: null, openHours: null },
    ];

    const result = autoScheduleActivities({
      datePool,
      items,
      fixed: [],
      dayStartMin: 10 * 60,
      dayEndMin: 18 * 60,
    });

    expect(result.unplaced).toEqual([]);
    expect(result.placements).toHaveLength(8);

    const placementsById = new Map(result.placements.map((p) => [p.itineraryActivityId, p] as const));
    const dateA = placementsById.get("a1")!.date;
    const dateB = placementsById.get("b1")!.date;
    expect(dateA).not.toEqual(dateB);

    for (const id of ["a1", "a2", "a3", "a4"]) {
      expect(placementsById.get(id)!.date).toEqual(dateA);
    }
    for (const id of ["b1", "b2", "b3", "b4"]) {
      expect(placementsById.get(id)!.date).toEqual(dateB);
    }

    for (const date of datePool) {
      const day = result.placements.filter((p) => p.date === date).sort((a, b) => a.startMin - b.startMin);
      for (let i = 1; i < day.length; i += 1) {
        expect(day[i]!.startMin).toBeGreaterThanOrEqual(day[i - 1]!.endMin);
      }
      for (const placement of day) {
        expect(placement.startMin).toBeGreaterThanOrEqual(10 * 60);
        expect(placement.endMin).toBeLessThanOrEqual(18 * 60);
      }
    }
  });

  it("respects opening hours when provided", () => {
    const datePool = ["2026-01-05"]; // Monday (UTC)
    const openHours: OpenHoursRow[] = [
      { day: 1, open_hour: 13, open_minute: 0, close_hour: 17, close_minute: 0 },
    ];

    const result = autoScheduleActivities({
      datePool,
      fixed: [],
      items: [
        {
          itineraryActivityId: "1",
          name: "Only Open After 1PM",
          coords: { lat: 0, lng: 0 },
          durationMin: 60,
          preferredDate: "2026-01-05",
          openHours,
        },
      ],
      dayStartMin: 10 * 60,
      dayEndMin: 18 * 60,
    });

    expect(result.unplaced).toEqual([]);
    expect(result.placements).toHaveLength(1);
    expect(result.placements[0]!.startMin).toBeGreaterThanOrEqual(13 * 60);
  });

  it("spills over to the next day when a day is full", () => {
    const datePool = ["2026-01-05", "2026-01-06"];

    const result = autoScheduleActivities({
      datePool,
      fixed: [],
      items: [
        { itineraryActivityId: "1", name: "One", coords: { lat: 0, lng: 0 }, durationMin: 60, preferredDate: null, openHours: null },
        { itineraryActivityId: "2", name: "Two", coords: { lat: 0.001, lng: 0.001 }, durationMin: 60, preferredDate: null, openHours: null },
      ],
      dayStartMin: 10 * 60,
      dayEndMin: 11 * 60 + 20,
    });

    expect(result.unplaced).toEqual([]);
    expect(result.placements).toHaveLength(2);
    const dates = new Set(result.placements.map((p) => p.date));
    expect(dates.size).toBe(2);
  });
});
