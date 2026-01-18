export type TravelTimeGapStatus = "ok" | "tight" | "conflict";

export type TravelTimeConflict = {
  status: TravelTimeGapStatus;
  requiredGapMinutes: number;
  slackMinutes: number;
  shortByMinutes: number;
};

export const classifyTravelTimeConflict = (args: {
  gapMinutes: number;
  travelMinutes: number;
  bufferMinutes: number;
  tightThresholdMinutes?: number;
}): TravelTimeConflict => {
  const gapMinutes = Number.isFinite(args.gapMinutes) ? Math.max(0, Math.floor(args.gapMinutes)) : 0;
  const travelMinutes = Number.isFinite(args.travelMinutes) ? Math.max(0, Math.floor(args.travelMinutes)) : 0;
  const bufferMinutes = Number.isFinite(args.bufferMinutes) ? Math.max(0, Math.floor(args.bufferMinutes)) : 0;
  const tightThresholdMinutes = Number.isFinite(args.tightThresholdMinutes)
    ? Math.max(0, Math.floor(args.tightThresholdMinutes!))
    : 5;

  const requiredGapMinutes = travelMinutes + bufferMinutes;
  const slackMinutes = gapMinutes - requiredGapMinutes;
  const shortByMinutes = requiredGapMinutes - gapMinutes;

  if (shortByMinutes > 0) {
    return {
      status: "conflict",
      requiredGapMinutes,
      slackMinutes: 0,
      shortByMinutes,
    };
  }

  const slack = Math.max(0, slackMinutes);
  return {
    status: slack <= tightThresholdMinutes ? "tight" : "ok",
    requiredGapMinutes,
    slackMinutes: slack,
    shortByMinutes: 0,
  };
};
