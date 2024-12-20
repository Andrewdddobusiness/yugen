"use client";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:hidden flex flex-col w-full h-full">
      <main className="flex-1 flex flex-col w-full h-full overflow-hidden bg-muted">
        <div className="w-full h-full">{children}</div>
      </main>
    </div>
  );
}
