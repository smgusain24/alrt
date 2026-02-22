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
      className={`bevel-inset bg-navy inline-flex items-center divide-x-2 divide-muted ${className}`}
    >
      {stats.map((stat, i) => (
        <div key={i} className="px-4 py-2 text-center">
          <div className="font-mono text-lg text-[#00ff00] font-bold">
            {stat.value}
          </div>
          <div className="font-mono text-[10px] text-white/80 uppercase tracking-wider">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
