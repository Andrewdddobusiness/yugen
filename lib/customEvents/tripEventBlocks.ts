import type { TripEventKind } from "@/lib/customEvents/kinds";

export type TripEventBlockTemplate = {
  kind: TripEventKind;
  title: string;
  defaultDurationMin: number;
  colorHex: `#${string}`;
  defaultNotes?: string;
};

export const TRIP_EVENT_BLOCK_TEMPLATES: TripEventBlockTemplate[] = [
  {
    kind: "flight",
    title: "Flight",
    defaultDurationMin: 180,
    colorHex: "#3B82F6",
    defaultNotes: "Add airline/flight number, terminal/gate, and baggage notes.",
  },
  {
    kind: "hotel_check_in",
    title: "Hotel check-in",
    defaultDurationMin: 60,
    colorHex: "#10B981",
    defaultNotes: "Add hotel name/address and check-in details.",
  },
  {
    kind: "hotel_check_out",
    title: "Hotel check-out",
    defaultDurationMin: 30,
    colorHex: "#F59E0B",
    defaultNotes: "Add checkout time, luggage storage, and transport notes.",
  },
];

export const getTripEventBlockTemplate = (kind: TripEventKind): TripEventBlockTemplate | null =>
  TRIP_EVENT_BLOCK_TEMPLATES.find((template) => template.kind === kind) ?? null;

