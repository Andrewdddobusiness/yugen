export type TravelTimeConflict = {
  ok: boolean;
  requiredGapMinutes: number;
  shortByMinutes: number;
};

export const classifyTravelTimeConflict = (args: {
  gapMinutes: number;
  travelMinutes: number;
  bufferMinutes: number;
}): TravelTimeConflict => {
  const gapMinutes = Number.isFinite(args.gapMinutes) ? Math.max(0, Math.floor(args.gapMinutes)) : 0;
  const travelMinutes = Number.isFinite(args.travelMinutes) ? Math.max(0, Math.floor(args.travelMinutes)) : 0;
  const bufferMinutes = Number.isFinite(args.bufferMinutes) ? Math.max(0, Math.floor(args.bufferMinutes)) : 0;

  const requiredGapMinutes = travelMinutes + bufferMinutes;
  const shortByMinutes = requiredGapMinutes - gapMinutes;

  return {
    ok: shortByMinutes <= 0,
    requiredGapMinutes,
    shortByMinutes: Math.max(0, shortByMinutes),
  };
};

