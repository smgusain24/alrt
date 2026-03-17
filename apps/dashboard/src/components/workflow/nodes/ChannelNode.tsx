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
    ? { style: { width: 16, height: 16, flexShrink: 0, color: config.accent } as React.CSSProperties, strokeWidth: 2 }
    : { size: 16, style: { color: config.accent } };

  return (
    <div style={{
      minWidth: 180,
      background: "var(--color-elevated)",
      border: "1px solid var(--color-border)",
      borderRadius: 6,
      overflow: "hidden",
    }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ display: "flex" }}>
        <div style={{ width: 4, flexShrink: 0, backgroundColor: config.accent }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon {...iconProps} />
            <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-text-primary)" }}>
              {config.label}
            </span>
            <span
              className={hasTemplate ? "alrt-dot alrt-dot-success" : "alrt-dot alrt-dot-warning"}
              style={{ marginLeft: "auto" }}
            />
          </div>
          <div style={{
            padding: "0 12px 8px",
            fontSize: "0.75rem",
            fontFamily: "monospace",
            color: "var(--color-text-secondary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}>
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
