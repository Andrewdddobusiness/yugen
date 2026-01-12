/**
 * @jest-environment node
 */

import { resolveLinkImportCandidates } from "@/lib/ai/linkImport/resolvePlaceCandidates";
import type { LinkImportCandidate } from "@/lib/ai/linkImport/schema";
import type { IActivity } from "@/store/activityStore";

const makePlace = (place_id: string, name: string, address?: string): IActivity =>
  ({
    place_id,
    name,
    address: address ?? "",
    coordinates: [0, 0],
    types: [],
    price_level: "",
    rating: 0,
    description: "",
    google_maps_url: "",
    website_url: "",
    photo_names: [],
    duration: null,
    phone_number: "",
    reviews: [],
    open_hours: [],
  }) satisfies IActivity;

describe("resolveLinkImportCandidates", () => {
  it("resolves a clear best match into an unscheduled add_place operation", async () => {
    const candidates: LinkImportCandidate[] = [
      {
        sourceCanonicalUrl: "https://example.com/source",
        query: "Louvre Museum",
        evidence: "We visited the Louvre Museum",
        confidence: 0.9,
      },
    ];

    const result = await resolveLinkImportCandidates({
      destination: { city: "Paris", country: "France" },
      candidates,
      fetchCityCoordinatesFn: async () => ({ latitude: 48.8566, longitude: 2.3522 }),
      searchPlacesByTextFn: async () => [
        makePlace("ChIJ1", "Louvre Museum", "Paris"),
        makePlace("ChIJ2", "Orsay Museum", "Paris"),
      ],
    });

    expect(result.clarifications).toEqual([]);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toEqual({
      op: "add_place",
      placeId: "ChIJ1",
      query: "Louvre Museum",
      name: "Louvre Museum",
      date: null,
    });
    expect(result.attributions).toHaveLength(1);
    expect(result.attributions[0].sourceCanonicalUrl).toBe("https://example.com/source");
  });

  it("asks for clarification when results are ambiguous", async () => {
    const candidates: LinkImportCandidate[] = [
      {
        sourceCanonicalUrl: "https://example.com/source",
        query: "Starbucks",
        evidence: "Starbucks near the station",
        confidence: 0.9,
      },
    ];

    const result = await resolveLinkImportCandidates({
      destination: { city: "Tokyo", country: "Japan" },
      candidates,
      fetchCityCoordinatesFn: async () => ({ latitude: 35.6762, longitude: 139.6503 }),
      searchPlacesByTextFn: async () => [
        makePlace("ChIJ1", "Starbucks Shibuya", "Tokyo"),
        makePlace("ChIJ2", "Starbucks Shinjuku", "Tokyo"),
      ],
    });

    expect(result.operations).toHaveLength(0);
    expect(result.clarifications.length).toBeGreaterThan(0);
    expect(result.clarifications[0]).toContain("Which place did you mean");
  });

  it("dedupes resolved operations by placeId and keeps multiple attributions", async () => {
    const candidates: LinkImportCandidate[] = [
      {
        sourceCanonicalUrl: "https://source.one",
        query: "Roscioli",
        evidence: "Roscioli is a must",
        confidence: 0.9,
      },
      {
        sourceCanonicalUrl: "https://source.two",
        query: "Roscioli",
        evidence: "We loved Roscioli",
        confidence: 0.8,
      },
    ];

    const result = await resolveLinkImportCandidates({
      destination: { city: "Rome", country: "Italy" },
      candidates,
      fetchCityCoordinatesFn: async () => ({ latitude: 41.9028, longitude: 12.4964 }),
      searchPlacesByTextFn: async () => [makePlace("ChIJROS", "Roscioli", "Rome")],
    });

    expect(result.operations).toHaveLength(1);
    expect(result.attributions).toHaveLength(2);
    expect(new Set(result.attributions.map((a) => a.sourceCanonicalUrl))).toEqual(
      new Set(["https://source.one", "https://source.two"])
    );
  });

  it("drops low-confidence candidates", async () => {
    const candidates: LinkImportCandidate[] = [
      {
        sourceCanonicalUrl: "https://example.com/source",
        query: "Some place",
        evidence: "Maybe this",
        confidence: 0.1,
      },
    ];

    const result = await resolveLinkImportCandidates({
      destination: { city: "Paris", country: "France" },
      candidates,
      fetchCityCoordinatesFn: async () => ({ latitude: 48.8566, longitude: 2.3522 }),
      searchPlacesByTextFn: async () => [makePlace("ChIJ1", "Some place", "Paris")],
    });

    expect(result.operations).toHaveLength(0);
    expect(result.dropped).toBe(1);
  });
});

