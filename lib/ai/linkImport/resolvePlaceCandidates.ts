import { fetchCityCoordinates, searchPlacesByText } from "@/actions/google/actions";
import type { Operation } from "@/lib/ai/itinerary/schema";
import type { LinkImportCandidate } from "@/lib/ai/linkImport/schema";
import type { IActivity } from "@/store/activityStore";

export type LinkImportAttribution = {
  placeId: string;
  sourceCanonicalUrl: string;
  snippet?: string;
  timestampSeconds?: number | null;
};

export type LinkImportClarificationOption = {
  placeId: string;
  name: string;
  address?: string;
};

export type LinkImportPendingClarification = {
  query: string;
  sourceCanonicalUrl: string;
  evidence?: string;
  options: LinkImportClarificationOption[];
};

export type ResolveCandidatesResult = {
  operations: Array<Extract<Operation, { op: "add_place" }>>;
  attributions: LinkImportAttribution[];
  clarifications: string[];
  pendingClarifications: LinkImportPendingClarification[];
  dropped: number;
};

const tokenize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

const scorePlaceMatch = (query: string, candidateName: string) => {
  const queryNormalized = query.toLowerCase().trim();
  const nameNormalized = candidateName.toLowerCase().trim();
  if (!queryNormalized || !nameNormalized) return 0;
  if (nameNormalized === queryNormalized) return 1;
  if (nameNormalized.includes(queryNormalized)) return 0.95;

  const STOP_WORDS = new Set(["the", "a", "an", "and", "or", "in", "at", "to", "of", "for", "on", "near"]);
  const queryTokens = tokenize(queryNormalized).filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
  if (queryTokens.length === 0) return 0;

  const nameTokens = new Set(tokenize(nameNormalized).filter((token) => token.length >= 2 && !STOP_WORDS.has(token)));
  const hits = queryTokens.filter((token) => nameTokens.has(token)).length;
  return hits / queryTokens.length;
};

const makeClarification = (query: string, cityLabel: string, options: Array<{ name: string; address?: string }>) => {
  const header = `Which place did you mean for “${query}” in ${cityLabel}?`;
  if (options.length === 0) {
    return `${header}\n\nPlease reply with a specific place name, or paste a Google Maps link.`;
  }

  const lines = options
    .slice(0, 3)
    .map((opt, idx) => `${idx + 1}) ${opt.name}${opt.address ? ` — ${opt.address}` : ""}`)
    .join("\n");

  return `${header}\n\n${lines}\n\nReply with the correct option (or paste a Google Maps link).`;
};

const isLikelyUrl = (value: string) => /^https?:\/\//i.test(value) || /\bwww\./i.test(value);

const normalizePlaceId = (value: string) => {
  const trimmed = value.trim();
  return trimmed.startsWith("places/") ? trimmed.slice("places/".length) : trimmed;
};

