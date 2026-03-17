"use client";
import { Handle, Position } from "reactflow";
import { GitBranch } from "lucide-react";

export default function ConditionNode({ data }: { data: any }) {
  const rules = data.rules || [];
  const matchMode = data.match_mode || "all";

  let summary = "";
  if (rules.length === 0) {
    const field = data.field || "";
    const operator = data.operator || "equals";
    const value = data.value || "";
    summary = field ? `${field} ${operator} ${value}` : "Configure conditions...";
  } else if (rules.length === 1) {
    const r = rules[0];
    summary = r.field
      ? `${r.field} ${r.operator} ${r.value_type === "boolean" ? r.value : JSON.stringify(r.value)}`
      : "Configure conditions...";
  } else {
    const configured = rules.filter((r: any) => r.field);
    summary = `${configured.length} rules (${matchMode.toUpperCase()})`;
  }

  const configured = rules.length > 0 ? rules.some((r: any) => r.field) : !!data.field;

  return (
    <div style={{
      minWidth: 200,
      maxWidth: 260,
      background: "var(--color-elevated)",
      border: "1px solid var(--color-border)",
      borderRadius: 6,
      overflow: "hidden",
    }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ display: "flex" }}>
        <div style={{ width: 4, background: "#f43f5e", flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <GitBranch style={{ width: 16, height: 16, color: "#f43f5e", flexShrink: 0 }} strokeWidth={2} />
            <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-text-primary)" }}>Condition</span>
            {rules.length > 1 && (
              <span style={{
                fontSize: 9,
                fontFamily: "monospace",
                background: "rgba(244,63,94,0.2)",
                color: "#f43f5e",
                padding: "2px 6px",
                borderRadius: 2,
                textTransform: "uppercase",
              }}>
                {matchMode}
              </span>
            )}
            <span
              className={configured ? "alrt-dot alrt-dot-success" : "alrt-dot alrt-dot-warning"}
              style={{ marginLeft: "auto" }}
            />
          </div>
          <div style={{
            padding: "0 12px 8px",
            fontSize: 10,
            fontFamily: "monospace",
            color: "var(--color-text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
            {summary}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
