import type { HTMLAttributes, ReactNode } from "react";

type PanelTone = "default" | "soft" | "highlight";

export type PanelCardProps = HTMLAttributes<HTMLElement> & {
  as?: "div" | "section" | "article" | "aside";
  tone?: PanelTone;
  children: ReactNode;
};

export function PanelCard({
  as = "section",
  className = "",
  tone = "default",
  children,
  ...props
}: PanelCardProps) {
  const Comp = as;
  return (
    <Comp className={`panel-card panel-card--${tone}${className ? ` ${className}` : ""}`} {...props}>
      {children}
    </Comp>
  );
}
