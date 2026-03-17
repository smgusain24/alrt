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
    <div style={{
      width: 64,
      background: "var(--color-surface)",
      borderRight: "1px solid var(--color-border)",
      padding: "12px 0",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
      flexShrink: 0,
    }}>
      <span style={{
        fontSize: 9,
        fontWeight: 500,
        color: "var(--color-text-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: 4,
      }}>
        Nodes
      </span>
      {NODE_TYPES.map((node) => (
        <Tooltip key={node.type} content={node.label} position="right">
          <div
            draggable
            onDragStart={(e) => onDragStart(e, node.type)}
            style={{
              width: 40,
              height: 40,
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              background: "var(--color-elevated)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "grab",
              transition: "border-color 0.15s, background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border-bright)";
              e.currentTarget.style.background = "#1f1f23";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.background = "var(--color-elevated)";
            }}
          >
            {node.isSimple ? (
              <node.icon size={18} style={{ color: node.accent }} />
            ) : (
              <node.icon
                style={{ width: 18, height: 18, color: node.accent }}
                strokeWidth={2}
              />
            )}
          </div>
        </Tooltip>
      ))}
    </div>
  );
}
