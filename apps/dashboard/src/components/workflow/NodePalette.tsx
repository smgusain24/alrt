"use client";
import { Zap, Bell, Mail, MessageSquare, Clock, GitBranch } from "lucide-react";

const NODE_TYPES = [
  { type: "trigger", label: "Trigger", icon: Zap, color: "bg-navy text-white" },
  { type: "channel_inapp", label: "In-App", icon: Bell, color: "bg-success text-white" },
  { type: "channel_email", label: "Email", icon: Mail, color: "bg-accent text-white" },
  { type: "channel_slack", label: "Slack", icon: MessageSquare, color: "bg-[#1a1a2e] text-white" },
  { type: "delay", label: "Delay", icon: Clock, color: "bg-warning text-black" },
  { type: "condition", label: "Condition", icon: GitBranch, color: "bg-danger text-white" },
];

export default function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-48 bevel-outset bg-[#c0c0c0] p-2 space-y-2 overflow-y-auto">
      <h3 className="font-heading text-xs uppercase tracking-wide text-center px-2 py-1 font-bold">
        Nodes
      </h3>
      <div className="hr-groove" />
      {NODE_TYPES.map((node) => (
        <div
          key={node.type}
          draggable
          onDragStart={(e) => onDragStart(e, node.type)}
          className={`bevel-outset ${node.color} px-3 py-2 flex items-center gap-2 cursor-grab active:cursor-grabbing`}
        >
          <node.icon className="w-4 h-4" strokeWidth={2} />
          <span className="font-heading text-xs uppercase tracking-wide font-bold">{node.label}</span>
        </div>
      ))}
    </div>
  );
}
