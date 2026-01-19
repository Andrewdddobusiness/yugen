export const ITINERARY_CUSTOM_EVENT_KIND_VALUES = [
  "custom",
  "flight",
  "hotel_check_in",
  "hotel_check_out",
] as const;

export type ItineraryCustomEventKind = (typeof ITINERARY_CUSTOM_EVENT_KIND_VALUES)[number];

export type TripEventKind = Exclude<ItineraryCustomEventKind, "custom">;

export const isItineraryCustomEventKind = (value: unknown): value is ItineraryCustomEventKind =>
  ITINERARY_CUSTOM_EVENT_KIND_VALUES.includes(value as ItineraryCustomEventKind);

export const getCustomEventKindLabel = (kind: ItineraryCustomEventKind | null | undefined) => {
  switch (kind) {
    case "flight":
      return "Flight";
    case "hotel_check_in":
      return "Hotel check-in";
    case "hotel_check_out":
      return "Hotel check-out";
    case "custom":
    default:
      return "Note";
  }
};

