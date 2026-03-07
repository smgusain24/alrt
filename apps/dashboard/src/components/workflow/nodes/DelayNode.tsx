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
    <div className="min-w-[160px] bg-[#18181b] border border-[rgba(255,255,255,0.06)] rounded-md overflow-hidden">
      <Handle type="target" position={Position.Top} />
      <div className="flex">
        <div className="w-1 bg-[#f59e0b] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="px-3 py-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#f59e0b] shrink-0" strokeWidth={2} />
            <span className="text-xs font-medium text-[#fafafa]">Delay</span>
            <span className="ml-auto w-2 h-2 rounded-full shrink-0 bg-[#22c55e]" />
          </div>
          <div className="px-3 pb-2 text-sm font-mono font-semibold text-[#fafafa] text-center">
            {label}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
