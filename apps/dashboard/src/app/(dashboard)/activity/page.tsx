"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Badge } from "@/components/ui";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight, X, Mail, MessageSquare, Bell } from "lucide-react";
import { SiWhatsapp, SiDiscord, SiTelegram } from "@icons-pack/react-simple-icons";

interface ChannelStatus {
  channel: string;
  status: string;
  error_reason: string | null;
}

interface ActivityItem {
  execution_id: string;
  created_at: string;
  event_name: string | null;
  workflow_name: string | null;
  execution_status: string | null;
  event_payload: Record<string, unknown> | null;
  subscriber_name: string | null;
  subscriber_external_id: string | null;
  channels: ChannelStatus[];
  has_failure: boolean;
}

interface ActivityResponse {
  items: ActivityItem[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const STATUS_OPTIONS = ["", "running", "completed", "failed", "scheduled"];
const CHANNEL_OPTIONS = ["", "in_app", "email", "slack", "whatsapp", "discord", "telegram"];

const CHANNEL_DISPLAY: Record<string, string> = {
  in_app: "In-App",
  email: "Email",
  slack: "Slack",
  whatsapp: "WhatsApp",
  discord: "Discord",
  telegram: "Telegram",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CHANNEL_ICONS: Record<string, any> = {
  email: Mail,
  slack: MessageSquare,
  in_app: Bell,
  whatsapp: SiWhatsapp,
  discord: SiDiscord,
  telegram: SiTelegram,
};

const SIMPLE_ICONS = new Set(["whatsapp", "discord", "telegram"]);

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span style={{ color: "var(--color-text-muted)", fontSize: "0.75rem" }}>--</span>;
  const variant =
    status === "completed" || status === "delivered"
      ? "success"
      : status === "failed" || status === "dead_letter"
        ? "danger"
        : status === "running" || status === "pending"
          ? "warning"
          : "neutral";
  return <Badge variant={variant}>{status}</Badge>;
}

function ChannelBadges({ channels }: { channels: ChannelStatus[] }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {channels.map((ch, i) => {
        const Icon = CHANNEL_ICONS[ch.channel] || Bell;
        const isSimple = SIMPLE_ICONS.has(ch.channel);
        const color =
          ch.status === "delivered" || ch.status === "completed"
            ? "var(--color-success)"
            : ch.status === "failed"
              ? "var(--color-danger)"
              : "var(--color-warning)";
        const displayName = CHANNEL_DISPLAY[ch.channel] || ch.channel;
        return (
          <span
            key={i}
            title={`${displayName}: ${ch.status}${ch.error_reason ? ` -- ${ch.error_reason}` : ""}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              borderRadius: 6,
              background: "rgba(255,255,255,0.03)",
              padding: "2px 6px",
              fontSize: "0.75rem",
              color,
            }}
          >
            {isSimple ? (
              <Icon size={12} />
            ) : (
              <Icon style={{ width: 12, height: 12 }} strokeWidth={1.5} />
            )}
            <span style={{ fontFamily: "monospace" }}>{displayName}</span>
          </span>
        );
      })}
    </div>
  );
}

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [loading, setLoading] = useState(true);

  // Track new row IDs for slide-in animation
  const prevIds = useRef<Set<string>>(new Set());
  const newIds = useRef<Set<string>>(new Set());

  // Filters
  const [status, setStatus] = useState("");
  const [channel, setChannel] = useState("");
  const [eventName, setEventName] = useState("");
  const [subscriber, setSubscriber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: perPage };
      if (status) params.status = status;
      if (channel) params.channel = channel;
      if (eventName) params.event_name = eventName;
      if (subscriber) params.subscriber = subscriber;
      if (startDate) params.start_date = new Date(startDate).toISOString();
      if (endDate) params.end_date = new Date(endDate).toISOString();

      const res = (await api.activity.list(params)) as ActivityResponse;
      setItems(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (error) {
      console.error("Failed to load activity", error);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, status, channel, eventName, subscriber, startDate, endDate]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  // Update prevIds whenever items change from initial fetch
  useEffect(() => {
    prevIds.current = new Set(items.map((i) => i.execution_id));
  }, [items]);

  // 5-second polling on page 1 (silent, no loading spinner)
  useEffect(() => {
    if (page !== 1) return;
    const interval = setInterval(async () => {
      if (loading) return;
      try {
        const params: Record<string, string | number> = { page: 1, per_page: perPage };
        if (status) params.status = status;
        if (channel) params.channel = channel;
        if (eventName) params.event_name = eventName;
        if (subscriber) params.subscriber = subscriber;
        if (startDate) params.start_date = new Date(startDate).toISOString();
        if (endDate) params.end_date = new Date(endDate).toISOString();

        const res = (await api.activity.list(params)) as ActivityResponse;
        if (res.items.length > 0 && items.length > 0 && res.items[0].execution_id !== items[0].execution_id) {
          // Detect new rows for animation
          const incoming = new Set(res.items.map((i) => i.execution_id));
          const fresh = new Set<string>();
          incoming.forEach((id) => {
            if (!prevIds.current.has(id)) fresh.add(id);
          });
          newIds.current = fresh;
          setItems(res.items);
          setTotal(res.total);
          setTotalPages(res.total_pages);
          // Clear animation markers after 2 seconds
          setTimeout(() => {
            newIds.current = new Set();
          }, 2000);
        }
      } catch {
        // Silent failure on poll
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [page, perPage, status, channel, eventName, subscriber, startDate, endDate, items, loading]);

  const clearFilters = () => {
    setStatus("");
    setChannel("");
    setEventName("");
    setSubscriber("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const hasFilters = status || channel || eventName || subscriber || startDate || endDate;

  return (
    <div style={{ maxWidth: 1152, margin: "0 auto" }} className="vstack">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      ` }} />
      <div>
        <h1 className="alrt-page-title">Activity</h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", maxWidth: 560 }}>
          Notification delivery history across all channels.
        </p>
      </div>

      {/* Filters */}
      <article className="card">
        <header><h3>Filters</h3></header>
        <div className="alrt-filters">
          <label data-field>
            <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-text-muted)" }}>Status</span>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              <option value="">All</option>
              {STATUS_OPTIONS.filter(Boolean).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label data-field>
            <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-text-muted)" }}>Channel</span>
            <select
              value={channel}
              onChange={(e) => { setChannel(e.target.value); setPage(1); }}
            >
              <option value="">All</option>
              {CHANNEL_OPTIONS.filter(Boolean).map((c) => (
                <option key={c} value={c}>{CHANNEL_DISPLAY[c] || c}</option>
              ))}
            </select>
          </label>

          <label data-field>
            <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-text-muted)" }}>Event</span>
            <input
              value={eventName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEventName(e.target.value)}
              placeholder="user.signup"
            />
          </label>

          <label data-field>
            <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-text-muted)" }}>Subscriber</span>
            <input
              value={subscriber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubscriber(e.target.value)}
              placeholder="ID or name"
            />
          </label>

          <label data-field>
            <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-text-muted)" }}>From</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            />
          </label>

          <label data-field>
            <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-text-muted)" }}>To</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            />
          </label>

