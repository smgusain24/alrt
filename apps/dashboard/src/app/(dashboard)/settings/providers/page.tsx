"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Toggle } from "@/components/ui";
import { Bell, Mail, MessageSquare } from "lucide-react";
import { SiWhatsapp, SiDiscord, SiTelegram } from "@icons-pack/react-simple-icons";
import { api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ChannelStatus {
  channel: string;
  provider_type: string;
  is_active: boolean;
  workspace_name?: string;
  display_name?: string;
  created_at?: string;
  updated_at?: string;
}

interface ChannelDef {
  id: string;
  label: string;
  icon: any;
  accent: string;
  isSimple?: boolean;
  setup: "none" | "auto" | "oauth" | "toggle" | "webhook" | "manual";
  subtitle: string;
}

const CHANNELS: ChannelDef[] = [
  {
    id: "in_app",
    label: "In-App",
    icon: Bell,
    accent: "#22c55e",
    setup: "none",
    subtitle: "Headless API -- always available",
  },
  {
    id: "email",
    label: "Email",
    icon: Mail,
    accent: "#a855f7",
    setup: "auto",
    subtitle: "Sending via alrt shared account",
  },
  {
    id: "slack",
    label: "Slack",
    icon: MessageSquare,
    accent: "#f97316",
    setup: "oauth",
    subtitle: "Connect your Slack workspace via OAuth",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icon: SiWhatsapp,
    accent: "#25D366",
    isSimple: true,
    setup: "toggle",
    subtitle: "Messages sent via alrt's WhatsApp Business Account",
  },
  {
    id: "discord",
    label: "Discord",
    icon: SiDiscord,
    accent: "#5865F2",
    isSimple: true,
    setup: "webhook",
    subtitle: "Send to a Discord channel via webhook URL",
  },
  {
    id: "telegram",
    label: "Telegram",
    icon: SiTelegram,
    accent: "#26A5E4",
    isSimple: true,
    setup: "manual",
    subtitle: "Set chat_id per-subscriber via the API",
  },
];

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )alrt_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function ProvidersPage() {
  return (
    <Suspense fallback={<div aria-busy="true"></div>}>
      <ProvidersContent />
    </Suspense>
  );
}

