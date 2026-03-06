"use client";
import { Zap, Bell, Mail, MessageSquare, Clock, GitBranch } from "lucide-react";
import { SiWhatsapp, SiDiscord, SiTelegram } from "@icons-pack/react-simple-icons";
import { Tooltip } from "@/components/ui";

const NODE_TYPES: { type: string; label: string; icon: any; accent: string; isSimple?: boolean }[] = [
  { type: "trigger",           label: "Trigger",   icon: Zap,          accent: "#3b82f6" },
  { type: "channel_inapp",    label: "In-App",    icon: Bell,         accent: "#22c55e" },
  { type: "channel_email",    label: "Email",     icon: Mail,         accent: "#a855f7" },
  { type: "channel_slack",    label: "Slack",     icon: MessageSquare, accent: "#f97316" },
  { type: "channel_whatsapp", label: "WhatsApp",  icon: SiWhatsapp,   accent: "#25D366", isSimple: true },
  { type: "channel_discord",  label: "Discord",   icon: SiDiscord,    accent: "#5865F2", isSimple: true },
  { type: "channel_telegram", label: "Telegram",  icon: SiTelegram,   accent: "#26A5E4", isSimple: true },
  { type: "delay",             label: "Delay",    icon: Clock,        accent: "#f59e0b" },
  { type: "condition",         label: "Condition", icon: GitBranch,   accent: "#f43f5e" },
];

export default function NodePalette() {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-16 bg-[#111113] border-r border-[rgba(255,255,255,0.06)] py-3 flex flex-col items-center gap-1.5 shrink-0">
      <span className="text-[9px] font-medium text-[#71717a] uppercase tracking-wider mb-1">
        Nodes
      </span>
      {NODE_TYPES.map((node) => (
        <Tooltip key={node.type} content={node.label} position="right">
          <div
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
            className="w-10 h-10 rounded-md border border-[rgba(255,255,255,0.06)] bg-[#18181b]
              flex items-center justify-center cursor-grab active:cursor-grabbing
              hover:border-[rgba(255,255,255,0.12)] hover:bg-[#1f1f23] transition-colors duration-150"
          >
            {node.isSimple ? (
              <node.icon size={18} style={{ color: node.accent }} />
            ) : (
              <node.icon
                className="w-4.5 h-4.5"
                style={{ color: node.accent }}
                strokeWidth={2}
              />
            )}
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
