interface SkeletonProps {
  className?: string;
  variant?: "line" | "box";
}

export default function Skeleton({
  className = "",
  variant = "line",
}: SkeletonProps) {
  return (
    <div
      role="status"
      className={`skeleton ${variant} ${className}`.trim()}
    />
  );
}
