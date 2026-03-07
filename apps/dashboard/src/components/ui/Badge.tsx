import { ReactNode } from "react";

type BadgeVariant =
  | "success"
  | "warning"
  | "danger"
  | "neutral"
  // backward compat aliases
  | "hot"
  | "new"
  | "default";

interface BadgeProps {
  variant?: BadgeVariant;
  pulse?: boolean;
  children: ReactNode;
  className?: string;
}

const aliasMap: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  hot: "danger",
  new: "neutral",
  default: "neutral",
};

const variantConfig: Record<
  "success" | "warning" | "danger" | "neutral",
  { dot: string; text: string; bg: string }
> = {
  success: {
    dot: "bg-[#22c55e]",
    text: "text-[#22c55e]",
    bg: "bg-[#22c55e]/10",
  },
  warning: {
    dot: "bg-[#f59e0b]",
    text: "text-[#f59e0b]",
    bg: "bg-[#f59e0b]/10",
  },
  danger: {
    dot: "bg-[#ef4444]",
    text: "text-[#ef4444]",
    bg: "bg-[#ef4444]/10",
  },
  neutral: {
    dot: "bg-[#71717a]",
    text: "text-[#a1a1aa]",
    bg: "bg-[#71717a]/10",
  },
};

export default function Badge({
  variant = "neutral",
  children,
  className = "",
}: BadgeProps) {
  const resolved = aliasMap[variant] ?? (variant as "success" | "warning" | "danger" | "neutral");
  const config = variantConfig[resolved];

  return (
    <span
      className={`
        inline-flex items-center gap-1.5
        rounded-full px-2.5 py-0.5
        text-xs font-medium
        ${config.bg} ${config.text}
        ${className}
      `}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {children}
    </span>
  );
}
