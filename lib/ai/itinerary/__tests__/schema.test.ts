import { OperationSchema } from "@/lib/ai/itinerary/schema";

describe("OperationSchema", () => {
  it("rejects add_alternatives payloads with duplicate alternative ids", () => {
    const result = OperationSchema.safeParse({
      op: "add_alternatives",
      targetItineraryActivityId: "10",
      alternativeItineraryActivityIds: ["11", "11"],
    });

    expect(result.success).toBe(false);
  });

  it("rejects add_alternatives payloads that include the target id", () => {
    const result = OperationSchema.safeParse({
      op: "add_alternatives",
      targetItineraryActivityId: "10",
      alternativeItineraryActivityIds: ["10"],
    });

    expect(result.success).toBe(false);
  });

  it("rejects add_alternatives payloads with more than 3 alternatives", () => {
    const result = OperationSchema.safeParse({
      op: "add_alternatives",
      targetItineraryActivityId: "10",
      alternativeItineraryActivityIds: ["11", "12", "13", "14"],
    });

    expect(result.success).toBe(false);
  });

  it("accepts add_alternatives payloads with up to 3 unique alternatives", () => {
    const result = OperationSchema.safeParse({
      op: "add_alternatives",
      targetItineraryActivityId: "10",
      alternativeItineraryActivityIds: ["11", "12", "13"],
    });

    expect(result.success).toBe(true);
  });
});

