import { ReactNode } from "react";

type BadgeVariant = "hot" | "new" | "success" | "warning" | "danger" | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  pulse?: boolean;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  hot: "bg-danger text-white",
  new: "bg-accent text-white",
  success: "bg-success text-white",
  warning: "bg-warning text-black",
  danger: "bg-danger text-white",
  default: "bg-[#c0c0c0] text-black bevel-outset",
};

export default function Badge({
  variant = "default",
  pulse = false,
  children,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-block px-2 py-0.5 text-xs font-heading font-bold uppercase tracking-wide
        ${variantStyles[variant]}
        ${pulse ? "animate-pulse-glow" : ""}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
