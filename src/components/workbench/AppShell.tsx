import type { ReactNode } from "react";

export function AppShell({
  sidebar,
  header,
  children,
}: {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">{sidebar}</aside>
      <main className="workspace">
        {header}
        {children}
      </main>
    </div>
  );
}
