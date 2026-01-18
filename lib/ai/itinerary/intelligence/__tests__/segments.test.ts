import { buildAdjacentSegmentsForDate } from "@/lib/ai/itinerary/intelligence/segments";

describe("buildAdjacentSegmentsForDate", () => {
  it("orders by start time and computes gaps", () => {
    const segments = buildAdjacentSegmentsForDate({
      date: "2026-03-18",
      rows: [
        { id: "b", name: "B", date: "2026-03-18", startTime: "10:00", endTime: "11:00" },
        { id: "a", name: "A", date: "2026-03-18", startTime: "09:00", endTime: "09:30" },
        { id: "c", name: "C", date: "2026-03-18", startTime: "11:15", endTime: "12:00" },
      ],
    });

    expect(segments).toEqual([
      {
        date: "2026-03-18",
        fromId: "a",
        toId: "b",
        fromName: "A",
        toName: "B",
        fromEndMin: 9 * 60 + 30,
        toStartMin: 10 * 60,
        gapMinutes: 30,
      },
      {
        date: "2026-03-18",
        fromId: "b",
        toId: "c",
        fromName: "B",
        toName: "C",
        fromEndMin: 11 * 60,
        toStartMin: 11 * 60 + 15,
        gapMinutes: 15,
      },
    ]);
  });

  it("drops invalid times", () => {
    const segments = buildAdjacentSegmentsForDate({
      date: "2026-03-18",
      rows: [
        { id: "a", name: "A", date: "2026-03-18", startTime: "bad", endTime: "09:30" },
        { id: "b", name: "B", date: "2026-03-18", startTime: "10:00", endTime: "09:00" },
        { id: "c", name: "C", date: "2026-03-18", startTime: "11:00", endTime: "12:00" },
      ],
    });

    expect(segments).toEqual([]);
  });
});

