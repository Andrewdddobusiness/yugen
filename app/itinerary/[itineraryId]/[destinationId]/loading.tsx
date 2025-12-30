import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex h-screen w-full bg-bg-50">
      {/* Left icon rail (matches itinerary sidebar icon width) */}
      <div className="w-12 shrink-0 border-r border-stroke-200 bg-bg-0/80 backdrop-blur-sm" />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top header skeleton */}
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b border-stroke-200 bg-bg-0/90 backdrop-blur-xl px-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-4 w-40" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </header>

        {/* Page content skeleton */}
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="min-h-0 flex-1 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
