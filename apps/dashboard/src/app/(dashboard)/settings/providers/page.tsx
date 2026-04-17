"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui";
import { Bell, Mail, MessageSquare } from "lucide-react";
import { SiWhatsapp, SiDiscord, SiTelegram } from "@icons-pack/react-simple-icons";
import { api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ProviderRow {
  id: string;
  channel: string;
  provider_type: string;
  is_active: boolean;
  created_at?: string;
}

interface ChannelDef {
  id: string;
  label: string;
  icon: any;
  accent: string;
  isSimple?: boolean;
  setup: "none" | "oauth" | "webhook" | "manual";
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
    setup: "manual",
    subtitle: "Configure Resend or SendGrid credentials via the providers API",
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
    setup: "manual",
    subtitle: "Configure Meta WABA credentials via the providers API",
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
    subtitle: "Configure bot token via the providers API",
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
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [discordWebhook, setDiscordWebhook] = useState("");
  const [discordSaving, setDiscordSaving] = useState(false);

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

  const fetchProviders = useCallback(async () => {
    try {
      const data = await api.providers.list() as ProviderRow[];
      setProviders(data);
    } catch {
      setProviders([]);
    }
  }, []);

  useEffect(() => {
    fetchProviders().finally(() => setLoading(false));
  }, [fetchProviders]);

  const getStatus = (channelId: string): ProviderRow | undefined =>
    providers.find((p) => p.channel === channelId && p.is_active);

  const handleConnectSlack = () => {
    const token = getToken();
    if (!token) {
      setError("Not authenticated");
      return;
    }
    window.location.href = `${API_URL}/channels/slack/connect?token=${encodeURIComponent(token)}`;
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
      await fetchProviders();
    } catch (err: any) {
      setError(err.message || "Failed to save Discord webhook");
    } finally {
      setDiscordSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 className="alrt-page-title">Settings &mdash; Channels</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginTop: 4 }}>
          Configure your notification channels. In-App works out of the box. Other channels require
          provider credentials — configure via the{" "}
          <code style={{ fontSize: "0.75rem" }}>POST /providers</code> API, Slack via OAuth, or
          Discord via webhook URL below.
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
                isActive={!!status}
                Icon={Icon}
                onConnectSlack={handleConnectSlack}
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
  isActive: boolean;
  Icon: any;
  onConnectSlack: () => void;
  discordWebhook: string;
  onDiscordWebhookChange: (val: string) => void;
  onDiscordSave: () => void;
  discordSaving: boolean;
}

function ChannelCard({
  channel,
  isActive,
  Icon,
  onConnectSlack,
  discordWebhook,
  onDiscordWebhookChange,
  onDiscordSave,
  discordSaving,
}: ChannelCardProps) {
  const renderStatusBadge = () => {
    if (channel.setup === "none") {
      return <Badge variant="success">Active</Badge>;
    }
    return isActive
      ? <Badge variant="success">Configured</Badge>
      : <Badge variant="neutral">Not Configured</Badge>;
  };

  const renderAction = () => {
    if (channel.setup === "none") {
      return (
        <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
          No setup required. Use your API key to send in-app notifications.
        </p>
      );
    }

    if (channel.setup === "oauth") {
      return (
        <button className="outline small" style={{ width: "100%" }} onClick={onConnectSlack}>
          <MessageSquare style={{ width: 14, height: 14, display: "inline", marginRight: 6 }} strokeWidth={1.5} />
          {isActive ? "Reconnect Slack" : "Connect Slack"}
        </button>
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
            <span style={{ color: "var(--color-text-secondary)", fontWeight: 500 }}>Setup:</span>{" "}
            Server Settings &rarr; Integrations &rarr; Webhooks &rarr; New Webhook &rarr; Copy URL
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
          <p style={{ fontSize: 10, color: "var(--color-text-secondary)", fontWeight: 500, marginBottom: 6 }}>
            {isActive ? "Provider configured" : "Configure via API:"}
          </p>
          {!isActive && (
            <code style={{ fontSize: 10, color: "var(--color-text-muted)", display: "block", lineHeight: 1.6 }}>
              POST /providers
              <br />
              {`{ "channel": "${channel.id}", "provider_type": "...", "config": {...} }`}
            </code>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <article className="card" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
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

      <hr style={{ margin: 0 }} />

      <div>{renderAction()}</div>
    </article>
  );
}
