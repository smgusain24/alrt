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
    <div className={`alrt-grid-stats ${className}`.trim()}>
      {stats.map((stat, i) => (
        <div key={i} className="alrt-stat-card">
          <div className="alrt-stat-value">{stat.value}</div>
          <div className="alrt-stat-label">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
