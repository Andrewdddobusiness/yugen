import { buildCuratedDayPlan, buildIsoDateRange, parseDurationToMinutes, type CurationCandidate } from "@/lib/ai/itinerary/intelligence/curation";

describe("curation helpers", () => {
  it("builds a bounded ISO date range", () => {
    expect(buildIsoDateRange("2026-03-18", "2026-03-20")).toEqual(["2026-03-18", "2026-03-19", "2026-03-20"]);
    expect(buildIsoDateRange("2026-03-20", "2026-03-18")).toEqual([]);
  });

  it("parses common duration formats", () => {
    expect(parseDurationToMinutes("45 minutes")).toBe(45);
    expect(parseDurationToMinutes("00:30:00")).toBe(30);
    expect(parseDurationToMinutes(60)).toBe(60);
    expect(parseDurationToMinutes("")).toBeNull();
  });

  it("schedules within opening hours when known", () => {
    const dateRange = ["2026-03-18"];
    const candidates: CurationCandidate[] = [
      {
        itineraryActivityId: "1",
        name: "Museum",
        activityId: 10,
        coords: { lat: 41.9, lng: 12.5 },
        types: ["museum"],
        durationMin: 60,
        lockedDate: null,
      },
    ];

    const openHoursByActivityId = new Map<number, any[]>([
      [
        10,
        [
          { day: 3, open_hour: 10, open_minute: 0, close_hour: 17, close_minute: 0 }, // Wed
        ],
      ],
    ]);

    const result = buildCuratedDayPlan({
      dateRange,
      candidates,
      fixedByDate: new Map(),
      openHoursByActivityId: openHoursByActivityId as any,
      preferences: {
        pace: "balanced",
        dayStart: "09:00",
        dayEnd: "18:00",
        interests: ["museums"],
        travelMode: "walking",
      },
      requestedTheme: "museums",
      maxOperations: 25,
    });

    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toMatchObject({
      op: "update_activity",
      itineraryActivityId: "1",
      date: "2026-03-18",
      startTime: "10:00",
    });
  });

  it("produces stable results regardless of input ordering", () => {
    const dateRange = ["2026-03-18"];
    const candidates: CurationCandidate[] = [
      {
        itineraryActivityId: "1",
        name: "Spot A",
        activityId: null,
        coords: { lat: 41.9, lng: 12.5 },
        types: ["museum"],
        durationMin: 60,
        lockedDate: null,
      },
      {
        itineraryActivityId: "2",
        name: "Spot B",
        activityId: null,
        coords: { lat: 41.901, lng: 12.501 },
        types: ["museum"],
        durationMin: 60,
        lockedDate: null,
      },
      {
        itineraryActivityId: "3",
        name: "Spot C",
        activityId: null,
        coords: { lat: 41.91, lng: 12.49 },
        types: ["shopping"],
        durationMin: 60,
        lockedDate: null,
      },
      {
        itineraryActivityId: "4",
        name: "Spot D",
        activityId: null,
        coords: { lat: 41.911, lng: 12.491 },
        types: ["shopping"],
        durationMin: 60,
        lockedDate: null,
      },
    ];

    const run = (input: CurationCandidate[]) =>
      buildCuratedDayPlan({
        dateRange,
        candidates: input,
        fixedByDate: new Map(),
        openHoursByActivityId: new Map() as any,
        preferences: {
          pace: "balanced",
          dayStart: "09:00",
          dayEnd: "18:00",
          interests: [],
          travelMode: "walking",
        },
        requestedTheme: null,
        maxOperations: 25,
      });

    const a = run(candidates);
    const b = run([candidates[3], candidates[1], candidates[0], candidates[2]]);

    expect(b.operations).toEqual(a.operations);
    expect(b.dayPlans).toEqual(a.dayPlans);
  });
});
