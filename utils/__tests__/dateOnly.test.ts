import { toIsoDateString } from "@/utils/dateOnly";

describe("toIsoDateString", () => {
  it("preserves the selected calendar day (avoids UTC off-by-one)", () => {
    const originalTz = process.env.TZ;

    try {
      process.env.TZ = "Australia/Sydney";

      const localMidnight = new Date(2026, 3, 3, 0, 0, 0);

      expect(toIsoDateString(localMidnight)).toBe("2026-04-03");
      expect(localMidnight.toISOString().slice(0, 10)).toBe("2026-04-02");
    } finally {
      if (originalTz === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTz;
      }
    }
  });
});

