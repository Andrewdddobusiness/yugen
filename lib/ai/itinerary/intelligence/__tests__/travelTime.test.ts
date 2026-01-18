import { classifyTravelTimeConflict } from "@/lib/ai/itinerary/intelligence/travelTime";

describe("classifyTravelTimeConflict", () => {
  it("treats exact-fit as ok", () => {
    expect(classifyTravelTimeConflict({ gapMinutes: 30, travelMinutes: 20, bufferMinutes: 10 })).toEqual({
      ok: true,
      requiredGapMinutes: 30,
      shortByMinutes: 0,
    });
  });

  it("flags when travel+buffer exceeds gap", () => {
    expect(classifyTravelTimeConflict({ gapMinutes: 15, travelMinutes: 20, bufferMinutes: 10 })).toEqual({
      ok: false,
      requiredGapMinutes: 30,
      shortByMinutes: 15,
    });
  });

  it("clamps negative and non-finite inputs", () => {
    expect(classifyTravelTimeConflict({ gapMinutes: -5, travelMinutes: Number.NaN, bufferMinutes: -1 })).toEqual({
      ok: true,
      requiredGapMinutes: 0,
      shortByMinutes: 0,
    });
  });
});

