import { autoCorrectToNextOpenInterval } from "@/lib/ai/itinerary/intelligence/hoursAutoCorrect";

describe("autoCorrectToNextOpenInterval", () => {
  it("shifts forward to the next interval start when in a closed gap", () => {
    const correction = autoCorrectToNextOpenInterval({
      intervals: [
        { startMin: 9 * 60, endMin: 12 * 60 },
        { startMin: 13 * 60, endMin: 17 * 60 },
      ],
      startMin: 12 * 60 + 30,
      endMin: 13 * 60,
    });

    expect(correction).toEqual({ newStartMin: 13 * 60, newEndMin: 13 * 60 + 30 });
  });

  it("does not shift when it already fits", () => {
    expect(
      autoCorrectToNextOpenInterval({
        intervals: [{ startMin: 9 * 60, endMin: 17 * 60 }],
        startMin: 10 * 60,
        endMin: 11 * 60,
      })
    ).toBeNull();
  });

  it("does not shift if only a backward shift would help", () => {
    expect(
      autoCorrectToNextOpenInterval({
        intervals: [{ startMin: 9 * 60, endMin: 17 * 60 }],
        startMin: 16 * 60 + 30,
        endMin: 18 * 60,
      })
    ).toBeNull();
  });
});

