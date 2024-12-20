"use client";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full">
      {/* Desktop layout */}
      <div className="flex flex-col w-full h-full">
        <main className="flex-1 flex flex-col w-full h-full bg-muted">
          <div className="flex-1 h-full overflow-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
