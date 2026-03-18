"use client";
import { Handle, Position } from "reactflow";
import { Clock } from "lucide-react";

export default function DelayNode({ data }: { data: any }) {
  const duration = data.duration_seconds || 60;
  const label =
    duration >= 3600
      ? `${Math.round(duration / 3600)}h`
      : duration >= 60
        ? `${Math.round(duration / 60)}m`
        : `${duration}s`;

  return (
    <div style={{
      minWidth: 160,
      background: "var(--color-elevated)",
      border: "1px solid var(--color-border)",
      borderRadius: 6,
      overflow: "hidden",
    }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ display: "flex" }}>
        <div style={{ width: 4, background: "var(--color-warning)", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <Clock style={{ width: 16, height: 16, color: "var(--color-warning)", flexShrink: 0 }} strokeWidth={2} />
            <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-text-primary)" }}>Delay</span>
            <span className="alrt-dot alrt-dot-success" style={{ marginLeft: "auto" }} />
          </div>
          <div style={{
            padding: "0 12px 8px",
            fontSize: "0.875rem",
            fontFamily: "monospace",
            fontWeight: 600,
            color: "var(--color-text-primary)",
            textAlign: "center",
          }}>
            {label}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
