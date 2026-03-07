"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { Card, Badge, Button, Input } from "@/components/ui";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp, Mail, MessageSquare, Bell } from "lucide-react";
import Link from "next/link";

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
const CHANNEL_OPTIONS = ["", "email", "slack", "inapp"];

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  email: Mail,
  slack: MessageSquare,
  inapp: Bell,
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-text-muted text-xs">--</span>;
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
    <div className="flex gap-1.5">
      {channels.map((ch, i) => {
        const Icon = CHANNEL_ICONS[ch.channel] || Bell;
        const color =
          ch.status === "delivered" || ch.status === "completed"
            ? "text-[#22c55e]"
            : ch.status === "failed"
              ? "text-[#ef4444]"
              : "text-[#f59e0b]";
        return (
          <span
            key={i}
            title={`${ch.channel}: ${ch.status}${ch.error_reason ? ` — ${ch.error_reason}` : ""}`}
            className={`inline-flex items-center gap-1 rounded-md bg-white/[0.03] px-1.5 py-0.5 text-xs ${color}`}
          >
            <Icon className="w-3 h-3" strokeWidth={1.5} />
            <span className="font-mono">{ch.channel}</span>
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary mb-1">Activity</h1>
        <p className="text-text-muted text-sm max-w-xl">
          Notification delivery history across all channels.
        </p>
      </div>

      {/* Filters */}
      <Card title="Filters">
        <div className="flex flex-wrap gap-3 items-end p-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-muted">Status</label>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="bg-surface border border-bright rounded-[6px] text-sm text-text-primary cursor-pointer outline-none px-2 py-1.5 min-w-[120px] font-mono"
            >
              <option value="">All</option>
              {STATUS_OPTIONS.filter(Boolean).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-muted">Channel</label>
            <select
              value={channel}
              onChange={(e) => { setChannel(e.target.value); setPage(1); }}
              className="bg-surface border border-bright rounded-[6px] text-sm text-text-primary cursor-pointer outline-none px-2 py-1.5 min-w-[120px] font-mono"
            >
              <option value="">All</option>
              {CHANNEL_OPTIONS.filter(Boolean).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-muted">Event</label>
            <Input
              value={eventName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEventName(e.target.value)}
              placeholder="user.signup"
              className="text-sm min-w-[150px]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-muted">Subscriber</label>
            <Input
              value={subscriber}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubscriber(e.target.value)}
              placeholder="ID or name"
              className="text-sm min-w-[140px]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-muted">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="bg-surface border border-bright rounded-[6px] text-sm text-text-primary px-2 py-1.5 outline-none font-mono"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-text-muted">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="bg-surface border border-bright rounded-[6px] text-sm text-text-primary px-2 py-1.5 outline-none font-mono"
            />
          </div>

          {hasFilters && (
            <Button variant="danger" onClick={clearFilters} className="text-xs px-3 py-1.5">
              <X className="w-3 h-3 inline mr-1" />
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Results */}
      <Card title={`Activity (${total.toLocaleString()} total)`}>
        {loading ? (
          <div className="py-12 text-center text-text-muted flex flex-col items-center">
            <div className="w-8 h-8 rounded-full border-2 border-text-muted border-t-accent animate-spin mb-4" />
            <p className="text-sm animate-pulse">Loading activity...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-text-muted text-sm">
            No activity found. Trigger an event to see notifications here.
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface border-b border-default">
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary w-8" />
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Timestamp</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Event</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Subscriber</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Workflow</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Channels</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const isExpanded = expandedId === item.execution_id;
                    return (
                      <Fragment key={item.execution_id}>
                        <tr
                          onClick={() => setExpandedId(isExpanded ? null : item.execution_id)}
                          className={`
                            cursor-pointer border-b border-default transition-colors
                            ${isExpanded ? "bg-elevated" : "hover:bg-elevated"}
                          `}
                        >
                          <td className="px-3 py-2 text-text-muted">
                            {isExpanded
                              ? <ChevronUp className="w-3.5 h-3.5" strokeWidth={1.5} />
                              : <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />}
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-mono text-xs text-text-secondary">
                              {formatTimestamp(item.created_at)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-mono text-xs text-accent">
                              {item.event_name || "--"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-xs text-text-secondary">
                              {item.subscriber_name || item.subscriber_external_id || "--"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-xs text-text-secondary">
                              {item.workflow_name || "--"}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <ChannelBadges channels={item.channels} />
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge status={item.execution_status} />
                          </td>
                        </tr>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <tr className="bg-elevated/50 border-b border-default">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Channel timeline */}
                                <div>
                                  <h4 className="text-xs font-medium text-text-muted mb-2">Channel delivery</h4>
                                  <div className="space-y-2">
                                    {item.channels.map((ch, i) => {
                                      const Icon = CHANNEL_ICONS[ch.channel] || Bell;
                                      return (
                                        <div
                                          key={i}
                                          className="flex items-start gap-3 bg-surface border border-default rounded-md px-3 py-2"
                                        >
                                          <Icon className="w-4 h-4 text-text-muted mt-0.5 shrink-0" strokeWidth={1.5} />
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                              <span className="text-xs font-medium text-text-primary capitalize">
                                                {ch.channel === "inapp" ? "In-App" : ch.channel}
                                              </span>
                                              <StatusBadge status={ch.status} />
                                            </div>
                                            {ch.error_reason && (
                                              <p className="text-xs text-[#ef4444] mt-1 font-mono break-all">
                                                {ch.error_reason}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Subscriber link */}
                                  {item.subscriber_external_id && (
                                    <div className="mt-3">
                                      <h4 className="text-xs font-medium text-text-muted mb-1">Subscriber</h4>
                                      <div className="text-xs text-text-secondary">
                                        <span className="font-mono">{item.subscriber_external_id}</span>
                                        {item.subscriber_name && (
                                          <span className="text-text-muted ml-1">({item.subscriber_name})</span>
                                        )}
                                        <Link
                                          href={`/subscribers/${item.subscriber_external_id}`}
                                          className="ml-2 text-accent hover:underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          View
                                        </Link>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Event payload */}
                                <div>
                                  <h4 className="text-xs font-medium text-text-muted mb-2">Event payload</h4>
                                  <pre className="bg-surface border border-default rounded-md p-3 text-xs font-mono overflow-auto max-h-48 whitespace-pre-wrap text-text-secondary">
                                    {item.event_payload
                                      ? JSON.stringify(item.event_payload, null, 2)
                                      : "No payload"}
                                  </pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-default mt-0">
                <span className="font-mono text-xs text-text-muted">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-1">
                  <Button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="text-xs px-2 py-1"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </Button>
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
                      <Button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        variant={pageNum === page ? "primary" : "default"}
                        className="text-xs px-2 py-1 min-w-[28px]"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  <Button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="text-xs px-2 py-1"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
