import { getDayOfWeekFromIsoDate, parseTimeToMinutes } from "@/lib/ai/itinerary/intelligence/time";
import { getOpenIntervalsForDay, isOpenForWindow, type OpenHoursRow } from "@/lib/ai/itinerary/intelligence/openHours";

export type AlternativeCandidateActivity = {
  itinerary_activity_id?: string | number;
  itinerary_destination_id?: string | number;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  activity?: {
    activity_id?: string | number;
    name?: string | null;
    types?: string[] | null;
    coordinates?: [number, number] | null;
  } | null;
};

export type SlotAlternativeSuggestion = {
  itineraryActivityId: string;
  score: number;
  distanceMeters: number | null;
  isOpenDuringSlot: boolean | null;
  reasons: string[];
};

const normalizeId = (value: unknown) => String(value ?? "").trim();

const formatDistanceKm = (meters: number) => {
  const km = meters / 1000;
  if (!Number.isFinite(km)) return null;
  if (km < 1) return `${Math.round(km * 10) / 10} km`;
  return `${Math.round(km * 10) / 10} km`;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

// Coordinates are stored as [lng, lat].
const distanceMetersBetween = (a: [number, number], b: [number, number]): number => {
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lng2 - lng1);

  const sinDeltaPhi = Math.sin(deltaPhi / 2);
  const sinDeltaLambda = Math.sin(deltaLambda / 2);

  const aHarv =
    sinDeltaPhi * sinDeltaPhi +
    Math.cos(phi1) * Math.cos(phi2) * sinDeltaLambda * sinDeltaLambda;

  const c = 2 * Math.atan2(Math.sqrt(aHarv), Math.sqrt(1 - aHarv));
  const earthRadiusMeters = 6_371_000;
  return earthRadiusMeters * c;
};

const normalizeTypes = (types: string[] | null | undefined) =>
  (Array.isArray(types) ? types : [])
    .map((t) => String(t ?? "").trim().toLowerCase())
    .filter(Boolean);

const typeOverlapCount = (a: string[], b: string[]) => {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  let count = 0;
  for (const item of b) {
    if (setA.has(item)) count += 1;
  }
  return count;
};

const isSameScheduledWindow = (candidate: AlternativeCandidateActivity, target: AlternativeCandidateActivity) => {
  const candidateDate = String(candidate.date ?? "");
  const candidateStart = String(candidate.start_time ?? "");
  const candidateEnd = String(candidate.end_time ?? "");
  const targetDate = String(target.date ?? "");
  const targetStart = String(target.start_time ?? "");
  const targetEnd = String(target.end_time ?? "");

  return candidateDate && candidateStart && candidateEnd && candidateDate === targetDate && candidateStart === targetStart && candidateEnd === targetEnd;
};

const isEligibleCandidate = (candidate: AlternativeCandidateActivity, target: AlternativeCandidateActivity) => {
  const candidateDate = candidate.date ?? null;
  const isUnscheduled = candidateDate == null && candidate.start_time == null && candidate.end_time == null;
  if (isUnscheduled) return true;
  return isSameScheduledWindow(candidate, target);
};

export const rankSlotAlternativeCandidates = (args: {
  target: AlternativeCandidateActivity;
  candidates: AlternativeCandidateActivity[];
  openHoursByActivityId?: Map<number, OpenHoursRow[]>;
  maxAlternatives?: number;
}): SlotAlternativeSuggestion[] => {
  const max = typeof args.maxAlternatives === "number" ? Math.max(1, Math.min(3, args.maxAlternatives)) : 3;
  const targetId = normalizeId(args.target.itinerary_activity_id);
  const destinationId = normalizeId(args.target.itinerary_destination_id);
  const targetCoords = args.target.activity?.coordinates ?? null;

  const targetDate = typeof args.target.date === "string" ? args.target.date : null;
  const targetStartMin = parseTimeToMinutes(args.target.start_time);
  const targetEndMin = parseTimeToMinutes(args.target.end_time);
  const hasTimeWindow = Boolean(targetDate && targetStartMin != null && targetEndMin != null && targetEndMin > targetStartMin);

  const targetTypes = normalizeTypes(args.target.activity?.types ?? null);

  const scored: SlotAlternativeSuggestion[] = [];

  for (const candidate of args.candidates) {
    const candidateId = normalizeId(candidate.itinerary_activity_id);
    if (!candidateId || candidateId === targetId) continue;
    if (destinationId && normalizeId(candidate.itinerary_destination_id) !== destinationId) continue;
    if (!isEligibleCandidate(candidate, args.target)) continue;

    const reasons: string[] = [];
    let score = 0;

    const candidateCoords = candidate.activity?.coordinates ?? null;
    const distanceMeters =
      targetCoords && candidateCoords ? distanceMetersBetween(targetCoords, candidateCoords) : null;
    if (distanceMeters != null && Number.isFinite(distanceMeters)) {
      const km = distanceMeters / 1000;
      // Reward proximity up to ~10km.
      score += Math.max(0, 10 - km);
      const formatted = formatDistanceKm(distanceMeters);
      if (formatted) reasons.push(`Nearby (${formatted})`);
    }

    const overlap = typeOverlapCount(targetTypes, normalizeTypes(candidate.activity?.types ?? null));
    if (overlap > 0) {
      score += overlap * 1.5;
      reasons.push("Similar vibe");
    }

    let isOpenDuringSlot: boolean | null = null;
    if (hasTimeWindow) {
      const activityIdRaw = candidate.activity?.activity_id;
      const activityId = typeof activityIdRaw === "number" ? activityIdRaw : Number(activityIdRaw);
      const openHours = Number.isFinite(activityId) ? args.openHoursByActivityId?.get(activityId) ?? null : null;

      if (openHours && openHours.length > 0) {
        const intervals = getOpenIntervalsForDay(openHours, getDayOfWeekFromIsoDate(targetDate!));
        if (intervals.length > 0) {
          isOpenDuringSlot = isOpenForWindow(intervals, targetStartMin!, targetEndMin!);
          if (!isOpenDuringSlot) {
            // Strong filter: when we *know* it isn't open, drop it.
            continue;
          }
          score += 3;
          reasons.push("Open during that time");
        }
      }
    }

    scored.push({
      itineraryActivityId: candidateId,
      score,
      distanceMeters: distanceMeters != null && Number.isFinite(distanceMeters) ? distanceMeters : null,
      isOpenDuringSlot,
      reasons,
    });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aDist = a.distanceMeters ?? Number.POSITIVE_INFINITY;
    const bDist = b.distanceMeters ?? Number.POSITIVE_INFINITY;
    if (aDist !== bDist) return aDist - bDist;
    return a.itineraryActivityId.localeCompare(b.itineraryActivityId);
  });

  return scored.slice(0, max);
};

