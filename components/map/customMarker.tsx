import React from "react";
import { colors, TColor } from "@/lib/colors/colors";

interface ICustomMarker {
  number?: number;
  color?: TColor | string;
  size?: "sm" | "md" | "lg";
  isSelected?: boolean;
}

export default function CustomMarker({ number, color = "Blue", size = "md", isSelected = false }: ICustomMarker) {
  const sizeMap = {
    sm: { width: 28, height: 36, fontSize: "12px", dotSize: 7 },
    md: { width: 32, height: 42, fontSize: "14px", dotSize: 9 },
    lg: { width: 48, height: 60, fontSize: "22px", dotSize: 14 },
  } as const;

  const { width, height, fontSize, dotSize } = sizeMap[size];
  const resolvedColor = typeof color === "string" && color in colors ? colors[color as TColor] : color;

  return (
    <div className="relative inline-flex items-center justify-center">
      {isSelected && (
        <div
          className="absolute animate-ping"
          style={{
            width: width + 8,
            height: height + 8,
            opacity: 0.3,
            backgroundColor: resolvedColor,
            borderRadius: "50%",
            transform: "translateY(-4px)",
          }}
        />
      )}

      <svg
        width={width}
        height={height}
        viewBox="-4 -4 32 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative waypoint-svg"
        style={{
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))",
        }}
      >
        <path
          d="M12 0C5.372 0 0 5.372 0 12c0 7.346 9.09 17.777 11.412 20.19.401.417 1.068.417 1.469 0C15.203 29.777 24 19.346 24 12c0-6.628-5.372-12-12-12z"
          fill="white"
          stroke="white"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        <path
          d="M12 1.5C6.201 1.5 1.5 6.201 1.5 12c0 6.708 8.308 16.24 10.428 18.466.366.38.975.38 1.341 0C15.39 28.24 22.5 18.708 22.5 12c0-5.799-4.701-10.5-10.5-10.5z"
          fill={resolvedColor}
        />
      </svg>

      {number !== undefined ? (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%]">
          <span
            className="font-semibold text-white"
            style={{
              fontSize,
              textShadow: "0 1px 2px rgba(0,0,0,0.2)",
            }}
          >
            {number}
          </span>
        </div>
      ) : (
        <div className={`absolute left-1/2 transform -translate-x-1/2 -translate-y-[50%]`}>
          <div
            className="rounded-full bg-white"
            style={{
              width: dotSize,
              height: dotSize,
              boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
            }}
          />
        </div>
      )}
    </div>
  );
}
