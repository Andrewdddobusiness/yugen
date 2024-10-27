import { IActivityWithLocation } from "@/store/activityStore";
import { FilterConfig } from "./filters";

export function filterActivities(activities: IActivityWithLocation[], selectedFilters: string[], filterConfig: FilterConfig) {
  if (selectedFilters.length === 0) return activities;

  return activities.filter((activity) => {
    return selectedFilters.some((filter) => {
      const filterCondition = filterConfig[filter];
      return filterCondition ? filterCondition.condition(activity) : true;
    });
  });
}
