"use client";

import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

type BuilderView = "calendar" | "table" | "list";

function CalendarSkeleton() {
  return (
    <div className="h-full w-full flex flex-col">
      <div className="shrink-0 border-b border-stroke-200/60 dark:border-white/10 p-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-36" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 grid grid-cols-[96px_1fr]">
        <div className="border-r border-stroke-200/60 dark:border-white/10 p-3 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-20" />
          ))}
        </div>
        <div className="p-3 space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="h-full w-full p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="h-full w-full p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-8 w-40 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, day) => (
          <div key={day} className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BuilderViewSkeleton({ view }: { view: BuilderView }) {
  if (view === "calendar") return <CalendarSkeleton />;
  if (view === "list") return <ListSkeleton />;
  return <TableSkeleton />;
}

