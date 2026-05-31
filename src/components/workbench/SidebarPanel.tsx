import type { ReactNode } from "react";
import { PanelCard } from "../ui/PanelCard";

export function SidebarPanel({
  title,
  action,
  children,
  hero,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  hero?: boolean;
}) {
  return (
    <PanelCard as="section" className={hero ? "sidebar-panel sidebar-panel--hero" : "sidebar-panel"} tone={hero ? "highlight" : "soft"}>
      {title ? (
        <div className="section-head">
          <h2>{title}</h2>
          {action}
        </div>
      ) : null}
      {children}
    </PanelCard>
  );
}
