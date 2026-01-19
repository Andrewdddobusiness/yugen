export const suggestTravelTimeShift = (args: {
  fromEndMin: number;
  toStartMin: number;
  toEndMin: number;
  requiredGapMin: number;
  nextStartMin?: number | null;
  dayEndMin?: number | null;
  maxShiftMin?: number;
}): { shiftMin: number; newStartMin: number; newEndMin: number } | null => {
  const fromEndMin = Number.isFinite(args.fromEndMin) ? Math.floor(args.fromEndMin) : null;
  const toStartMin = Number.isFinite(args.toStartMin) ? Math.floor(args.toStartMin) : null;
  const toEndMin = Number.isFinite(args.toEndMin) ? Math.floor(args.toEndMin) : null;
  const requiredGapMin = Number.isFinite(args.requiredGapMin) ? Math.floor(args.requiredGapMin) : null;

  if (fromEndMin == null || toStartMin == null || toEndMin == null || requiredGapMin == null) return null;
  if (toEndMin <= toStartMin) return null;

  const gapMin = toStartMin - fromEndMin;
  const shiftMin = requiredGapMin - gapMin;
  if (shiftMin <= 0) return null;

  const maxShiftMin = Number.isFinite(args.maxShiftMin) ? Math.max(0, Math.floor(args.maxShiftMin!)) : 90;
  if (shiftMin > maxShiftMin) return null;

  const newStartMin = toStartMin + shiftMin;
  const newEndMin = toEndMin + shiftMin;
  if (newStartMin < 0 || newEndMin <= newStartMin) return null;
  if (newEndMin > 24 * 60) return null;

  const nextStartMin = Number.isFinite(args.nextStartMin as any) ? Math.floor(args.nextStartMin as any) : null;
  if (nextStartMin != null && newEndMin > nextStartMin) return null;

  const dayEndMin = Number.isFinite(args.dayEndMin as any) ? Math.floor(args.dayEndMin as any) : null;
  if (dayEndMin != null && newEndMin > dayEndMin) return null;

  return { shiftMin, newStartMin, newEndMin };
};

