"use client";
import { Handle, Position } from "reactflow";
import { Zap } from "lucide-react";

export default function TriggerNode({ data }: { data: any }) {
  const configured = !!data.event_name;

  return (
    <div className="min-w-[180px] bg-[#18181b] border border-[rgba(255,255,255,0.06)] rounded-md overflow-hidden">
      {/* Left accent stripe */}
      <div className="flex">
        <div className="w-1 bg-[#3b82f6] shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="px-3 py-2 flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#3b82f6] shrink-0" strokeWidth={2} />
            <span className="text-xs font-medium text-[#fafafa]">Trigger</span>
            <span
              className={`ml-auto w-2 h-2 rounded-full shrink-0 ${
                configured ? "bg-[#22c55e]" : "bg-[#f59e0b]"
              }`}
            />
          </div>
          <div className="px-3 pb-2 text-xs font-mono text-[#a1a1aa] truncate">
            {data.event_name || "No event set"}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
