"use client";
import { useEffect, useMemo, useState } from "react";
import { useDebounce } from "@/components/hooks/use-debounce";
import { useIsMobile } from "@/components/hooks/use-mobile";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TimePopover from "@/components/form/TimePopover";

import { DatePickerPopover } from "@/components/form/date/DatePickerPopover";

import { useItineraryActivityStore } from "@/store/itineraryActivityStore";
import { useItinerarySlotStore } from "@/store/itinerarySlotStore";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";
import { NotesPopover } from "@/components/form/NotesPopover";
import { ChevronDown, MapPin, Phone, Globe, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useDateRangeStore } from "@/store/dateRangeStore";
import { useItineraryCustomEventStore, type ItineraryCustomEvent } from "@/store/itineraryCustomEventStore";
import { deleteItineraryCustomEvent } from "@/actions/supabase/customEvents";

import { useParams } from "next/navigation";
import ItineraryTableRow from "@/components/table/itineraryTableRow";
import ItineraryCustomEventRow from "@/components/table/itineraryCustomEventRow";
import { ItineraryTableDateHeader } from "@/components/table/itineraryTableDateHeader";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ACTIVITY_ACCENT_DOT_CLASSES,
  ACTIVITY_CATEGORY_LABELS,
  getActivityCategory,
  getActivityThemeForTypes,
  type ActivityCategory,
} from "@/lib/activityAccent";
import { formatTime } from "@/utils/formatting/datetime";

type TableScheduleFilter = "all" | "scheduled" | "unscheduled";
type TableFilters = {
  searchText: string;
  categories: ActivityCategory[];
  schedule: TableScheduleFilter;
};

type TableItem =
  | { kind: "activity"; data: any }
  | { kind: "custom-event"; data: ItineraryCustomEvent };

const TABLE_FILTER_CATEGORIES = Object.keys(ACTIVITY_CATEGORY_LABELS) as ActivityCategory[];

const CATEGORY_SAMPLE_TYPES: Record<ActivityCategory, string[]> = {
  food: ["restaurant"],
  sights: ["tourist_attraction"],
  shopping: ["shopping_mall"],
  nature: ["park"],
  entertainment: ["movie_theater"],
  lodging: ["lodging"],
  transport: ["airport"],
  other: [],
};

const DEFAULT_TABLE_FILTERS: TableFilters = {
  searchText: "",
  categories: [],
  schedule: "all",
};

interface ItineraryTableViewProps {
  showMap?: boolean;
  onToggleMap?: () => void;
}

