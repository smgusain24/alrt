"use client";
import { Handle, Position } from "reactflow";
import { Bell, Mail, MessageSquare } from "lucide-react";

const CHANNEL_CONFIG: Record<string, { icon: any; bg: string; label: string; borderColor: string }> = {
  in_app: { icon: Bell, bg: "bg-success", label: "In-App", borderColor: "border-[#006600]" },
  email: { icon: Mail, bg: "bg-accent", label: "Email", borderColor: "border-[#000080]" },
  slack: { icon: MessageSquare, bg: "bg-[#1a1a2e]", label: "Slack", borderColor: "border-[#333355]" },
};

export default function ChannelNode({ data }: { data: any }) {
  const channel = data.channel || "in_app";
  const config = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.in_app;
  const Icon = config.icon;

  return (
    <div className={`min-w-[180px] bevel-outset ${config.bg} text-white ${data.selected ? "ring-2 ring-warning" : ""}`}>
      <Handle type="target" position={Position.Top} className="!bg-white !w-3 !h-3 !border-2 !border-muted" />
      <div className="px-3 py-2 flex items-center gap-2">
        <Icon className="w-4 h-4" strokeWidth={2} />
        <span className="font-heading text-xs uppercase tracking-wide font-bold">{config.label}</span>
      </div>
      <div className={`px-3 py-1.5 text-[10px] font-mono border-t ${config.borderColor} opacity-80 truncate`}>
        {data.template?.title || data.template?.subject || "Configure template..."}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-white !w-3 !h-3 !border-2 !border-muted" />
    </div>
  );
}
