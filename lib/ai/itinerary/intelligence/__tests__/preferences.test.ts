import { buildPreferencesPromptLines, extractPreferenceHintsFromMessage, inferPreferencesFromActivities } from "@/lib/ai/itinerary/intelligence/preferences";

describe("preferences helpers", () => {
  it("infers a reasonable day window and pace", () => {
    const prefs = inferPreferencesFromActivities([
      { date: "2026-03-18", start_time: "09:00:00", end_time: "10:00:00", activity: { types: ["museum"] } },
      { date: "2026-03-18", start_time: "10:30:00", end_time: "11:30:00", activity: { types: ["tourist_attraction"] } },
      { date: "2026-03-19", start_time: "11:00:00", end_time: "12:00:00", activity: { types: ["restaurant"] } },
      { date: "2026-03-19", start_time: "13:00:00", end_time: "14:00:00", activity: { types: ["shopping_mall"] } },
    ]);

    expect(prefs.pace).toBe("relaxed");
    expect(prefs.dayStart).toBe("10:45");
    expect(prefs.dayEnd).toBe("11:45");
    expect(prefs.interests).toEqual(["sights", "food", "shopping"]);
  });

  it("extracts explicit hints from a message", () => {
    expect(extractPreferenceHintsFromMessage("Let's do a relaxed shopping day.")).toEqual({
      pace: "relaxed",
      interests: ["shopping"],
    });
  });

  it("builds prompt lines from inferred + explicit", () => {
    const lines = buildPreferencesPromptLines({
      inferred: { pace: "balanced", dayStart: "09:00", dayEnd: "18:00", interests: ["food"] },
      explicit: { pace: "packed", interests: ["shopping", "food"] },
    });
    expect(lines).toEqual(["Pace: packed", "Typical day window: 09:00–18:00", "Interests: shopping, food"]);
  });
});
