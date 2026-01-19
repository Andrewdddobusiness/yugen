import { rankSlotAlternativeCandidates } from "@/lib/ai/itinerary/intelligence/alternatives";
import type { OpenHoursRow } from "@/lib/ai/itinerary/intelligence/openHours";

describe("rankSlotAlternativeCandidates", () => {
  it("ranks up to 3 unscheduled, same-destination, open candidates", () => {
    const target = {
      itinerary_activity_id: "10",
      itinerary_destination_id: "1",
      date: "2026-01-05",
      start_time: "10:00:00",
      end_time: "11:00:00",
      activity: {
        activity_id: 100,
        name: "Target Museum",
        types: ["museum"],
        coordinates: [0, 0] as [number, number],
      },
    };

    const candidates = [
      {
        itinerary_activity_id: "11",
        itinerary_destination_id: "1",
        date: null,
        start_time: null,
        end_time: null,
        activity: {
          activity_id: 101,
          name: "Nearby Museum",
          types: ["museum"],
          coordinates: [0.01, 0] as [number, number],
        },
      },
      {
        itinerary_activity_id: "12",
        itinerary_destination_id: "1",
        date: null,
        start_time: null,
        end_time: null,
        activity: {
          activity_id: 102,
          name: "Far Park",
          types: ["park"],
          coordinates: [0.1, 0] as [number, number],
        },
      },
      {
        itinerary_activity_id: "13",
        itinerary_destination_id: "2",
        date: null,
        start_time: null,
        end_time: null,
        activity: {
          activity_id: 103,
          name: "Wrong Destination",
          types: ["museum"],
          coordinates: [0, 0.01] as [number, number],
        },
      },
      {
        itinerary_activity_id: "14",
        itinerary_destination_id: "1",
        date: "2026-01-05",
        start_time: "10:00:00",
        end_time: "11:00:00",
        activity: {
          activity_id: 104,
          name: "Closed During Slot",
          types: ["museum"],
          coordinates: [0.02, 0] as [number, number],
        },
      },
      {
        itinerary_activity_id: "15",
        itinerary_destination_id: "1",
        date: null,
        start_time: null,
        end_time: null,
        activity: {
          activity_id: 105,
          name: "Closest Backup",
          types: ["museum"],
          coordinates: [0.005, 0] as [number, number],
        },
      },
    ];

    const openHoursByActivityId = new Map<number, OpenHoursRow[]>();
    openHoursByActivityId.set(101, [{ day: 1, open_hour: 9, open_minute: 0, close_hour: 17, close_minute: 0 }]);
    openHoursByActivityId.set(104, [{ day: 1, open_hour: 12, open_minute: 0, close_hour: 13, close_minute: 0 }]);

    const ranked = rankSlotAlternativeCandidates({
      target,
      candidates,
      openHoursByActivityId,
    });

    expect(ranked).toHaveLength(3);
    expect(ranked.map((s) => s.itineraryActivityId)).toEqual(["11", "15", "12"]);
    expect(ranked.some((s) => s.itineraryActivityId === "13")).toBe(false);
    expect(ranked.some((s) => s.itineraryActivityId === "14")).toBe(false);
  });

  it("excludes candidates scheduled in a different window", () => {
    const target = {
      itinerary_activity_id: "10",
      itinerary_destination_id: "1",
      date: "2026-01-05",
      start_time: "10:00:00",
      end_time: "11:00:00",
      activity: {
        activity_id: 100,
        name: "Target",
        types: ["museum"],
        coordinates: [0, 0] as [number, number],
      },
    };

    const candidates = [
      {
        itinerary_activity_id: "11",
        itinerary_destination_id: "1",
        date: "2026-01-05",
        start_time: "09:00:00",
        end_time: "10:00:00",
        activity: {
          activity_id: 101,
          name: "Already Scheduled Elsewhere",
          types: ["museum"],
          coordinates: [0.01, 0] as [number, number],
        },
      },
    ];

    const ranked = rankSlotAlternativeCandidates({ target, candidates });
    expect(ranked).toEqual([]);
  });
});

