"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant =
  | "default"
  | "primary"
  | "danger"
  | "ghost"
  // backward compat aliases
  | "accent"
  | "outline"
  | "success"
  | "warning";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const aliasMap: Record<string, "default" | "primary" | "danger" | "ghost"> = {
  accent: "primary",
  outline: "default",
  success: "primary",
  warning: "default",
};

const variantToOat: Record<"default" | "primary" | "danger" | "ghost", { className?: string; dataVariant?: string }> = {
  default: { className: "outline" },
  primary: {},
  danger: { dataVariant: "danger" },
  ghost: { className: "ghost" },
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", className = "", children, ...props }, ref) => {
    const resolved = aliasMap[variant] ?? (variant as "default" | "primary" | "danger" | "ghost");
    const oat = variantToOat[resolved];

    return (
      <button
        ref={ref}
        className={`${oat.className ?? ""} ${className}`.trim() || undefined}
        data-variant={oat.dataVariant}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
