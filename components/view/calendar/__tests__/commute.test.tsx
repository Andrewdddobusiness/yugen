import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { CommuteBlocks } from "../CommuteBlocks";
import { buildCommuteSegmentKey, formatTimeFromMinutes, parseTimeToMinutes, toCoordinates } from "../commute";
import type { CommuteSegment } from "../commute";

describe("Calendar commute helpers", () => {
  it("converts stored [lng,lat] tuple to {lat,lng}", () => {
    expect(toCoordinates([12.5, -33.9])).toEqual({ lat: -33.9, lng: 12.5 });
  });

  it("parses HH:mm:ss into minutes", () => {
    expect(parseTimeToMinutes("08:30:00")).toBe(8 * 60 + 30);
  });

  it("formats minutes as HH:mm:00", () => {
    expect(formatTimeFromMinutes(8 * 60 + 5)).toBe("08:05:00");
  });
});

describe("CommuteBlocks", () => {
  it("shows a conflict callout when commute exceeds gap", () => {
    const origin = { lat: 41.9, lng: 12.48 };
    const destination = { lat: 41.89, lng: 12.49 };
    const key = buildCommuteSegmentKey({
      fromId: "1",
      toId: "2",
      origin,
      destination,
    });

    const segment: CommuteSegment = {
      key,
      dayIndex: 0,
      from: {
        id: "1",
        name: "Colosseum",
        startTime: "08:00:00",
        endTime: "09:00:00",
        coordinates: [origin.lng, origin.lat],
        travelModeToNext: "driving",
      },
      to: {
        id: "2",
        name: "Roman Forum",
        startTime: "09:00:00",
        endTime: "10:00:00",
        coordinates: [destination.lng, destination.lat],
      },
      preferredMode: "driving",
      origin,
      destination,
      gapMinutes: 0,
    };

    render(
      <CommuteBlocks
        segments={[segment]}
        travelTimesByKey={{
          [key]: {
            driving: { durationSeconds: 30 * 60, durationText: "30 mins", mode: "driving" },
          },
        }}
        loadingByKey={{}}
        gridStartMinutes={0}
        minutesPerSlot={30}
        slotHeightPx={48}
        gridHeightPx={48 * 48}
        includeBuffer={true}
        bufferMinutes={10}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /30 mins/i }));
    expect(screen.getByText("Not enough time between activities")).toBeInTheDocument();
  });
});
