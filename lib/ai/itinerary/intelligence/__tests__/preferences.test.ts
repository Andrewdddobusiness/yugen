import {
  buildPreferencesPromptLines,
  extractPreferenceHintsFromMessage,
  getAiItineraryPreferencesFromProfile,
  inferPreferencesFromActivities,
  mergeEffectivePreferences,
  parseAiItineraryPreferences,
} from "@/lib/ai/itinerary/intelligence/preferences";

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
    expect(prefs.interests).toEqual(["sights", "museums", "food"]);
  });

  it("extracts explicit hints from a message", () => {
    expect(extractPreferenceHintsFromMessage("Let's do a relaxed shopping day.")).toEqual({
      pace: "relaxed",
      interests: ["shopping"],
    });
  });

  it("builds prompt lines from inferred + explicit", () => {
    const lines = buildPreferencesPromptLines({
      preferences: { pace: "packed", dayStart: "09:00", dayEnd: "18:00", interests: ["shopping", "food"], travelMode: "walking" },
      source: "explicit",
    });
    expect(lines).toEqual([
      "Preferences source: explicit",
      "Pace: packed",
      "Typical day window: 09:00–18:00",
      "Travel mode: walking",
      "Interests: shopping, food",
    ]);
  });

  it("parses stored profile preferences", () => {
    expect(
      parseAiItineraryPreferences({
        version: 1,
        pace: "relaxed",
        day_start: "10:00",
        day_end: "19:00",
        interests: ["food"],
        travel_mode: "walking",
      })
    ).toEqual({
      version: 1,
      pace: "relaxed",
      day_start: "10:00",
      day_end: "19:00",
      interests: ["food"],
      travel_mode: "walking",
    });

    expect(parseAiItineraryPreferences({ version: 1, pace: "invalid" })).toBeNull();

    expect(getAiItineraryPreferencesFromProfile({ ai_itinerary: { version: 1, pace: "balanced" } })).toEqual({
      version: 1,
      pace: "balanced",
    });
  });

  it("merges explicit profile + inferred + message hints", () => {
    const merged = mergeEffectivePreferences({
      explicitProfile: { version: 1, pace: "packed", day_start: "10:00", travel_mode: "driving" },
      inferred: { pace: "relaxed", dayStart: "09:00", dayEnd: "18:00", interests: ["sights"] },
      messageHints: { pace: "relaxed", interests: ["food"] },
    });

    expect(merged.source).toBe("explicit");
    expect(merged.preferences.pace).toBe("relaxed"); // message hint wins
    expect(merged.preferences.dayStart).toBe("10:00"); // explicit wins
    expect(merged.preferences.travelMode).toBe("driving"); // explicit wins
    expect(merged.preferences.interests).toEqual(["food"]); // message hint wins
  });
});
