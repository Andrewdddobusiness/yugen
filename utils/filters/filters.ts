export interface FilterConfig {
  [key: string]: {
    condition: (activity: any) => boolean;
  };
}

export const activityTypeFilters: FilterConfig = {
  Food: {
    condition: (activity) => activity.types.some((type: string) => ["restaurant", "cafe", "bar"].includes(type)),
  },
  Historical: {
    condition: (activity) => activity.types.includes("museum") || activity.types.includes("tourist_attraction"),
  },
  Shopping: {
    condition: (activity) => activity.types.includes("shopping_mall") || activity.types.includes("store"),
  },
};

export const activityCostFilters: FilterConfig = {
  Free: {
    condition: (activity) => activity.price_level === "PRICE_LEVEL_FREE" || activity.price_level === null || activity.price_level === undefined,
  },
  Paid: {
    condition: (activity) =>
      activity.price_level === "PRICE_LEVEL_INEXPENSIVE" ||
      activity.price_level === "PRICE_LEVEL_MODERATE" ||
      activity.price_level === "PRICE_LEVEL_EXPENSIVE" ||
      activity.price_level === "PRICE_LEVEL_VERY_EXPENSIVE",
  },
};
