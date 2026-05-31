import type { ReactNode } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";

export function ScrollPanel({
  className = "",
  viewportClassName = "",
  children,
}: {
  className?: string;
  viewportClassName?: string;
  children: ReactNode;
}) {
  return (
    <ScrollArea.Root className={`scroll-panel${className ? ` ${className}` : ""}`}>
      <ScrollArea.Viewport className={`scroll-panel__viewport${viewportClassName ? ` ${viewportClassName}` : ""}`}>
        {children}
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar className="scroll-panel__scrollbar" orientation="vertical">
        <ScrollArea.Thumb className="scroll-panel__thumb" />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner className="scroll-panel__corner" />
    </ScrollArea.Root>
  );
}
