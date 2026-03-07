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
    <div className="min-w-[200px] max-w-[260px] bg-[#18181b] border border-[rgba(255,255,255,0.06)] rounded-md overflow-hidden">
      <Handle type="target" position={Position.Top} />
      <div className="flex">
        <div className="w-1 bg-[#f43f5e] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="px-3 py-2 flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#f43f5e] shrink-0" strokeWidth={2} />
            <span className="text-xs font-medium text-[#fafafa]">Condition</span>
            {rules.length > 1 && (
              <span className="text-[9px] font-mono bg-[#f43f5e]/20 text-[#f43f5e] px-1.5 py-0.5 rounded-sm uppercase">
                {matchMode}
              </span>
            )}
            <span
              className={`ml-auto w-2 h-2 rounded-full shrink-0 ${
                configured ? "bg-[#22c55e]" : "bg-[#f59e0b]"
              }`}
            />
          </div>
          <div className="px-3 pb-2 text-[10px] font-mono text-[#a1a1aa] truncate">
            {summary}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