          {hasFilters && (
            <button data-variant="danger" className="small" onClick={clearFilters}>
              <X style={{ width: 12, height: 12, display: "inline", marginRight: 4 }} />
              Clear
            </button>
          )}
        </div>
      </article>

      {/* Results */}
      <article className="card">
        <header><h3>Activity ({total.toLocaleString()} total)</h3></header>
        {loading ? (
          <div style={{ padding: "3rem 0", textAlign: "center" }}>
            <div aria-busy="true" data-spinner="large"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="alrt-empty" style={{ padding: "3rem 0" }}>
            No activity found. Trigger an event to see notifications here.
          </div>
        ) : (
          <>
            <div className="table">
              <table>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Event</th>
                    <th>Subscriber</th>
                    <th>Workflow</th>
                    <th>Channels</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.execution_id}
                      style={newIds.current.has(item.execution_id) ? { animation: "slideIn 0.3s ease-out" } : undefined}
                    >
                      <td>
                        <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                          {formatTimestamp(item.created_at)}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--color-accent)" }}>
                          {item.event_name || "--"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                          {item.subscriber_name || item.subscriber_external_id || "--"}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                          {item.workflow_name || "--"}
                        </span>
                      </td>
                      <td>
                        <ChannelBadges channels={item.channels} />
                      </td>
                      <td>
                        <StatusBadge status={item.execution_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <nav aria-label="Pagination" className="alrt-pagination">
                <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                  Page {page} of {totalPages}
                </span>
                <menu className="buttons" style={{ display: "flex", gap: 4 }}>
                  <li>
                    <button
                      className="outline small"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft style={{ width: 12, height: 12 }} />
                    </button>
                  </li>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <li key={pageNum}>
                        <button
                          onClick={() => setPage(pageNum)}
                          className={pageNum === page ? "small" : "outline small"}
                        >
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}
                  <li>
                    <button
                      className="outline small"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight style={{ width: 12, height: 12 }} />
                    </button>
                  </li>
                </menu>
              </nav>
            )}
          </>
        )}
      </article>
    </div>
  );
}
