import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

type ButtonVariant = "ghost" | "primary" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  asChild,
  className = "",
  size = "md",
  variant = "ghost",
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={`ui-button ui-button--${variant} ui-button--${size}${className ? ` ${className}` : ""}`}
      type={asChild ? undefined : type}
      {...props}
    />
  );
}
