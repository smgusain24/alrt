"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Input,
  Badge,
  Table,
  TimezoneSelector,
} from "@/components/ui";
import { User, Mail, MessageSquare, Bell, Save, ArrowLeft, Trash2 } from "lucide-react";
import { api } from "@/lib/api";

interface Subscriber {
  id: string;
  external_id: string;
  name: string;
  email: string;
  slack_user_id?: string;
  channel_preferences: Record<string, any>;
  created_at: string;
}

interface Notification {
  [key: string]: any;
  id: string;
  channel: string;
  title: string;
  status: string;
  read: boolean;
  created_at: string;
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

  // Global channel preferences
  const [prefInApp, setPrefInApp] = useState(true);
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefSlack, setPrefSlack] = useState(false);

  // DND preferences
  const [dndEnabled, setDndEnabled] = useState(false);
  const [dndTimezone, setDndTimezone] = useState("UTC");
  const [dndStart, setDndStart] = useState("22:00");
  const [dndEnd, setDndEnd] = useState("08:00");

  // Frequency preferences
  const [freqEnabled, setFreqEnabled] = useState(false);
  const [freqMaxPerDay, setFreqMaxPerDay] = useState("");

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

      const prefs = sub.channel_preferences || {};
      const globalPrefs = prefs.global || prefs; // Fallback for old flat format

      setPrefInApp(globalPrefs.in_app ?? true);
      setPrefEmail(globalPrefs.email ?? true);
      setPrefSlack(globalPrefs.slack ?? false);

      if (prefs.dnd) {
        setDndEnabled(true);
        setDndTimezone(prefs.dnd.timezone || "UTC");
        setDndStart(prefs.dnd.start || "22:00");
        setDndEnd(prefs.dnd.end || "08:00");
      }

      if (prefs.frequency && prefs.frequency.max_per_day) {
        setFreqEnabled(true);
        setFreqMaxPerDay(String(prefs.frequency.max_per_day));
      }

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
          global: {
            in_app: prefInApp,
            email: prefEmail,
            slack: prefSlack,
          },
          ...(dndEnabled ? {
            dnd: {
              timezone: dndTimezone,
              start: dndStart,
              end: dndEnd,
            }
          } : { dnd: null }),
          ...(freqEnabled && freqMaxPerDay ? {
            frequency: {
              max_per_day: parseInt(freqMaxPerDay, 10),
            }
          } : { frequency: null }),
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
        const channelVariants: Record<string, "success" | "neutral" | "warning"> = {
          in_app: "success",
          email: "neutral",
          slack: "warning",
        };
        return (
          <Badge variant={channelVariants[row.channel] || "neutral"}>
            {row.channel?.replace("_", "-")}
          </Badge>
        );
      },
    },
    {
      key: "title",
      header: "Title",
      render: (row: Notification) => (
        <span style={{ fontWeight: 500, color: "var(--color-text-primary)", fontSize: "0.75rem" }}>{row.title || "\u2014"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: Notification) => {
        const statusVariants: Record<string, "success" | "warning" | "danger" | "neutral"> = {
          sent: "success",
          pending: "warning",
          failed: "danger",
        };
        return (
          <Badge variant={statusVariants[row.status] || "neutral"}>
            {row.status}
          </Badge>
        );
      },
    },
    {
      key: "read",
      header: "Read",
      render: (row: Notification) => (
        <Badge variant={row.read ? "success" : "neutral"}>
          {row.read ? "read" : "unread"}
        </Badge>
      ),
    },
    {
      key: "created_at",
      header: "Timestamp",
      render: (row: Notification) => (
        <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
  ];

  if (loading) {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div aria-busy="true" data-spinner="large"></div>
      </div>
    );
  }

  if (notFound || !subscriber) {
    return (
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div className="alrt-empty">
          <div style={{
            background: "rgba(239,68,68,0.1)",
            borderRadius: "50%",
            width: 64,
            height: 64,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
          }}>
            <User style={{ width: 32, height: 32, color: "var(--color-danger)" }} strokeWidth={1.5} />
          </div>
          <h3>Subscriber not found</h3>
          <p>
            No subscriber found with ID <code style={{ fontFamily: "monospace", background: "var(--color-elevated)", borderRadius: 6, padding: "2px 6px", fontSize: "0.875rem" }}>{id}</code>
          </p>
          <button className="outline" onClick={() => router.push("/subscribers")}>
            <ArrowLeft style={{ width: 16, height: 16, display: "inline", marginRight: 4 }} strokeWidth={1.5} />
            Back to subscribers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", paddingBottom: 48 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <button
          className="ghost"
          onClick={() => router.push("/subscribers")}
        >
          <ArrowLeft style={{ width: 16, height: 16, marginRight: 4 }} strokeWidth={1.5} />
          Back
        </button>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleSave} disabled={saving}>
            <Save style={{ width: 16, height: 16, display: "inline", marginRight: 4 }} strokeWidth={1.5} />
            {saving ? "Saving..." : saveSuccess ? "Saved!" : "Save changes"}
          </button>
          <button data-variant="danger" onClick={handleDelete} disabled={deleting}>
            <Trash2 style={{ width: 16, height: 16, display: "inline", marginRight: 4 }} strokeWidth={1.5} />
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24, alignItems: "start" }}>
        {/* Left Column */}
        <div className="vstack" style={{ gap: 24 }}>
          {/* Profile */}
          <article className="card">
            <header><h3>Subscriber profile</h3></header>
            <div className="vstack">
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                  External ID
                </label>
                <code style={{
                  fontFamily: "monospace",
                  fontSize: "0.875rem",
                  background: "var(--color-elevated)",
                  borderRadius: 6,
                  padding: "6px 8px",
                  display: "block",
                  color: "var(--color-text-primary)",
                }}>
                  {subscriber.external_id}
                </code>
              </div>

              <Input
                id="sub-name"
                label="Name"
                placeholder="Subscriber name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                id="sub-email"
                label="Email"
                type="email"
                placeholder="subscriber@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <Input
                id="sub-slack-id"
                label="Slack User ID"
                placeholder="U04ABC123"
                value={slackUserId}
                onChange={(e) => setSlackUserId(e.target.value)}
              />

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                  Created
                </label>
                <span style={{ fontFamily: "monospace", fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
                  {new Date(subscriber.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          </article>

          {/* DND Hours */}
          <article className="card">
            <header><h3>Do not disturb</h3></header>
            <div className="vstack">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", maxWidth: 200 }}>
                  Delay notifications during specific hours.
                </p>
                <button
                  className={dndEnabled ? "small" : "outline small"}
                  data-variant={dndEnabled ? "danger" : undefined}
                  onClick={() => setDndEnabled(!dndEnabled)}
                >
                  {dndEnabled ? "Disable" : "Enable"}
                </button>
              </div>

              {dndEnabled && (
                <>
                  <hr />
                  <div className="vstack">
                    <div>
                      <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4 }}>
                        Timezone
                      </label>
                      <TimezoneSelector value={dndTimezone} onChange={setDndTimezone} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <Input
                        id="dnd-start"
                        label="Start time"
                        type="time"
                        value={dndStart}
                        onChange={(e) => setDndStart(e.target.value)}
                      />
                      <Input
                        id="dnd-end"
                        label="End time"
                        type="time"
                        value={dndEnd}
                        onChange={(e) => setDndEnd(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          </article>
        </div>

        {/* Right Column */}
        <div className="vstack" style={{ gap: 24 }}>
          {/* Channel Preferences */}
          <article className="card">
            <header><h3>Global channels</h3></header>
            <div className="vstack">
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                Control which channels this subscriber can receive notifications from globally.
              </p>

              <div className="vstack" style={{ gap: 8 }}>
                {[
                  { label: "In-app", icon: Bell, value: prefInApp, toggle: () => setPrefInApp((v) => !v) },
                  { label: "Email", icon: Mail, value: prefEmail, toggle: () => setPrefEmail((v) => !v) },
                  { label: "Slack", icon: MessageSquare, value: prefSlack, toggle: () => setPrefSlack((v) => !v) },
                ].map((ch) => {
                  const Icon = ch.icon;
                  return (
                    <button
                      key={ch.label}
                      type="button"
                      onClick={ch.toggle}
                      className={ch.value ? "outline" : "ghost"}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 16px",
                        width: "100%",
                        justifyContent: "flex-start",
                        borderColor: ch.value ? "var(--color-accent)" : undefined,
                        background: ch.value ? "rgba(59,130,246,0.1)" : undefined,
                      }}
                    >
                      <Icon style={{ width: 16, height: 16 }} strokeWidth={1.5} />
                      {ch.label}
                      {ch.value && (
                        <span className="badge success" style={{ marginLeft: "auto" }}>on</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </article>

          {/* Frequency Cap */}
          <article className="card">
            <header><h3>Frequency cap</h3></header>
            <div className="vstack">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", maxWidth: 200 }}>
                  Limit max notifications per channel per day.
                </p>
                <button
                  className={freqEnabled ? "small" : "outline small"}
                  data-variant={freqEnabled ? "danger" : undefined}
                  onClick={() => setFreqEnabled(!freqEnabled)}
                >
                  {freqEnabled ? "Disable" : "Enable"}
                </button>
              </div>

              {freqEnabled && (
                <>
                  <hr />
                  <div className="vstack">
                    <Input
                      id="freq-max-day"
                      label="Max per day"
                      type="number"
                      min="1"
                      placeholder="e.g. 5"
                      value={freqMaxPerDay}
                      onChange={(e) => setFreqMaxPerDay(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </article>
        </div>
      </div>

      <article className="card">
        <header><h3>Notification history</h3></header>
        {
          notifications.length === 0 ? (
            <div className="alrt-empty" style={{ padding: "2rem 0" }}>
              <div style={{
                background: "var(--color-elevated)",
                borderRadius: "50%",
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 0.75rem",
              }}>
                <Bell style={{ width: 24, height: 24, color: "var(--color-text-muted)" }} strokeWidth={1.5} />
              </div>
              <p>No notifications logged yet</p>
            </div>
          ) : (
            <Table<Notification>
              columns={notificationColumns}
              data={notifications}
            />
          )
        }
      </article>
    </div>
  );
}
