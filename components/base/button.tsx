import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import React from "react";

type ButtonProps = React.PropsWithChildren<{
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  variant?: keyof typeof variants;
  ref?: React.Ref<HTMLButtonElement>;
  soft?: boolean;
  circle?: boolean;
  square?: boolean;
  active?: boolean;
  disabled?: boolean;
}>;
export function Button(props: ButtonProps) {
  const variant = variants[props.variant] || undefined;
  const size = sizes[props.size] || "btn-sm";
  const soft = props.soft ? "btn-soft" : undefined;
  const circle = props.circle ? "btn-circle" : undefined;
  const square = props.square ? "btn-square" : undefined;
  const active = props.active ? "btn-active" : undefined;
  const disabled = props.disabled ? "btn-disabled" : undefined;

  return (
    <button
      className={cn("btn", variant, size, soft, circle, square, active, disabled, props.className)}
      onClick={props.onClick}
      ref={props.ref}
      type="button"
    >
      {props.children}
    </button>
  );
}

const variants = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  warning: "btn-warning",
  error: "btn-error",
  ghost: "btn-ghost",
  link: "btn-link",
};

const sizes = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
};
