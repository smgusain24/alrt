interface Stat {
  label: string;
  value: string;
}

interface StatsCounterProps {
  stats: Stat[];
  className?: string;
}

export default function StatsCounter({
  stats,
  className = "",
}: StatsCounterProps) {
  return (
    <div
      className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}
    >
      {stats.map((stat, i) => (
        <div
          key={i}
          className="bg-[#111113] border border-[rgba(255,255,255,0.06)] rounded-md p-4"
        >
          <div className="text-2xl font-semibold font-mono text-[#fafafa]">
            {stat.value}
          </div>
          <div className="text-xs text-[#71717a] mt-1">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
