"use client";

import React from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type BuilderView = "calendar" | "table" | "list";

function ToolbarSkeleton({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="shrink-0 z-40 flex items-center justify-between p-4 border-b bg-bg-0/90 dark:bg-ink-900/90 backdrop-blur-xl shadow-sm">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Skeleton className="h-10 w-[340px] max-w-full rounded-full" />
        <Skeleton className="h-10 w-[220px] max-w-full rounded-full hidden sm:block" />
      </div>
      {isMobile && <Skeleton className="ml-4 h-9 w-20 rounded-md" />}
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div className="h-full w-full bg-bg-50 dark:bg-ink-900">
      <div className="h-full w-full bg-bg-0 dark:bg-ink-900 border border-stroke-200 dark:border-ink-800 rounded-none">
        <div className="h-12 border-b border-stroke-200 dark:border-ink-800 flex items-center px-4">
          <Skeleton className="h-6 w-36" />
        </div>
        <div className="h-[calc(100%-3rem)] grid grid-cols-[96px_1fr]">
          <div className="border-r border-stroke-200 dark:border-ink-800 p-3 space-y-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-7 gap-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-md" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="h-full w-full bg-bg-0 dark:bg-ink-900 border border-stroke-200 dark:border-ink-800">
      <div className="p-4 border-b border-stroke-200 dark:border-ink-800 flex items-center gap-3">
        <Skeleton className="h-8 w-48 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="grid grid-cols-4 gap-3">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="h-full w-full bg-bg-0 dark:bg-ink-900 border border-stroke-200 dark:border-ink-800">
      <div className="p-4 border-b border-stroke-200 dark:border-ink-800 flex items-center gap-3">
        <Skeleton className="h-8 w-40 rounded-md" />
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
      <div className="p-4 space-y-6">
        {Array.from({ length: 3 }).map((_, group) => (
          <div key={group} className="space-y-3">
            <Skeleton className="h-5 w-36" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((__, i) => (
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

function MapPanelSkeleton() {
  return (
    <div className="h-full w-full bg-bg-0 dark:bg-ink-900 border-l border-stroke-200 dark:border-ink-800">
      <div className="p-4 border-b border-stroke-200 dark:border-ink-800 flex items-center justify-between">
        <Skeleton className="h-8 w-56 rounded-full" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
      <div className="p-4 h-[calc(100%-4rem)]">
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    </div>
  );
}

export function BuilderPageSkeleton({
  currentView,
  showMap,
  isMobile,
}: {
  currentView: BuilderView;
  showMap: boolean;
  isMobile: boolean;
}) {
  return (
    <div className="w-full flex flex-col bg-bg-50 dark:bg-ink-900 h-[calc(100svh-56px)] min-h-0">
      <ToolbarSkeleton isMobile={isMobile} />

      <div className="flex-1 min-h-0 w-full">
        <div className={cn("h-full w-full", showMap ? "flex" : "")}>
          <div className={cn("h-full min-h-0", showMap ? "w-[60%] min-w-0" : "w-full")}>
            {currentView === "calendar" ? (
              <CalendarSkeleton />
            ) : currentView === "list" ? (
              <ListSkeleton />
            ) : (
              <TableSkeleton />
            )}
          </div>

          {showMap && <div className="h-full min-h-0 w-[40%] min-w-0"><MapPanelSkeleton /></div>}
        </div>
      </div>
    </div>
  );
}

