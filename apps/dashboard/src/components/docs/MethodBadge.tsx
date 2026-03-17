type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "WS";

const METHOD_STYLES: Record<Method, React.CSSProperties> = {
  GET: {
    background: "rgba(34,197,94,0.15)",
    color: "#4ade80",
    borderColor: "rgba(34,197,94,0.2)",
  },
  POST: {
    background: "rgba(59,130,246,0.15)",
    color: "#60a5fa",
    borderColor: "rgba(59,130,246,0.2)",
  },
  PATCH: {
    background: "rgba(245,158,11,0.15)",
    color: "#fbbf24",
    borderColor: "rgba(245,158,11,0.2)",
  },
  PUT: {
    background: "rgba(245,158,11,0.15)",
    color: "#fbbf24",
    borderColor: "rgba(245,158,11,0.2)",
  },
  DELETE: {
    background: "rgba(239,68,68,0.15)",
    color: "#f87171",
    borderColor: "rgba(239,68,68,0.2)",
  },
  WS: {
    background: "rgba(168,85,247,0.15)",
    color: "#c084fc",
    borderColor: "rgba(168,85,247,0.2)",
  },
};

interface MethodBadgeProps {
  method: Method;
}

export default function MethodBadge({ method }: MethodBadgeProps) {
  const styles = METHOD_STYLES[method];

  return (
    <span
      className="badge"
      style={{
        ...styles,
        border: `1px solid ${styles.borderColor}`,
        fontFamily: "var(--font-mono)",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.05em",
        padding: "2px 8px",
        borderRadius: "4px",
        display: "inline-block",
      }}
    >
      {method}
    </span>
  );
}
