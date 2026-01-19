import { suggestTravelTimeShift } from "@/lib/ai/itinerary/intelligence/travelTimeShift";

describe("suggestTravelTimeShift", () => {
  it("returns null when there is no conflict", () => {
    expect(
      suggestTravelTimeShift({
        fromEndMin: 600,
        toStartMin: 630,
        toEndMin: 690,
        requiredGapMin: 30,
      })
    ).toBeNull();
  });

  it("suggests shifting the next activity later to satisfy the required gap", () => {
    expect(
      suggestTravelTimeShift({
        fromEndMin: 600,
        toStartMin: 620,
        toEndMin: 680,
        requiredGapMin: 30,
      })
    ).toEqual({ shiftMin: 10, newStartMin: 630, newEndMin: 690 });
  });

  it("returns null if the shift would overlap the next scheduled item", () => {
    expect(
      suggestTravelTimeShift({
        fromEndMin: 600,
        toStartMin: 620,
        toEndMin: 680,
        requiredGapMin: 60,
        nextStartMin: 719,
      })
    ).toBeNull();
  });

  it("returns null if the shift would push beyond day end", () => {
    expect(
      suggestTravelTimeShift({
        fromEndMin: 600,
        toStartMin: 620,
        toEndMin: 680,
        requiredGapMin: 60,
        dayEndMin: 690,
      })
    ).toBeNull();
  });

  it("respects maxShiftMin", () => {
    expect(
      suggestTravelTimeShift({
        fromEndMin: 600,
        toStartMin: 620,
        toEndMin: 680,
        requiredGapMin: 200,
        maxShiftMin: 30,
      })
    ).toBeNull();
  });
});
