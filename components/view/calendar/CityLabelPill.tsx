"use client";

import * as React from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { colors } from "@/lib/colors/colors";
import { useItineraryLayoutStore } from "@/store/itineraryLayoutStore";

const CITY_COLOR_PALETTE = [
  colors.Blue,
  colors.Purple,
  colors.Green,
  colors.Yellow,
  colors.Orange,
  colors.Red,
  colors.TangyOrange,
  colors.LightPurple,
  colors.Piink,
] as const;

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace("#", "").trim();
  const value =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(value)) return `rgba(0,0,0,${alpha})`;

  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const hashString = (input: string) => {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return hash >>> 0;
};

const getDefaultCityColor = (city: string) => {
  const key = city.trim().toLowerCase();
  if (!key) return colors.Blue;
  const idx = hashString(key) % CITY_COLOR_PALETTE.length;
  return CITY_COLOR_PALETTE[idx] ?? colors.Blue;
};

const parseTravelCities = (label: string) => {
  const parts = label.split("→").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const fromCity = parts[0];
    const toCity = parts[parts.length - 1];
    return { fromCity, toCity };
  }
  return null;
};

type CityLabelPillProps = {
  label: string;
  className?: string;
  size?: "sm" | "md";
  interactive?: boolean;
};

export function CityLabelPill({
  label,
  className,
  size = "md",
  interactive = true,
}: CityLabelPillProps) {
  const saveViewState = useItineraryLayoutStore((s) => s.saveViewState);
  const cityLabelColors = useItineraryLayoutStore((s) => s.viewStates.calendar.cityLabelColors);

  const travel = React.useMemo(() => parseTravelCities(label), [label]);
  const primaryCity = React.useMemo(() => {
    if (travel?.toCity) return travel.toCity;
    return label.trim();
  }, [label, travel?.toCity]);

  const fromColor = travel?.fromCity
    ? cityLabelColors[travel.fromCity] ?? getDefaultCityColor(travel.fromCity)
    : null;
  const toColor = travel?.toCity
    ? cityLabelColors[travel.toCity] ?? getDefaultCityColor(travel.toCity)
    : null;
  const primaryColor = cityLabelColors[primaryCity] ?? getDefaultCityColor(primaryCity);

  const backgroundStyle = React.useMemo(() => {
    if (fromColor && toColor) {
      return {
        backgroundImage: `linear-gradient(90deg, ${hexToRgba(fromColor, 0.16)} 0%, ${hexToRgba(
          fromColor,
          0.16
        )} 50%, ${hexToRgba(toColor, 0.16)} 50%, ${hexToRgba(toColor, 0.16)} 100%)`,
        borderColor: hexToRgba(toColor, 0.35),
      } as React.CSSProperties;
    }

    return {
      backgroundColor: hexToRgba(primaryColor, 0.14),
      borderColor: hexToRgba(primaryColor, 0.35),
    } as React.CSSProperties;
  }, [fromColor, toColor, primaryColor]);

  const setColor = React.useCallback(
    (city: string, color: string | null) => {
      const key = city.trim();
      if (!key) return;

      const next = { ...(cityLabelColors ?? {}) };
      if (!color) {
        delete next[key];
      } else {
        next[key] = color;
      }

      saveViewState("calendar", { cityLabelColors: next });
    },
    [cityLabelColors, saveViewState]
  );

  const pill = (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 truncate rounded-full border px-2",
        size === "sm" ? "h-5 text-[10px] leading-5" : "h-6 text-xs",
        "text-ink-700 dark:text-ink-100",
        className
      )}
      style={backgroundStyle}
      title={label}
    >
      <span className="inline-flex items-center gap-1 truncate">
        <span
          className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
          style={{ backgroundColor: toColor ?? primaryColor }}
        />
        <span className="truncate">{label}</span>
      </span>
    </span>
  );

  const editableCities = travel ? [travel.fromCity, travel.toCity] : [primaryCity];

  if (!interactive) return pill;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          className="max-w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 rounded-full"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            // Let Popover handle Enter/Space; prevent parent cell activation.
            if (event.key === "Enter" || event.key === " ") event.stopPropagation();
          }}
        >
          {pill}
        </span>
      </PopoverTrigger>
      <PopoverContent align="center" sideOffset={6} className="w-auto p-3">
        <div className="space-y-3">
          {editableCities.map((city) => {
            const current = cityLabelColors[city] ?? null;
            const fallback = getDefaultCityColor(city);
            const selected = current ?? fallback;

            return (
              <div key={city} className="space-y-2">
                <div className="text-xs font-medium text-ink-800">{city}</div>
                <div className="flex items-center gap-2">
                  {CITY_COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={cn(
                        "h-6 w-6 rounded-full border",
                        selected === color && "ring-2 ring-brand-500 ring-offset-2"
                      )}
                      style={{ backgroundColor: color }}
                      onClick={() => setColor(city, color)}
                      aria-label={`Set ${city} color`}
                    />
                  ))}
                  <button
                    type="button"
                    className="ml-2 text-xs text-ink-600 underline underline-offset-2 hover:text-ink-800"
                    onClick={() => setColor(city, null)}
                  >
                    Reset
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
