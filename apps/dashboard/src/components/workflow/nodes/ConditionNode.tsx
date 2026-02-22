"use client";
import { Handle, Position } from "reactflow";
import { GitBranch } from "lucide-react";

export default function ConditionNode({ data }: { data: any }) {
  const rules = data.rules || [];
  const matchMode = data.match_mode || "all";

  // Build summary text
  let summary = "";
  if (rules.length === 0) {
    // Legacy single-condition fallback
    const field = data.field || "";
    const operator = data.operator || "equals";
    const value = data.value || "";
    summary = field ? `${field} ${operator} ${value}` : "Configure conditions...";
  } else if (rules.length === 1) {
    const r = rules[0];
    if (r.field) {
      summary = `${r.field} ${r.operator} ${r.value_type === "boolean" ? r.value : JSON.stringify(r.value)}`;
    } else {
      summary = "Configure conditions...";
    }
  } else {
    const configured = rules.filter((r: any) => r.field);
    summary = `${configured.length} rules (${matchMode.toUpperCase()})`;
  }

  return (
    <div className={`min-w-[200px] max-w-[260px] bevel-outset bg-danger text-white ${data.selected ? "ring-2 ring-warning" : ""}`}>
      <Handle type="target" position={Position.Top} className="!bg-white !w-3 !h-3 !border-2 !border-danger" />
      <div className="px-3 py-2 flex items-center gap-2">
        <GitBranch className="w-4 h-4" strokeWidth={2} />
        <span className="font-heading text-xs uppercase tracking-wide font-bold">Condition</span>
        {rules.length > 1 && (
          <span className="text-[9px] font-mono bg-[#800000] px-1 py-0.5 uppercase">
            {matchMode}
          </span>
        )}
      </div>
      <div className="px-3 py-1.5 text-[10px] font-mono border-t border-[#800000] truncate">
        {summary}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-white !w-3 !h-3 !border-2 !border-danger" />
    </div>
  );
}
