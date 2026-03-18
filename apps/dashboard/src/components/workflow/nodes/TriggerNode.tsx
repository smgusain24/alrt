"use client";
import { Handle, Position } from "reactflow";
import { Zap } from "lucide-react";

export default function TriggerNode({ data }: { data: any }) {
  const configured = !!data.event_name;

  return (
    <div style={{
      minWidth: 180,
      background: "var(--color-elevated)",
      border: "1px solid var(--color-border)",
      borderRadius: 6,
      overflow: "hidden",
    }}>
      {/* Left accent stripe */}
      <div style={{ display: "flex" }}>
        <div style={{ width: 4, background: "var(--color-accent)", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <Zap style={{ width: 16, height: 16, color: "var(--color-accent)", flexShrink: 0 }} strokeWidth={2} />
            <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-text-primary)" }}>Trigger</span>
            <span
              className={configured ? "alrt-dot alrt-dot-success" : "alrt-dot alrt-dot-warning"}
              style={{ marginLeft: "auto" }}
            />
          </div>
          <div style={{
            padding: "0 12px 8px",
            fontSize: "0.75rem",
            fontFamily: "monospace",
            color: "var(--color-text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {data.event_name || "No event set"}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