export function ItineraryTableView({ showMap, onToggleMap }: ItineraryTableViewProps) {
  const isMobile = useIsMobile();
  const { itineraryId } = useParams();
  const saveViewState = useItineraryLayoutStore((s) => s.saveViewState);
  const getViewState = useItineraryLayoutStore((s) => s.getViewState);
  const activityCategoryAccents = useItineraryLayoutStore((s) => s.activityCategoryAccents);
  const activityCategoryCustomColors = useItineraryLayoutStore((s) => s.activityCategoryCustomColors);

  /* STATE */
  // Initialize expanded cards from store
  const [expandedCards, setExpandedCards] = useState<{ [key: string]: boolean }>(() => {
    const viewState = getViewState('table');
    const expanded: { [key: string]: boolean } = {};
    viewState.expandedCards.forEach(cardId => {
      expanded[cardId] = true;
    });
    return expanded;
  });

  const [filters, setFilters] = useState<TableFilters>(() => {
    const viewState = getViewState("table");
    const stored = viewState.filters;
    if (!stored) return DEFAULT_TABLE_FILTERS;

    const schedule: TableScheduleFilter =
      stored.schedule === "scheduled" || stored.schedule === "unscheduled" || stored.schedule === "all"
        ? stored.schedule
        : "all";

    const categories = Array.isArray(stored.categories)
      ? (stored.categories.filter((category): category is ActivityCategory => TABLE_FILTER_CATEGORIES.includes(category)) as ActivityCategory[])
      : [];

    return {
      searchText: typeof stored.searchText === "string" ? stored.searchText : "",
      categories,
      schedule,
    };
  });

  /* STORE */
  const { itineraryActivities, removeItineraryActivity } = useItineraryActivityStore();
  const slots = useItinerarySlotStore((s) => s.slots);
  const slotOptions = useItinerarySlotStore((s) => s.slotOptions);
  const customEvents = useItineraryCustomEventStore((s) => s.customEvents);
  const updateCustomEvent = useItineraryCustomEventStore((s) => s.updateCustomEvent);
  const upsertCustomEvent = useItineraryCustomEventStore((s) => s.upsertCustomEvent);
  const getCustomEventById = useItineraryCustomEventStore((s) => s.getCustomEventById);
  const { startDate, endDate } = useDateRangeStore();

  const debouncedSearchText = useDebounce(filters.searchText, 150);

  useEffect(() => {
    saveViewState("table", {
      filters: {
        searchText: debouncedSearchText,
        categories: filters.categories,
        schedule: filters.schedule,
      },
    });
  }, [debouncedSearchText, filters.categories, filters.schedule, saveViewState]);

  const toggleCard = (id: string) => {
    setExpandedCards((prev) => {
      const newExpanded = {
        ...prev,
        [id]: !prev[id],
      };
      
      // Save expanded cards to store
      const expandedCardIds = Object.keys(newExpanded).filter(cardId => newExpanded[cardId]);
      saveViewState('table', {
        expandedCards: expandedCardIds
      });
      
      return newExpanded;
    });
  };

  const toggleCategory = (category: ActivityCategory) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((existing) => existing !== category)
        : [...prev.categories, category],
    }));
  };

  const clearAllFilters = () => {
    setFilters({
      ...DEFAULT_TABLE_FILTERS,
      categories: [],
    });
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type?.toLowerCase()) {
      case "restaurant":
        return "default";
      case "attraction":
        return "secondary";
      default:
        return "default";
    }
  };

  const groupItemsByDate = (items: TableItem[]) => {
    const groups: Record<string, TableItem[]> = {
      unscheduled: [],
    };

    const toSortableMinutes = (time: string | null | undefined) => {
      if (!time) return Number.POSITIVE_INFINITY;
      const [hour, minute] = time.slice(0, 5).split(":").map(Number);
      if (!Number.isFinite(hour) || !Number.isFinite(minute)) return Number.POSITIVE_INFINITY;
      return hour * 60 + minute;
    };

    const getItemLabel = (item: TableItem) => {
      if (item.kind === "custom-event") return item.data.title ?? "";
      return item.data.activity?.name ?? "";
    };

    items.forEach((item) => {
      const itemDate = item.data.date;
      if (!itemDate) {
        groups.unscheduled.push(item);
      } else {
        const date = new Date(itemDate).toISOString().split("T")[0];
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(item);
      }
    });

    for (const [dateKey, list] of Object.entries(groups)) {
      list.sort((a, b) => {
        const aStart = toSortableMinutes(a.data.start_time);
        const bStart = toSortableMinutes(b.data.start_time);
        if (aStart !== bStart) return aStart - bStart;
        if (a.kind !== b.kind) return a.kind.localeCompare(b.kind);
        return getItemLabel(a).localeCompare(getItemLabel(b));
      });

      if (dateKey === "unscheduled") continue;
    }

    if (groups.unscheduled.length === 0) {
      delete groups.unscheduled;
    }

    return Object.entries(groups).sort(([dateA], [dateB]) => {
      if (dateA === "unscheduled") return 1;
      if (dateB === "unscheduled") return -1;
      return new Date(dateA).getTime() - new Date(dateB).getTime();
    });
  };

  const formatDate = (dateString: string) => {
    if (dateString === "unscheduled") return "Unscheduled";
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  };

  const itineraryActivitiesOnlyActivities = useMemo(
    () => {
      const slotIdByActivityId = new Map<string, string>();
      const activityIdsBySlotId = new Map<string, string[]>();

      for (const option of slotOptions) {
        const slotId = String((option as any)?.itinerary_slot_id ?? "").trim();
        const activityId = String((option as any)?.itinerary_activity_id ?? "").trim();
        if (!slotId || !activityId) continue;
        slotIdByActivityId.set(activityId, slotId);
        const list = activityIdsBySlotId.get(slotId) ?? [];
        list.push(activityId);
        activityIdsBySlotId.set(slotId, list);
      }

      const primaryBySlotId = new Map<string, string>();
      for (const slot of slots) {
        const slotId = String((slot as any)?.itinerary_slot_id ?? "").trim();
        if (!slotId) continue;
        const primary = String((slot as any)?.primary_itinerary_activity_id ?? "").trim();
        if (primary) primaryBySlotId.set(slotId, primary);
      }

      const isPrimaryForActivity = (itineraryActivityId: string) => {
        const id = String(itineraryActivityId ?? "").trim();
        if (!id) return true;
        const slotId = slotIdByActivityId.get(id);
        if (!slotId) return true;
        const optionIds = activityIdsBySlotId.get(slotId) ?? [];
        if (optionIds.length <= 1) return true;
        const primary =
          primaryBySlotId.get(slotId) ??
          optionIds
            .slice()
            .sort((a, b) => Number(a) - Number(b))
            .find(Boolean);
        if (!primary) return true;
        return primary === id;
      };

      return itineraryActivities.filter(
        (itineraryActivity) =>
          itineraryActivity.deleted_at === null && isPrimaryForActivity(String(itineraryActivity.itinerary_activity_id))
      );
    },
    [itineraryActivities, slotOptions, slots]
  );

  const itineraryCustomEventsOnlyEvents = useMemo(
    () => customEvents.filter((event) => event.deleted_at === null),
    [customEvents]
  );

  const filteredActivities = useMemo(() => {
    const search = debouncedSearchText.trim().toLowerCase();
    const hasSearch = Boolean(search);
    const hasCategoryFilter = filters.categories.length > 0;
    const schedule = filters.schedule;

    if (!hasSearch && !hasCategoryFilter && schedule === "all") {
      return itineraryActivitiesOnlyActivities;
    }

    return itineraryActivitiesOnlyActivities.filter((activity) => {
      if (schedule === "scheduled" && !activity.date) return false;
      if (schedule === "unscheduled" && activity.date) return false;

      if (hasCategoryFilter) {
        const category = getActivityCategory(activity.activity?.types);
        if (!filters.categories.includes(category)) return false;
      }

      if (hasSearch) {
        const name = activity.activity?.name ?? "";
        const address = activity.activity?.address ?? "";
        const notes = activity.notes ?? "";
        const types = (activity.activity?.types ?? []).join(" ");
        const haystack = `${name} ${address} ${notes} ${types}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  }, [debouncedSearchText, filters.categories, filters.schedule, itineraryActivitiesOnlyActivities]);

  const filteredCustomEvents = useMemo(() => {
    const search = debouncedSearchText.trim().toLowerCase();
    const hasSearch = Boolean(search);
    const schedule = filters.schedule;

    if (!hasSearch && schedule === "all") {
      return itineraryCustomEventsOnlyEvents;
    }

    return itineraryCustomEventsOnlyEvents.filter((event) => {
      if (schedule === "scheduled" && !event.date) return false;
      if (schedule === "unscheduled" && event.date) return false;

      if (hasSearch) {
        const title = event.title ?? "";
        const notes = event.notes ?? "";
        const haystack = `${title} ${notes}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  }, [debouncedSearchText, filters.schedule, itineraryCustomEventsOnlyEvents]);

  const totalActivitiesCount = itineraryActivitiesOnlyActivities.length;
  const filteredActivitiesCount = filteredActivities.length;
  const totalCustomEventsCount = itineraryCustomEventsOnlyEvents.length;
  const filteredCustomEventsCount = filteredCustomEvents.length;
  const totalItemsCount = totalActivitiesCount + totalCustomEventsCount;
  const filteredItemsCount = filteredActivitiesCount + filteredCustomEventsCount;

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(TABLE_FILTER_CATEGORIES.map((category) => [category, 0])) as Record<
      ActivityCategory,
      number
    >;

    itineraryActivitiesOnlyActivities.forEach((activity) => {
      const category = getActivityCategory(activity.activity?.types);
      counts[category] += 1;
    });

    return counts;
  }, [itineraryActivitiesOnlyActivities]);

  const groupedItems = groupItemsByDate([
    ...filteredActivities.map<TableItem>((activity) => ({ kind: "activity", data: activity })),
    ...filteredCustomEvents.map<TableItem>((event) => ({ kind: "custom-event", data: event })),
  ]);

  const handleRemoveActivity = async (placeId: string) => {
    try {
      if (!itineraryId) return;
      await removeItineraryActivity(placeId, Array.isArray(itineraryId) ? itineraryId[0] : itineraryId);
    } catch (error) {
      console.error("Error removing activity:", error);
    }
  };

  const handleRemoveCustomEvent = async (eventId: number) => {
    const eventIdNumber = Number(eventId);
    if (!Number.isFinite(eventIdNumber)) return;

    const previous = getCustomEventById(eventIdNumber);
    if (!previous) return;

    const optimisticDeletedAt = new Date().toISOString();
    updateCustomEvent(eventIdNumber, { deleted_at: optimisticDeletedAt });

    try {
      const result = await deleteItineraryCustomEvent(String(eventIdNumber));
      if (!result.success || !result.data) {
        throw new Error(result.error?.message ?? "Failed to delete");
      }
      upsertCustomEvent(result.data);
    } catch (error) {
      console.error("Error removing note:", error);
      updateCustomEvent(eventIdNumber, { deleted_at: previous.deleted_at });
    }
  };

  if (isMobile) {
    return (
      <div className="space-y-6 p-4 z-0 ">
        {groupedItems.length === 0 ? (
          <div className="rounded-xl border border-stroke-200 bg-bg-0 p-4 text-sm text-ink-500">
            No items match your filters.
          </div>
        ) : (
          groupedItems.map(([date, items]) => (
            <div key={date} className="space-y-2">
              <h3 className="font-medium text-gray-900">{formatDate(date)}</h3>

              <div className="space-y-2">
                {items.map((item, index) => {
                  if (item.kind === "custom-event") {
                    const event = item.data;
                    const cardId = `custom-${event.itinerary_custom_event_id}`;
                    const isExpanded = expandedCards[cardId];

                    return (
                      <div
                        key={cardId}
                        className={cn(
                          "bg-white rounded-lg shadow-sm border border-gray-200",
                          index !== 0 && "-mt-[1px]"
                        )}
                      >
                        <Button
                          variant="ghost"
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                          onClick={() => toggleCard(cardId)}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2 min-w-0">
                              <span className="font-medium truncate">{event.title}</span>
                            </div>
                            <ChevronDown
                              className={cn(
                                "h-5 w-5 transition-transform duration-200",
                                isExpanded && "rotate-180"
                              )}
                            />
                          </div>
                        </Button>

                        <div
                          className={cn(
                            "grid transition-all duration-200 ease-in-out",
                            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                          )}
                        >
                          <div className="overflow-hidden">
                            <div className="p-4 pt-0 space-y-3 border-t">
                              <div className="grid grid-cols-2 gap-2 pt-2">
                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Date</div>
                                  <div className="w-full rounded-xl border border-stroke-200 bg-bg-0 px-3 py-2 text-xs text-muted-foreground">
                                    {event.date ? formatDate(event.date) : "Unscheduled"}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-xs text-gray-500 mb-1">Time</div>
                                  <div className="w-full rounded-xl border border-stroke-200 bg-bg-0 px-3 py-2 text-xs text-muted-foreground">
                                    {event.start_time && event.end_time
                                      ? `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`
                                      : "Set time"}
                                  </div>
                                </div>
                              </div>

                              <div>
                                <div className="text-xs text-gray-500 mb-1">Notes</div>
                                <div className="text-sm text-gray-600 whitespace-pre-wrap">
                                  {event.notes || "-"}
                                </div>
                              </div>

                              <Button
                                type="button"
                                variant="ghost"
                                className="h-9 w-full justify-center rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => handleRemoveCustomEvent(event.itinerary_custom_event_id)}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const activity = item.data;

                  return (
                    <div
                      key={activity.itinerary_activity_id}
                      className={cn(
                        "bg-white rounded-lg shadow-sm border border-gray-200",
                        index !== 0 && "-mt-[1px]"
                      )}
                    >
                      <Button
                        variant="ghost"
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                        onClick={() => toggleCard(activity.itinerary_activity_id)}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{activity.activity?.name}</span>
                          </div>
                          <ChevronDown
                            className={cn(
                              "h-5 w-5 transition-transform duration-200",
                              expandedCards[activity.itinerary_activity_id] && "rotate-180"
                            )}
                          />
                        </div>
                      </Button>

                      <div
                        className={cn(
                          "grid transition-all duration-200 ease-in-out",
                          expandedCards[activity.itinerary_activity_id]
                            ? "grid-rows-[1fr] opacity-100"
                            : "grid-rows-[0fr] opacity-0"
                        )}
                      >
                        <div className="overflow-hidden">
                          <div className="p-4 pt-0 space-y-3 border-t">
                            <div className="grid grid-cols-2 gap-2 pt-2">
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Date</div>
                                <DatePickerPopover
                                  itineraryActivityId={activity.itinerary_activity_id}
                                  showText={true}
                                  styled={true}
                                  startDate={startDate || undefined}
                                  endDate={endDate || undefined}
                                />
                              </div>

                              <div>
                                <div className="text-xs text-gray-500 mb-1">Time</div>
                                <TimePopover
                                  itineraryActivityId={activity.itinerary_activity_id}
                                  storeStartTime={activity.start_time}
                                  storeEndTime={activity.end_time}
                                  showText={true}
                                  styled={true}
                                />
                              </div>
                            </div>

                            {activity.activity?.address && (
                              <div className="flex items-start space-x-3 text-sm text-gray-600">
                                <MapPin size={16} />
                                <span>{activity.activity.address}</span>
                              </div>
                            )}

                            {activity.activity?.phone_number && (
                              <div className="flex items-center space-x-3 text-sm text-gray-600">
                                <Phone size={16} />
                                <Link href={`tel:${activity.activity.phone_number}`} className="hover:underline">
                                  {activity.activity.phone_number}
                                </Link>
                              </div>
                            )}

                            {activity.activity?.website_url && (
                              <div className="flex items-center space-x-3 text-sm text-gray-600">
                                <Globe size={16} />
                                <Link
                                  href={activity.activity.website_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="hover:underline truncate text-blue-500"
                                >
                                  {activity.activity.website_url}
                                </Link>
                              </div>
                            )}

                            <div>
                              <div className="text-xs text-gray-500 mb-1">Notes</div>
                              <NotesPopover itineraryActivityId={activity.itinerary_activity_id} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-0 bg-bg-0 overflow-hidden flex flex-col">
      <div className="shrink-0 border-b border-stroke-200/70 bg-bg-0 px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px] max-w-[420px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
            <Input
              value={filters.searchText}
              onChange={(event) => setFilters((prev) => ({ ...prev, searchText: event.target.value }))}
              placeholder="Search activities..."
              className="h-9 pl-9 pr-9"
            />
            {filters.searchText.trim() ? (
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, searchText: "" }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-500 hover:bg-bg-50 hover:text-ink-900"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 gap-2 rounded-xl px-3 text-ink-900 hover:bg-bg-50",
                  filters.categories.length > 0 && "border-brand-500/40 bg-brand-500/5"
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Categories
                {filters.categories.length > 0 ? (
                  <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                    {filters.categories.length}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-3">
              <div className="flex items-center justify-between pb-2">
                <div className="text-sm font-medium text-ink-900">Categories</div>
                {filters.categories.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-ink-500 hover:bg-bg-50 hover:text-ink-900"
                    onClick={() => setFilters((prev) => ({ ...prev, categories: [] }))}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
              <div className="space-y-1">
                {TABLE_FILTER_CATEGORIES.map((category) => {
                  const theme = getActivityThemeForTypes(
                    CATEGORY_SAMPLE_TYPES[category],
                    category,
                    activityCategoryAccents,
                    activityCategoryCustomColors
                  );
                  const dotClass = theme.customHex ? "bg-transparent" : ACTIVITY_ACCENT_DOT_CLASSES[theme.accent];
                  const dotStyle = theme.customHex ? { backgroundColor: theme.customHex } : undefined;

                  return (
                    <button
                      key={category}
                      type="button"
                      className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-bg-50"
                      onClick={() => toggleCategory(category)}
                    >
                      <Checkbox
                        checked={filters.categories.includes(category)}
                        onCheckedChange={() => toggleCategory(category)}
                        onClick={(event) => event.stopPropagation()}
                      />
                      <span className={cn("h-2 w-2 rounded-full", dotClass)} style={dotStyle} />
                      <span className="text-sm text-ink-900">{ACTIVITY_CATEGORY_LABELS[category]}</span>
                      <span className="ml-auto text-xs text-ink-500">{categoryCounts[category]}</span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          <div className="flex items-center rounded-xl border border-stroke-200/70 bg-bg-0 p-1">
            {([
              { id: "all", label: "All" },
              { id: "scheduled", label: "Scheduled" },
              { id: "unscheduled", label: "Unscheduled" },
            ] as const).map((option) => {
              const isActive = filters.schedule === option.id;
              return (
                <Button
                  key={option.id}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters((prev) => ({ ...prev, schedule: option.id }))}
                  className={cn(
                    "h-7 rounded-lg px-2 text-xs font-medium transition-colors",
                    "bg-transparent hover:bg-bg-50 active:translate-y-0",
                    isActive
                      ? "bg-bg-100 text-ink-900 shadow-sm hover:bg-bg-100"
                      : "text-ink-500 hover:text-ink-900"
                  )}
                >
                  {option.label}
                </Button>
              );
            })}
          </div>

          {(filters.searchText.trim() || filters.categories.length > 0 || filters.schedule !== "all") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 rounded-xl px-3 text-ink-500 hover:bg-bg-50 hover:text-ink-900"
              onClick={clearAllFilters}
            >
              Clear all
            </Button>
          )}

          <span className="ml-auto text-sm text-ink-500">
            {filteredItemsCount === totalItemsCount
              ? `${totalItemsCount} items`
              : `${filteredItemsCount} of ${totalItemsCount} items`}
          </span>
        </div>
      </div>

      <Table className="relative" containerClassName="flex-1 min-h-0">
        <TableHeader className="sticky top-0 z-30 bg-bg-0/90 backdrop-blur-sm">
          <TableRow className="flex w-full text-md bg-bg-0/90">
            <TableHead className="sticky top-0 z-30 flex items-center w-[20%] min-w-[200px] bg-bg-0/90 text-black backdrop-blur-sm">Activity Name</TableHead>
            <TableHead className="sticky top-0 z-30 flex items-center w-[200px] min-w-[200px] shrink-0 bg-bg-0/90 text-black backdrop-blur-sm">Type</TableHead>
            <TableHead className="sticky top-0 z-30 flex items-center w-[20%] min-w-[200px] bg-bg-0/90 text-black backdrop-blur-sm">Address</TableHead>
            <TableHead className="sticky top-0 z-30 flex items-center w-[15%] min-w-[150px] bg-bg-0/90 text-black backdrop-blur-sm">Date</TableHead>
            <TableHead className="sticky top-0 z-30 flex items-center w-[15%] min-w-[150px] bg-bg-0/90 text-black backdrop-blur-sm">Time</TableHead>
            <TableHead className="sticky top-0 z-30 flex items-center w-[20%] min-w-[200px] bg-bg-0/90 text-black backdrop-blur-sm">Notes</TableHead>
            <TableHead className="sticky top-0 z-30 flex items-center w-[5%] min-w-[50px] bg-bg-0/90 text-black backdrop-blur-sm"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedItems.length === 0 ? (
            <TableRow className="flex w-full">
              <TableCell colSpan={7} className="w-full py-12 text-center text-sm text-ink-500">
                No items match your filters.
              </TableCell>
            </TableRow>
          ) : (
            groupedItems
              .map(([date, items]) => [
                <ItineraryTableDateHeader key={`header-${date}`} date={date} formatDate={formatDate} />,
                ...items.map((item) =>
                  item.kind === "custom-event" ? (
                    <ItineraryCustomEventRow
                      key={`custom-${item.data.itinerary_custom_event_id}`}
                      event={item.data}
                      onRemove={handleRemoveCustomEvent}
                    />
                  ) : (
                    <ItineraryTableRow
                      key={item.data.itinerary_activity_id}
                      activity={item.data}
                      onRemoveActivity={handleRemoveActivity}
                      startDate={startDate || undefined}
                      endDate={endDate || undefined}
                      showMap={showMap}
                      onToggleMap={onToggleMap}
                    />
                  )
                ),
              ])
              .flat()
          )}
        </TableBody>
      </Table>
    </div>
  );
}
