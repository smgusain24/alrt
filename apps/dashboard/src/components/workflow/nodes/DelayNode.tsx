"use client";
import { Handle, Position } from "reactflow";
import { Clock } from "lucide-react";

export default function DelayNode({ data }: { data: any }) {
  const duration = data.duration_seconds || 60;
  const label = duration >= 3600
    ? `${Math.round(duration / 3600)}h`
    : duration >= 60
    ? `${Math.round(duration / 60)}m`
    : `${duration}s`;

  return (
    <div className={`min-w-[160px] bevel-outset bg-warning text-black ${data.selected ? "ring-2 ring-accent" : ""}`}>
      <Handle type="target" position={Position.Top} className="!bg-black !w-3 !h-3 !border-2 !border-warning" />
      <div className="px-3 py-2 flex items-center gap-2">
        <Clock className="w-4 h-4" strokeWidth={2} />
        <span className="font-heading text-xs uppercase tracking-wide font-bold">Delay</span>
      </div>
      <div className="px-3 py-1.5 text-sm font-mono font-bold border-t border-[#cc9900] text-center">
        {label}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-black !w-3 !h-3 !border-2 !border-warning" />
    </div>
  );
}
