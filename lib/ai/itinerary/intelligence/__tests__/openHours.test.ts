import { getOpenIntervalsForDay, isOpenForWindow, suggestNextOpenStart } from "@/lib/ai/itinerary/intelligence/openHours";

describe("open hours utils", () => {
  it("builds intervals for a day and checks window containment", () => {
    const intervals = getOpenIntervalsForDay(
      [
        { day: 1, open_hour: 9, open_minute: 0, close_hour: 17, close_minute: 0 },
        { day: 1, open_hour: 18, open_minute: 0, close_hour: 20, close_minute: 0 },
      ],
      1
    );

    expect(intervals).toEqual([
      { startMin: 9 * 60, endMin: 17 * 60 },
      { startMin: 18 * 60, endMin: 20 * 60 },
    ]);

    expect(isOpenForWindow(intervals, 10 * 60, 11 * 60)).toBe(true);
    expect(isOpenForWindow(intervals, 17 * 60 - 10, 17 * 60 + 10)).toBe(false);
  });

  it("splits overnight hours and supports suggestions", () => {
    const intervals = getOpenIntervalsForDay([{ day: 5, open_hour: 20, open_minute: 0, close_hour: 2, close_minute: 0 }], 5);
    expect(intervals).toEqual([
      { startMin: 0, endMin: 2 * 60 },
      { startMin: 20 * 60, endMin: 24 * 60 },
    ]);

    expect(isOpenForWindow(intervals, 21 * 60, 22 * 60)).toBe(true);
    expect(isOpenForWindow(intervals, 3 * 60, 4 * 60)).toBe(false);

    const suggested = suggestNextOpenStart(intervals, 19 * 60, 60);
    expect(suggested).toBe(20 * 60);
  });
});
