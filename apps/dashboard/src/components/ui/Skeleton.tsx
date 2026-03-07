interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = "h-4 w-full" }: SkeletonProps) {
  return (
    <div
      className={`bg-[#18181b] rounded animate-pulse ${className}`}
      aria-hidden="true"
    />
  );
}
