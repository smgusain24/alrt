"use client";
import { Handle, Position } from "reactflow";
import { Bell, Mail, MessageSquare } from "lucide-react";
import { SiWhatsapp, SiDiscord, SiTelegram } from "@icons-pack/react-simple-icons";

const CHANNEL_CONFIG: Record<string, { icon: any; accent: string; label: string }> = {
  in_app:   { icon: Bell,         accent: "#22c55e", label: "In-App" },
  email:    { icon: Mail,         accent: "#a855f7", label: "Email" },
  slack:    { icon: MessageSquare, accent: "#f97316", label: "Slack" },
  whatsapp: { icon: SiWhatsapp,   accent: "#25D366", label: "WhatsApp" },
  discord:  { icon: SiDiscord,    accent: "#5865F2", label: "Discord" },
  telegram: { icon: SiTelegram,   accent: "#26A5E4", label: "Telegram" },
};

const LUCIDE_CHANNELS = new Set(["in_app", "email", "slack"]);

export default function ChannelNode({ data }: { data: any }) {
  const channel = data.channel || "in_app";
  const config = CHANNEL_CONFIG[channel] || CHANNEL_CONFIG.in_app;
  const Icon = config.icon;

  const hasTemplate =
    data.template?.title ||
    data.template?.subject ||
    data.template?.text ||
    data.template?.body_html ||
    data.template?.body;

  const iconProps = LUCIDE_CHANNELS.has(channel)
    ? { className: "w-4 h-4 shrink-0", style: { color: config.accent }, strokeWidth: 2 }
    : { size: 16, style: { color: config.accent } };

  return (
    <div className="min-w-[180px] bg-[#18181b] border border-[rgba(255,255,255,0.06)] rounded-md overflow-hidden">
      <Handle type="target" position={Position.Top} />
      <div className="flex">
        <div className="w-1 shrink-0" style={{ backgroundColor: config.accent }} />
        <div className="flex-1 min-w-0">
          <div className="px-3 py-2 flex items-center gap-2">
            <Icon {...iconProps} />
            <span className="text-xs font-medium text-[#fafafa]">
              {config.label}
            </span>
            <span
              className={`ml-auto w-2 h-2 rounded-full shrink-0 ${
                hasTemplate ? "bg-[#22c55e]" : "bg-[#f59e0b]"
              }`}
            />
          </div>
          <div className="px-3 pb-2 text-xs font-mono text-[#a1a1aa] truncate">
            {data.template?.title ||
              data.template?.subject ||
              data.template?.text ||
              data.template?.body ||
              "Configure template..."}
          </div>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
