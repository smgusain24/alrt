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

const variantStyles: Record<"default" | "primary" | "danger" | "ghost", string> = {
  default:
    "border border-[rgba(255,255,255,0.12)] text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]",
  primary: "bg-[#3b82f6] text-white hover:bg-[#3b82f6]/90",
  danger: "bg-[#ef4444] text-white hover:bg-[#ef4444]/90",
  ghost: "text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#18181b]",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", className = "", children, ...props }, ref) => {
    const resolved = aliasMap[variant] ?? (variant as "default" | "primary" | "danger" | "ghost");
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center
          rounded-[6px] text-sm font-medium
          px-3 py-1.5
          transition-colors duration-150
          focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#3b82f6]
          disabled:opacity-50 disabled:cursor-not-allowed
          cursor-pointer
          ${variantStyles[resolved]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
