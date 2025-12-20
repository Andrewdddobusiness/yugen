import Image from "next/image";

export default function Loading() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-bg-50">
      <div className="glass rounded-2xl px-7 py-6 text-center max-w-sm w-[92%]">
        <div className="mx-auto relative h-20 w-20">
          <Image
            src="/assets/yugi-mascot-1.png"
            alt="Loading"
            fill
            priority
            sizes="80px"
            className="object-contain animate-pulse"
          />
        </div>
        <div className="mt-4 text-xl font-semibold text-ink-900 font-logo">Loading itinerary…</div>
        <div className="mt-1 text-sm text-ink-500">Bringing your schedule, maps, and details into view.</div>
        <div className="mt-5 h-2 w-full rounded-full bg-stroke-200/70 overflow-hidden">
          <div className="h-full w-1/2 bg-brand-500/60 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
