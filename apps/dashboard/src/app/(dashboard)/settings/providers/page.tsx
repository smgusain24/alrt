"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Card, Badge, Toggle } from "@/components/ui";
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
    subtitle: "Headless API — always available",
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
    <Suspense fallback={<p className="text-[#71717a] text-sm">Loading channels...</p>}>
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
      // If channels endpoint fails, fall back to empty — page still renders with defaults
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
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#fafafa]">
          Settings &mdash; Channels
        </h1>
        <p className="text-[#71717a] text-sm mt-1">
          Configure your notification channels. In-App and Email are ready to use. Connect Slack, WhatsApp, Discord, and Telegram below.
        </p>
      </div>

      {successMsg && (
        <div className="bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-md px-4 py-3 mb-4 text-sm text-[#22c55e]">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-md px-4 py-3 mb-4 text-sm text-[#ef4444]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHANNELS.map((ch) => (
            <div key={ch.id} className="bg-[#18181b] border border-[rgba(255,255,255,0.06)] rounded-md p-4 h-40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <p className="text-xs text-[#71717a]">
          No setup required. Use your API key to send in-app notifications.
        </p>
      );
    }

    if (channel.setup === "auto") {
      const displayName = status?.display_name;
      return (
        <div className="space-y-2">
          <p className="text-xs text-[#71717a]">
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
          <div className="space-y-2">
            <p className="text-xs text-[#71717a]">Connected to: <span className="text-[#fafafa]">{workspaceName}</span></p>
            <Button variant="default" className="w-full text-xs" onClick={onConnectSlack}>
              Reconnect
            </Button>
          </div>
        );
      }
      return (
        <Button variant="default" className="w-full text-xs" onClick={onConnectSlack}>
          <MessageSquare className="w-3.5 h-3.5 inline mr-1.5" strokeWidth={1.5} />
          Connect Slack
        </Button>
      );
    }

    if (channel.setup === "toggle") {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#71717a]">
              {isActive ? "Enabled" : "Click to activate"}
            </span>
            <Toggle
              checked={isActive}
              onChange={() => onWhatsappToggle(isActive)}
              disabled={whatsappToggling}
            />
          </div>
          {isActive && (
            <p className="text-xs text-[#71717a]">
              Subscribers will receive messages via alrt's WhatsApp Business Account.
            </p>
          )}
        </div>
      );
    }

    if (channel.setup === "webhook") {
      return (
        <div className="space-y-3">
          <div className="bg-[#0a0a0b] border border-[rgba(255,255,255,0.06)] rounded-md p-2.5 text-[10px] text-[#71717a] leading-relaxed">
            <span className="text-[#a1a1aa] font-medium">Setup:</span> Server Settings &rarr; Integrations &rarr; Webhooks &rarr; New Webhook &rarr; Copy URL
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={discordWebhook}
              onChange={(e) => onDiscordWebhookChange(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="flex-1 min-w-0 bg-[#111113] text-[#fafafa] text-xs border border-[rgba(255,255,255,0.12)] rounded-[6px] px-2.5 py-1.5 placeholder:text-[#52525b] focus:outline-none focus:ring-1 focus:ring-[#3b82f6]"
            />
            <Button
              variant="primary"
              className="text-xs shrink-0"
              onClick={onDiscordSave}
              disabled={discordSaving}
            >
              {discordSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      );
    }

    if (channel.setup === "manual") {
      return (
        <div className="bg-[#0a0a0b] border border-[rgba(255,255,255,0.06)] rounded-md p-2.5 space-y-1.5">
          <p className="text-[10px] text-[#a1a1aa] font-medium">Setup instructions:</p>
          <ol className="text-[10px] text-[#71717a] list-decimal list-inside space-y-1 leading-relaxed">
            <li>Add <span className="text-[#fafafa] font-mono">@alrt_bot</span> to your group chat</li>
            <li>Send <span className="text-[#fafafa] font-mono">/start</span> to the bot</li>
            <li>Set <span className="text-[#fafafa] font-mono">telegram_chat_id</span> on each subscriber via the API</li>
          </ol>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-[#18181b] border border-[rgba(255,255,255,0.06)] rounded-md p-4 flex flex-col gap-3 hover:border-[rgba(255,255,255,0.10)] transition-colors duration-150">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${channel.accent}15` }}
          >
            {channel.isSimple ? (
              <Icon size={16} style={{ color: channel.accent }} />
            ) : (
              <Icon className="w-4 h-4" style={{ color: channel.accent }} strokeWidth={1.5} />
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-[#fafafa]">{channel.label}</p>
            <p className="text-[10px] text-[#71717a] leading-tight mt-0.5">{channel.subtitle}</p>
          </div>
        </div>
        <div className="shrink-0">{renderStatusBadge()}</div>
      </div>

      {/* Separator */}
      <div className="border-t border-[rgba(255,255,255,0.06)]" />

      {/* Action area */}
      <div>{renderAction()}</div>
    </div>
  );
}