function ProvidersContent() {
  const searchParams = useSearchParams();
  const [channelStatuses, setChannelStatuses] = useState<ChannelStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Per-channel action states
  const [discordWebhook, setDiscordWebhook] = useState("");
  const [discordSaving, setDiscordSaving] = useState(false);
  const [whatsappToggling, setWhatsappToggling] = useState(false);

  // Check URL params for OAuth callback results
  useEffect(() => {
    const connected = searchParams.get("connected");
    const oauthError = searchParams.get("error");
    if (connected === "slack") {
      setSuccessMsg("Slack workspace connected successfully!");
    }
    if (oauthError) {
      setError(`Slack connection failed: ${oauthError}`);
    }
  }, [searchParams]);

  const fetchChannels = useCallback(async () => {
    try {
      const data = await api.channels.list();
      setChannelStatuses(data);
    } catch (err: any) {
      // If channels endpoint fails, fall back to empty -- page still renders with defaults
      setChannelStatuses([]);
    }
  }, []);

  useEffect(() => {
    fetchChannels().finally(() => setLoading(false));
  }, [fetchChannels]);

  const getStatus = (channelId: string): ChannelStatus | undefined =>
    channelStatuses.find((s) => s.channel === channelId);

  const handleConnectSlack = () => {
    const token = getToken();
    if (!token) {
      setError("Not authenticated");
      return;
    }
    window.location.href = `${API_URL}/channels/slack/connect?token=${encodeURIComponent(token)}`;
  };

  const handleWhatsappToggle = async (currentlyActive: boolean) => {
    setWhatsappToggling(true);
    setError(null);
    try {
      if (currentlyActive) {
        await api.channels.deactivateWhatsApp();
        setSuccessMsg("WhatsApp deactivated.");
      } else {
        await api.channels.activateWhatsApp();
        setSuccessMsg("WhatsApp activated successfully!");
      }
      await fetchChannels();
    } catch (err: any) {
      setError(err.message || "Failed to toggle WhatsApp");
    } finally {
      setWhatsappToggling(false);
    }
  };

  const handleDiscordSave = async () => {
    if (!discordWebhook.trim()) {
      setError("Please enter a Discord webhook URL.");
      return;
    }
    setDiscordSaving(true);
    setError(null);
    try {
      await api.channels.updateDiscordConfig(discordWebhook.trim());
      setSuccessMsg("Discord webhook saved successfully!");
      setDiscordWebhook("");
      await fetchChannels();
    } catch (err: any) {
      setError(err.message || "Failed to save Discord webhook");
    } finally {
      setDiscordSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="alrt-page-title">
          Settings &mdash; Channels
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginTop: 4 }}>
          Configure your notification channels. In-App and Email are ready to use. Connect Slack, WhatsApp, Discord, and Telegram below.
        </p>
      </div>

      {successMsg && (
        <aside style={{
          background: "rgba(34,197,94,0.1)",
          border: "1px solid rgba(34,197,94,0.2)",
          borderRadius: 6,
          padding: "12px 16px",
          marginBottom: 16,
          fontSize: "0.875rem",
          color: "var(--color-success)",
        }}>
          {successMsg}
        </aside>
      )}

      {error && (
        <aside style={{
          background: "rgba(239,68,68,0.1)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 6,
          padding: "12px 16px",
          marginBottom: 16,
          fontSize: "0.875rem",
          color: "var(--color-danger)",
        }}>
          {error}
        </aside>
      )}

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {CHANNELS.map((ch) => (
            <div key={ch.id} aria-busy="true" style={{
              background: "var(--color-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              padding: 16,
              height: 160,
            }} />
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {CHANNELS.map((channel) => {
            const status = getStatus(channel.id);
            const Icon = channel.icon;

            return (
              <ChannelCard
                key={channel.id}
                channel={channel}
                status={status}
                Icon={Icon}
                onConnectSlack={handleConnectSlack}
                onWhatsappToggle={handleWhatsappToggle}
                whatsappToggling={whatsappToggling}
                discordWebhook={discordWebhook}
                onDiscordWebhookChange={setDiscordWebhook}
                onDiscordSave={handleDiscordSave}
                discordSaving={discordSaving}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

interface ChannelCardProps {
  channel: ChannelDef;
  status: ChannelStatus | undefined;
  Icon: any;
  onConnectSlack: () => void;
  onWhatsappToggle: (isActive: boolean) => void;
  whatsappToggling: boolean;
  discordWebhook: string;
  onDiscordWebhookChange: (val: string) => void;
  onDiscordSave: () => void;
  discordSaving: boolean;
}

function ChannelCard({
  channel,
  status,
  Icon,
  onConnectSlack,
  onWhatsappToggle,
  whatsappToggling,
  discordWebhook,
  onDiscordWebhookChange,
  onDiscordSave,
  discordSaving,
}: ChannelCardProps) {
  const isActive = status?.is_active ?? false;

  const renderStatusBadge = () => {
    if (channel.setup === "none") {
      return <Badge variant="success">Active</Badge>;
    }
    if (channel.setup === "auto") {
      return isActive
        ? <Badge variant="success">Connected</Badge>
        : <Badge variant="neutral">Provisioning</Badge>;
    }
    if (channel.setup === "oauth") {
      return isActive
        ? <Badge variant="success">Connected</Badge>
        : <Badge variant="neutral">Not Connected</Badge>;
    }
    if (channel.setup === "toggle") {
      return isActive
        ? <Badge variant="success">Enabled</Badge>
        : <Badge variant="neutral">Available</Badge>;
    }
    if (channel.setup === "webhook" || channel.setup === "manual") {
      return isActive
        ? <Badge variant="success">Connected</Badge>
        : <Badge variant="neutral">Not Set Up</Badge>;
    }
    return null;
  };

  const renderAction = () => {
    if (channel.setup === "none") {
      return (
        <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
          No setup required. Use your API key to send in-app notifications.
        </p>
      );
    }

    if (channel.setup === "auto") {
      const displayName = status?.display_name;
      return (
        <div>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            {displayName
              ? `Sending as: ${displayName}`
              : "Auto-configured at signup. Ready to use."}
          </p>
        </div>
      );
    }

    if (channel.setup === "oauth") {
      const workspaceName = status?.workspace_name;
      if (isActive && workspaceName) {
        return (
          <div className="vstack" style={{ gap: 8 }}>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Connected to: <span style={{ color: "var(--color-text-primary)" }}>{workspaceName}</span></p>
            <button className="outline small" style={{ width: "100%" }} onClick={onConnectSlack}>
              Reconnect
            </button>
          </div>
        );
      }
      return (
        <button className="outline small" style={{ width: "100%" }} onClick={onConnectSlack}>
          <MessageSquare style={{ width: 14, height: 14, display: "inline", marginRight: 6 }} strokeWidth={1.5} />
          Connect Slack
        </button>
      );
    }

    if (channel.setup === "toggle") {
      return (
        <div className="vstack" style={{ gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
              {isActive ? "Enabled" : "Click to activate"}
            </span>
            <Toggle
              checked={isActive}
              onChange={() => onWhatsappToggle(isActive)}
              disabled={whatsappToggling}
            />
          </div>
          {isActive && (
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
              Subscribers will receive messages via alrt's WhatsApp Business Account.
            </p>
          )}
        </div>
      );
    }

    if (channel.setup === "webhook") {
      return (
        <div className="vstack" style={{ gap: 12 }}>
          <div style={{
            background: "var(--color-background)",
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            padding: 10,
            fontSize: 10,
            color: "var(--color-text-muted)",
            lineHeight: 1.6,
          }}>
            <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>Setup:</span> Server Settings &rarr; Integrations &rarr; Webhooks &rarr; New Webhook &rarr; Copy URL
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={discordWebhook}
              onChange={(e) => onDiscordWebhookChange(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              style={{ flex: 1, minWidth: 0, fontSize: "0.75rem" }}
            />
            <button
              className="small"
              onClick={onDiscordSave}
              disabled={discordSaving}
              style={{ flexShrink: 0 }}
            >
              {discordSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      );
    }

    if (channel.setup === "manual") {
      return (
        <div style={{
          background: "var(--color-background)",
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          padding: 10,
        }}>
          <p style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: 6 }}>Setup instructions:</p>
          <ol style={{ fontSize: 10, color: "var(--color-text-muted)", listStyle: "decimal inside", lineHeight: 1.6 }}>
            <li>Add <span style={{ color: "var(--color-text-primary)", fontFamily: "monospace" }}>@alrt_bot</span> to your group chat</li>
            <li>Send <span style={{ color: "var(--color-text-primary)", fontFamily: "monospace" }}>/start</span> to the bot</li>
            <li>Set <span style={{ color: "var(--color-text-primary)", fontFamily: "monospace" }}>telegram_chat_id</span> on each subscriber via the API</li>
          </ol>
        </div>
      );
    }

    return null;
  };

  return (
    <article className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              backgroundColor: `${channel.accent}15`,
            }}
          >
            {channel.isSimple ? (
              <Icon size={16} style={{ color: channel.accent }} />
            ) : (
              <Icon style={{ width: 16, height: 16, color: channel.accent }} strokeWidth={1.5} />
            )}
          </div>
          <div>
            <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>{channel.label}</p>
            <p style={{ fontSize: 10, color: "var(--color-text-muted)", lineHeight: 1.3, marginTop: 2 }}>{channel.subtitle}</p>
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>{renderStatusBadge()}</div>
      </div>

      {/* Separator */}
      <hr style={{ margin: 0 }} />

      {/* Action area */}
      <div>{renderAction()}</div>
    </article>
  );
}
