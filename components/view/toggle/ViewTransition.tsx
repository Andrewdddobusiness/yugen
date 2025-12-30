"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ViewTransitionProps {
  children: React.ReactNode;
  viewKey: string;
  className?: string;
  loadingComponent?: React.ReactNode;
}

export function ViewTransition({ 
  children, 
  className,
}: ViewTransitionProps) {
  return (
    <div className={cn("h-full w-full", className)}>
      {children}
    </div>
  );
}

export function ViewSlideTransition({ 
  children, 
  className,
  direction = 1 
}: ViewTransitionProps & { direction?: number }) {
  void direction;
  return <div className={cn("h-full w-full", className)}>{children}</div>;
}

export function ViewLoadingState() {
  return (
    <div className="h-full w-full p-4 space-y-3">
      <div className="h-8 w-40 rounded-md bg-bg-100 dark:bg-white/10 animate-pulse" />
      <div className="space-y-2">
        <div className="h-10 w-full rounded-md bg-bg-100 dark:bg-white/10 animate-pulse" />
        <div className="h-10 w-full rounded-md bg-bg-100 dark:bg-white/10 animate-pulse" />
        <div className="h-10 w-full rounded-md bg-bg-100 dark:bg-white/10 animate-pulse" />
      </div>
    </div>
  );
}