export async function resolveLinkImportCandidates(args: {
  destination: { city?: string | null; country?: string | null };
  candidates: LinkImportCandidate[];
  maxOperations?: number;
  searchPlacesByTextFn?: (
    textQuery: string,
    latitude: number,
    longitude: number,
    radiusInMeters?: number
  ) => Promise<IActivity[]>;
  fetchCityCoordinatesFn?: (cityName: string, countryName: string) => Promise<{ latitude: number; longitude: number }>;
}): Promise<ResolveCandidatesResult> {
  const maxOperations = args.maxOperations ?? 15;
  const candidates = Array.isArray(args.candidates) ? args.candidates.slice(0, 30) : [];

  const city = typeof args.destination?.city === "string" ? args.destination.city.trim() : "";
  const country = typeof args.destination?.country === "string" ? args.destination.country.trim() : "";
  const cityLabel = city && country ? `${city}, ${country}` : city || country || "this destination";

  if (!city || !country) {
    return {
      operations: [],
      attributions: [],
      clarifications: [
        "I can import places from links, but I need the destination city and country to search for matching places.",
      ],
      pendingClarifications: [],
      dropped: candidates.length,
    };
  }

  const fetchCityCoordinatesFn = args.fetchCityCoordinatesFn ?? fetchCityCoordinates;
  const searchPlacesByTextFn = args.searchPlacesByTextFn ?? searchPlacesByText;

  let coordinates: { latitude: number; longitude: number } | null = null;
  try {
    coordinates = await fetchCityCoordinatesFn(city, country);
  } catch {
    return {
      operations: [],
      attributions: [],
      clarifications: [
        "I couldn't look up the destination location right now. Please try again, or paste Google Maps links for the specific places you want to add.",
      ],
      pendingClarifications: [],
      dropped: candidates.length,
    };
  }

  const operations: Array<Extract<Operation, { op: "add_place" }>> = [];
  const attributionsByPlaceId = new Map<string, LinkImportAttribution[]>();
  const clarifications: string[] = [];
  const pendingClarifications: LinkImportPendingClarification[] = [];

  let dropped = 0;

  for (const candidate of candidates) {
    if (operations.length >= maxOperations) break;

    const query = String(candidate?.query ?? "").trim();
    if (!query || query.length < 2 || isLikelyUrl(query)) {
      dropped += 1;
      continue;
    }
    if (typeof candidate?.confidence === "number" && candidate.confidence < 0.25) {
      dropped += 1;
      continue;
    }

    let results: IActivity[] = [];
    try {
      results = await searchPlacesByTextFn(query, coordinates.latitude, coordinates.longitude, 20000);
    } catch {
      clarifications.push(`I couldn't search for “${query}” right now. Please paste a Google Maps link for that place.`);
      dropped += 1;
      continue;
    }

    const limited = Array.isArray(results) ? results.slice(0, 6) : [];
    if (limited.length === 0) {
      clarifications.push(makeClarification(query, cityLabel, []));
      dropped += 1;
      continue;
    }

    const ranked = limited
      .map((row) => ({
        row,
        score: scorePlaceMatch(query, String((row as any)?.name ?? "")),
      }))
      .sort((a, b) => b.score - a.score);

    const best = ranked[0];
    const second = ranked[1];
    const bestScore = best?.score ?? 0;
    const secondScore = second?.score ?? 0;

    const bestPlaceIdRaw = String((best?.row as any)?.place_id ?? "");
    const bestPlaceId = bestPlaceIdRaw ? normalizePlaceId(bestPlaceIdRaw) : "";

    const isClearBest = limited.length === 1 || (bestScore >= 0.75 && bestScore - secondScore >= 0.2);

    if (!bestPlaceId || !isClearBest) {
      const options = ranked.slice(0, 3).map((entry) => ({
        name: String((entry.row as any)?.name ?? "Unknown"),
        address: typeof (entry.row as any)?.address === "string" ? (entry.row as any).address : undefined,
      }));
      clarifications.push(makeClarification(query, cityLabel, options));
      if (pendingClarifications.length === 0 && options.length > 0) {
        pendingClarifications.push({
          query,
          sourceCanonicalUrl: candidate.sourceCanonicalUrl,
          evidence: candidate.evidence,
          options: ranked.slice(0, 3).flatMap((entry) => {
            const placeIdRaw = String((entry.row as any)?.place_id ?? "");
            const placeId = placeIdRaw ? normalizePlaceId(placeIdRaw) : "";
            if (!placeId) return [];
            return [
              {
                placeId,
                name: String((entry.row as any)?.name ?? "Unknown"),
                address: typeof (entry.row as any)?.address === "string" ? (entry.row as any).address : undefined,
              },
            ];
          }),
        });
      }
      dropped += 1;
      continue;
    }

    const existingIdx = operations.findIndex((op) => op.op === "add_place" && op.placeId === bestPlaceId);
    if (existingIdx === -1) {
      operations.push({
        op: "add_place",
        placeId: bestPlaceId,
        query,
        name: typeof (best.row as any)?.name === "string" ? (best.row as any).name : undefined,
        date: null,
      });
    }

    const existing = attributionsByPlaceId.get(bestPlaceId) ?? [];
    existing.push({
      placeId: bestPlaceId,
      sourceCanonicalUrl: candidate.sourceCanonicalUrl,
      snippet: candidate.evidence,
      timestampSeconds: null,
    });
    attributionsByPlaceId.set(bestPlaceId, existing);
  }

  const attributions = Array.from(attributionsByPlaceId.values()).flat();

  return {
    operations,
    attributions,
    clarifications: clarifications.slice(0, 5),
    pendingClarifications,
    dropped,
  };
}
