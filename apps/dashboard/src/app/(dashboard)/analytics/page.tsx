"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

interface OverviewMetrics {
    total_sent: number;
    total_failed: number;
    total_pending: number;
}

interface ChannelMetrics {
    [key: string]: any;
    channel: string;
    sent: number;
    failed: number;
    pending: number;
    success_rate: number;
}

interface TimelinePoint {
    date: string;
    sent: number;
    failed: number;
}

function StatCard({
    label,
    value,
    highlight,
}: {
    label: string;
    value: string | number;
    highlight?: "danger" | "success" | "warning";
}) {
    const colorMap: Record<string, string> = {
        danger: "var(--color-danger)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
    };
    const valueColor = highlight ? colorMap[highlight] : "var(--color-text-primary)";

    return (
        <div className="alrt-stat-card">
            <div className="alrt-stat-value" style={{ color: valueColor }}>
                {typeof value === "number" ? value.toLocaleString() : value}
            </div>
            <div className="alrt-stat-label">
                {label}
            </div>
        </div>
    );
}

const CHANNEL_DISPLAY: Record<string, string> = {
    in_app: "In-App",
    email: "Email",
    slack: "Slack",
    whatsapp: "WhatsApp",
    discord: "Discord",
    telegram: "Telegram",
};

export default function AnalyticsDashboard() {
    const [days, setDays] = useState(7);
    const [overview, setOverview] = useState<OverviewMetrics | null>(null);
    const [channels, setChannels] = useState<ChannelMetrics[]>([]);
    const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAnalytics() {
            setLoading(true);
            try {
                const [overviewRes, channelsRes, timelineRes] = await Promise.all([
                    api.analytics.overview(days) as Promise<{ metrics: OverviewMetrics }>,
                    api.analytics.delivery(days) as Promise<{ channels: ChannelMetrics[] }>,
                    api.analytics.timeline(days) as Promise<{ timeline: TimelinePoint[] }>,
                ]);
                setOverview(overviewRes.metrics);
                setChannels(channelsRes.channels);
                setTimeline(timelineRes.timeline);
            } catch (error) {
                console.error("Failed to load analytics", error);
            } finally {
                setLoading(false);
            }
        }
        fetchAnalytics();
    }, [days]);

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const formattedTimeline = timeline.map((t) => ({
        ...t,
        formattedDate: formatDate(t.date),
    }));

    // Derived: failure rate
    const failureRate =
        overview && overview.total_sent > 0
            ? ((overview.total_failed / overview.total_sent) * 100)
            : 0;
    const failureRateHighlight: "danger" | undefined =
        failureRate > 5 ? "danger" : undefined;

    // Derived: delivered = sent - failed - pending
    const totalDelivered =
        overview
            ? Math.max(0, overview.total_sent - overview.total_failed - overview.total_pending)
            : 0;

    // Channel bar chart data with proper display names
    const channelBarData = channels.map((c) => ({
        channel: CHANNEL_DISPLAY[c.channel] || c.channel,
        Sent: c.sent,
        Failed: c.failed,
    }));

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div style={{
                    background: "var(--color-elevated)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    padding: 12,
                }}>
                    <p style={{
                        fontFamily: "monospace",
                        fontSize: "0.75rem",
                        color: "var(--color-text-primary)",
                        borderBottom: "1px solid var(--color-border)",
                        paddingBottom: 4,
                        marginBottom: 8,
                    }}>
                        {label}
                    </p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 16,
                            fontSize: "0.75rem",
                            fontFamily: "monospace",
                            marginBottom: index < payload.length - 1 ? 4 : 0,
                        }}>
                            <span style={{ color: entry.color }}>{entry.name}:</span>
                            <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{entry.value.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div style={{ maxWidth: 1152, margin: "0 auto" }} className="vstack">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 24 }}>
                <div>
                    <h1 className="alrt-page-title">Analytics</h1>
                    <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                        Notification delivery stats and channel performance.
                    </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Range:</span>
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: "3rem 0", textAlign: "center" }}>
                    <div aria-busy="true" data-spinner="large"></div>
                </div>
            ) : (
                <div className="vstack" style={{ gap: 24 }}>
                    {/* Row 1: Stat cards */}
                    {overview && (
                        <div className="alrt-grid-stats">
                            <StatCard label="Total sent" value={overview.total_sent} />
                            <StatCard label="Delivered" value={totalDelivered} highlight="success" />
                            <StatCard label="Failed" value={overview.total_failed} highlight={overview.total_failed > 0 ? "danger" : undefined} />
                            <StatCard
                                label="Failure rate"
                                value={`${failureRate.toFixed(1)}%`}
                                highlight={failureRateHighlight}
                            />
                        </div>
                    )}

                    {/* Row 2: Channel breakdown - PRIMARY chart, full width */}
                    <article className="card">
                        <header><h3>Channel breakdown</h3></header>
                        {channels.length === 0 ? (
                            <div className="alrt-empty" style={{ padding: "4rem 0" }}>No data</div>
                        ) : (
                            <div style={{ width: "100%", height: 320, paddingTop: 16 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={channelBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                        <XAxis dataKey="channel" tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                                        <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '10px' }} iconType="circle" />
                                        <Bar dataKey="Sent" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                                        <Bar dataKey="Failed" fill="#ef4444" radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </article>

                    {/* Row 3: Delivery timeline - secondary chart, full width */}
                    <article className="card">
                        <header><h3>Delivery timeline</h3></header>
                        {timeline.length === 0 ? (
                            <div className="alrt-empty" style={{ padding: "4rem 0" }}>No data available</div>
                        ) : (
                            <div style={{ width: "100%", height: 256, paddingTop: 16 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={formattedTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                        <XAxis dataKey="formattedDate" tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{ fontSize: 10, fill: '#71717a', fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v} />
                                        <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.03)' }} content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '10px' }} iconType="circle" />
                                        <Bar dataKey="sent" name="Sent" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                                        <Bar dataKey="failed" name="Failed" stackId="a" fill="#ef4444" radius={[2, 2, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </article>
                </div>
            )}
        </div>
    );
}
