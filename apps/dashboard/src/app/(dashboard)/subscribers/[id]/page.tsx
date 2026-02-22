"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  RetroButton,
  BeveledInput,
  WindowCard,
  Badge,
  GrooveDivider,
  RetroTable,
} from "@/components/retro";
import { User, Mail, MessageSquare, Bell, Save, ArrowLeft, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

interface Subscriber {
  id: string;
  external_id: string;
  name: string;
  email: string;
  slack_user_id?: string;
  channel_preferences: Record<string, boolean>;
  created_at: string;
}

interface Notification {
  id: string;
  channel: string;
  title: string;
  status: string;
  read: boolean;
  created_at: string;
  [key: string]: unknown;
}

export default function SubscriberDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [subscriber, setSubscriber] = useState<Subscriber | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [slackUserId, setSlackUserId] = useState("");

  // Channel preferences
  const [prefInApp, setPrefInApp] = useState(true);
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefSlack, setPrefSlack] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sub, notifs] = await Promise.all([
        api.subscribers.get(id) as Promise<Subscriber>,
        api.notifications.list(id, "limit=50") as Promise<Notification[]>,
      ]);
      setSubscriber(sub);
      setName(sub.name || "");
      setEmail(sub.email || "");
      setSlackUserId(sub.slack_user_id || "");
      setPrefInApp(sub.channel_preferences?.in_app ?? true);
      setPrefEmail(sub.channel_preferences?.email ?? true);
      setPrefSlack(sub.channel_preferences?.slack ?? false);
      setNotifications(Array.isArray(notifs) ? notifs : []);
    } catch (err: any) {
      if (err.message?.includes("404") || err.message?.includes("not found") || err.message?.includes("Not Found")) {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!subscriber) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.subscribers.update(subscriber.external_id, {
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        slack_user_id: slackUserId.trim() || undefined,
        channel_preferences: {
          in_app: prefInApp,
          email: prefEmail,
          slack: prefSlack,
        },
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      // Could add error handling here
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!subscriber || !confirm("Are you sure you want to delete this subscriber?")) return;
    setDeleting(true);
    try {
      await api.subscribers.delete(subscriber.external_id);
      router.push("/subscribers");
    } catch {
      setDeleting(false);
    }
  };

  const notificationColumns = [
    {
      key: "channel",
      header: "Channel",
      render: (row: Notification) => {
        const channelVariants: Record<string, "success" | "new" | "default"> = {
          in_app: "success",
          email: "new",
          slack: "default",
        };
        return (
          <Badge
            variant={channelVariants[row.channel] || "default"}
            className={row.channel === "slack" ? "bg-navy text-white" : ""}
          >
            {row.channel?.replace("_", "-").toUpperCase()}
          </Badge>
        );
      },
    },
    {
      key: "title",
      header: "Title",
      render: (row: Notification) => (
        <span className="font-bold text-foreground text-xs">{row.title || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: Notification) => {
        const statusVariants: Record<string, "success" | "warning" | "danger" | "default"> = {
          sent: "success",
          pending: "warning",
          failed: "danger",
        };
        return (
          <Badge variant={statusVariants[row.status] || "default"}>
            {row.status?.toUpperCase()}
          </Badge>
        );
      },
    },
    {
      key: "read",
      header: "Read",
      render: (row: Notification) => (
        <Badge variant={row.read ? "success" : "default"}>
          {row.read ? "READ" : "UNREAD"}
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: "Timestamp",
      render: (row: Notification) => (
        <span className="font-mono text-xs text-muted">
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto">
        <p className="text-muted">Loading subscriber...</p>
      </div>
    );
  }

  if (notFound || !subscriber) {
    return (
      <div className="max-w-5xl mx-auto">
        <WindowCard title="SUBSCRIBER NOT FOUND">
          <div className="text-center py-8">
            <div className="bevel-outset bg-danger w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <User className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <p className="text-foreground mb-4">
              No subscriber found with ID <code className="font-mono bg-row-alt px-1.5 py-0.5 bevel-inset">{id}</code>
            </p>
            <RetroButton onClick={() => router.push("/subscribers")}>
              <ArrowLeft className="w-4 h-4 inline mr-1" strokeWidth={2} />
              Back to Subscribers
            </RetroButton>
          </div>
        </WindowCard>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push("/subscribers")}
          className="flex items-center gap-1 text-sm font-heading uppercase text-muted hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          Back to Subscribers
        </button>
        <div className="flex gap-2">
          <RetroButton variant="success" onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 inline mr-1" strokeWidth={2} />
            {saving ? "Saving..." : saveSuccess ? "Saved!" : "Save"}
          </RetroButton>
          <RetroButton variant="danger" onClick={handleDelete} disabled={deleting}>
            <Trash2 className="w-4 h-4 inline mr-1" strokeWidth={2} />
            {deleting ? "Deleting..." : "Delete"}
          </RetroButton>
        </div>
      </div>

      {/* Two-column grid: Profile + Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Profile */}
        <WindowCard title="SUBSCRIBER PROFILE">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1">
                External ID
              </label>
              <code className="font-mono text-sm bg-row-alt px-2 py-1.5 bevel-inset block">
                {subscriber.external_id}
              </code>
            </div>

            <BeveledInput
              id="sub-name"
              label="Name"
              placeholder="Subscriber name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <BeveledInput
              id="sub-email"
              label="Email"
              type="email"
              placeholder="subscriber@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <BeveledInput
              id="sub-slack-id"
              label="Slack User ID"
              placeholder="U04ABC123"
              value={slackUserId}
              onChange={(e) => setSlackUserId(e.target.value)}
            />

            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-muted mb-1">
                Created
              </label>
              <span className="font-mono text-sm text-muted">
                {new Date(subscriber.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </WindowCard>

        {/* Channel Preferences */}
        <WindowCard title="CHANNEL PREFERENCES">
          <div className="space-y-4">
            <p className="text-xs text-muted uppercase font-bold tracking-wide">
              Toggle channels this subscriber can receive
            </p>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setPrefInApp((v) => !v)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase cursor-pointer ${
                  prefInApp
                    ? "bevel-inset bg-white text-success"
                    : "bevel-outset bg-[#c0c0c0] text-muted"
                }`}
              >
                <Bell className="w-4 h-4" strokeWidth={2} />
                In-App
                {prefInApp && (
                  <Badge variant="success" className="ml-auto">ON</Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPrefEmail((v) => !v)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase cursor-pointer ${
                  prefEmail
                    ? "bevel-inset bg-white text-success"
                    : "bevel-outset bg-[#c0c0c0] text-muted"
                }`}
              >
                <Mail className="w-4 h-4" strokeWidth={2} />
                Email
                {prefEmail && (
                  <Badge variant="success" className="ml-auto">ON</Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPrefSlack((v) => !v)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-bold uppercase cursor-pointer ${
                  prefSlack
                    ? "bevel-inset bg-white text-success"
                    : "bevel-outset bg-[#c0c0c0] text-muted"
                }`}
              >
                <MessageSquare className="w-4 h-4" strokeWidth={2} />
                Slack
                {prefSlack && (
                  <Badge variant="success" className="ml-auto">ON</Badge>
                )}
              </button>
            </div>

            <GrooveDivider />

            <p className="text-xs text-muted">
              Changes are applied when you click <strong>Save</strong>.
            </p>
          </div>
        </WindowCard>
      </div>

      {/* Notification History */}
      <WindowCard title="NOTIFICATION HISTORY">
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <div className="bevel-outset bg-navy w-12 h-12 flex items-center justify-center mx-auto mb-3">
              <Bell className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <p className="text-muted text-sm">No notifications yet</p>
          </div>
        ) : (
          <RetroTable<Notification>
            columns={notificationColumns}
            data={notifications}
          />
        )}
      </WindowCard>
    </div>
  );
}
