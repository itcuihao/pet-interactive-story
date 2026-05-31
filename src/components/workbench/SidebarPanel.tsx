import type { ReactNode } from "react";
import { PanelCard } from "@/components/ui/PanelCard";

export function SidebarPanel({ title, action, children, hero }: { title?: string; action?: ReactNode; children: ReactNode; hero?: boolean }) {
  return (
    <PanelCard as="section" className={hero ? "p-6 pb-[22px]" : ""} tone={hero ? "highlight" : "soft"}>
      {title ? (
        <div className="flex justify-between items-start gap-4">
          <h2 className="font-serif text-2xl font-semibold leading-tight">{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </PanelCard>
  );
}
