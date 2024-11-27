"use client";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full h-full">
      <main className="flex flex-col flex-1 bg-muted">
        <div className="w-full h-full">{children}</div>
      </main>
    </div>
  );
}
