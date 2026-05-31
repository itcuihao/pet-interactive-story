import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AppShell({ sidebar, header, children, sidebarHidden }: { sidebar: ReactNode; header: ReactNode; children: ReactNode; sidebarHidden?: boolean }) {
  return (
    <div className={cn("grid min-h-screen", sidebarHidden ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-[360px_1fr]")}>
      {!sidebarHidden && (
        <aside className="lg:sticky lg:top-0 lg:self-start lg:min-h-screen p-6 lg:px-[18px] lg:pb-7 flex flex-col gap-[18px] border-r border-border bg-gradient-to-b from-[rgba(255,250,244,0.84)] to-[rgba(248,239,230,0.74)] backdrop-blur-[22px]">
          {sidebar}
        </aside>
      )}
      <main className="p-[22px] grid auto-rows-min gap-[18px]">
        {header}
        {children}
      </main>
    </div>
  );
}
