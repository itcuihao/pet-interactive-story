import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelTone = "default" | "soft" | "highlight";

const toneStyles: Record<PanelTone, string> = {
  default: "bg-card",
  soft: "bg-warm-surface",
  highlight: "bg-gradient-to-b from-white/96 to-orange-50/88",
};

export type PanelCardProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "article" | "aside";
  tone?: PanelTone;
  children: ReactNode;
};

export function PanelCard({ as: _as = "section", className = "", tone = "default", children, ...props }: PanelCardProps) {
  return (
    <div
      className={cn(
        "border border-border/50 shadow-[0_18px_50px_rgba(104,75,54,0.12)] backdrop-blur-[22px] rounded-3xl p-5",
        toneStyles[tone],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
