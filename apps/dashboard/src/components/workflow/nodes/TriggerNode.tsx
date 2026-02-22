"use client";
import { Handle, Position } from "reactflow";
import { Zap } from "lucide-react";

export default function TriggerNode({ data }: { data: any }) {
  return (
    <div className={`min-w-[180px] bevel-outset bg-navy text-white ${data.selected ? "ring-2 ring-accent" : ""}`}>
      <div className="px-3 py-2 flex items-center gap-2">
        <Zap className="w-4 h-4" strokeWidth={2} />
        <span className="font-heading text-xs uppercase tracking-wide font-bold">Trigger</span>
      </div>
      <div className="bg-[#000060] px-3 py-2 text-xs font-mono border-t border-[#0000a0]">
        {data.event_name || "event_name"}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-white !w-3 !h-3 !border-2 !border-navy" />
    </div>
  );
}
