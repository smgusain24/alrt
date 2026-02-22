"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  RetroButton,
  WindowCard,
  Badge,
  GrooveDivider,
} from "@/components/retro";
import { Mail, MessageSquare, Trash2, Plug } from "lucide-react";
import { api } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Provider {
  id: string;
  channel: "email" | "slack";
  provider_type: string;
  is_active: boolean;
  created_at: string;
}

const CHANNEL_CONFIG: Record<
  string,
  { label: string; variant: "new" | "default"; icon: typeof Mail }
> = {
  email: { label: "EMAIL", variant: "new", icon: Mail },
  slack: { label: "SLACK", variant: "default", icon: MessageSquare },
};

function getToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )alrt_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function ProvidersPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading providers...</p>}>
      <ProvidersContent />
    </Suspense>
  );
}

function ProvidersContent() {
  const searchParams = useSearchParams();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

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

  const fetchProviders = useCallback(async () => {
    const data: any = await api.providers.list();
    setProviders(data);
  }, []);

  useEffect(() => {
    fetchProviders()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [fetchProviders]);

  const handleDisconnect = async (id: string) => {
    if (!confirm("Disconnect this provider? Notifications using this channel will stop working.")) return;
    try {
      await api.providers.delete(id);
      await fetchProviders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleConnectSlack = () => {
    const token = getToken();
    if (!token) {
      setError("Not authenticated");
      return;
    }
    // Redirect to the API's Slack OAuth endpoint — pass token as query param
    // since the redirect can't use cookies cross-origin
    window.location.href = `${API_URL}/providers/slack/connect?token=${encodeURIComponent(token)}`;
  };

  const hasSlack = providers.some((p) => p.channel === "slack");

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-heading text-2xl uppercase">
          Settings &mdash; Providers
        </h1>
      </div>

      <p className="text-muted text-sm mb-4">
        Connect your email and Slack providers. Credentials are encrypted at rest.
      </p>

      {successMsg && (
        <div className="bevel-inset bg-panel-yellow px-4 py-3 mb-4 text-sm text-success font-bold">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="bevel-inset bg-panel-yellow px-4 py-3 mb-4 text-sm text-danger font-bold">
          {error}
        </div>
      )}

      <GrooveDivider />

      {/* Connect buttons */}
      <div className="flex gap-3 mt-4 mb-6">
        {!hasSlack && (
          <RetroButton variant="default" onClick={handleConnectSlack}>
            <MessageSquare className="w-4 h-4 inline mr-1" strokeWidth={2} />
            Connect Slack
          </RetroButton>
        )}
      </div>

      {loading ? (
        <p className="text-muted">Loading providers...</p>
      ) : providers.length === 0 ? (
        <WindowCard title="No Providers Connected">
          <div className="text-center py-8">
            <div className="bevel-outset bg-navy w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Plug className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <p className="text-foreground">
              Connect Slack above to start sending notifications. Email providers can be added via the API.
            </p>
          </div>
        </WindowCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((provider) => {
            const channelConfig = CHANNEL_CONFIG[provider.channel];
            const ChannelIcon = channelConfig?.icon || Plug;
            const channelLabel = channelConfig?.label || provider.channel.toUpperCase();
            const channelVariant = channelConfig?.variant || "default";

            return (
              <WindowCard key={provider.id} title={provider.provider_type}>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <ChannelIcon className="w-4 h-4 text-muted" strokeWidth={2} />
                    <Badge variant={channelVariant}>{channelLabel}</Badge>
                    <Badge variant="success">CONNECTED</Badge>
                  </div>

                  <p className="text-xs text-muted font-mono">
                    Connected {new Date(provider.created_at).toLocaleDateString()}
                  </p>

                  <RetroButton
                    variant="danger"
                    className="w-full text-xs"
                    onClick={() => handleDisconnect(provider.id)}
                  >
                    <Trash2 className="w-3 h-3 inline mr-1" strokeWidth={2} />
                    Disconnect
                  </RetroButton>
                </div>
              </WindowCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
