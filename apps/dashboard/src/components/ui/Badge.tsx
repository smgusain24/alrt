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

const badgeClassMap: Record<"success" | "warning" | "danger" | "neutral", string> = {
  success: "success",
  warning: "warning",
  danger: "danger",
  neutral: "secondary",
};

export default function Badge({
  variant = "neutral",
  children,
  className = "",
}: BadgeProps) {
  const resolved = aliasMap[variant] ?? (variant as "success" | "warning" | "danger" | "neutral");

  return (
    <span className={`badge ${badgeClassMap[resolved]} ${className}`.trim()}>
      <span className={`alrt-dot alrt-dot-${resolved}`} />
      {children}
    </span>
  );
}
