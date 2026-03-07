"use client";

import { useEffect, useState } from "react";
import { Card, Table, Badge } from "@/components/ui";
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

interface WorkflowMetrics {
    [key: string]: any;
    workflow_id: string;
    workflow_name: string;
    total_executions: number;
    success_executions: number;
    failed_executions: number;
    success_rate: number;
    avg_duration_ms: number;
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
    const colorMap = {
        danger: "text-danger",
        success: "text-success",
        warning: "text-warning",
    };
    const valueClass = highlight ? colorMap[highlight] : "text-text-primary";

    return (
        <div className="flex-1 bg-surface border border-default rounded-md p-4 flex flex-col items-center justify-center min-w-[140px] gap-1">
            <div className={`font-mono text-3xl font-semibold ${valueClass}`}>
                {typeof value === "number" ? value.toLocaleString() : value}
            </div>
            <div className="text-xs text-text-muted">
                {label}
            </div>
        </div>
    );
}

export default function AnalyticsDashboard() {
    const [days, setDays] = useState(7);
    const [overview, setOverview] = useState<OverviewMetrics | null>(null);
    const [channels, setChannels] = useState<ChannelMetrics[]>([]);
    const [workflows, setWorkflows] = useState<WorkflowMetrics[]>([]);
    const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAnalytics() {
            setLoading(true);
            try {
                const [overviewRes, channelsRes, workflowsRes, timelineRes] = await Promise.all([
                    api.analytics.overview(days) as Promise<{ metrics: OverviewMetrics }>,
                    api.analytics.delivery(days) as Promise<{ channels: ChannelMetrics[] }>,
                    api.analytics.workflows() as Promise<{ workflows: WorkflowMetrics[] }>,
                    api.analytics.timeline(days) as Promise<{ timeline: TimelinePoint[] }>,
                ]);
                setOverview(overviewRes.metrics);
                setChannels(channelsRes.channels);
                setWorkflows(workflowsRes.workflows);
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

    // Channel bar chart data
    const channelBarData = channels.map((c) => ({
        channel: c.channel.replace("_", "-"),
        Sent: c.sent,
        Failed: c.failed,
    }));

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-elevated border border-default rounded-md shadow-lg p-3">
                    <p className="font-mono text-xs text-text-primary border-b border-default pb-1 mb-2">
                        {label}
                    </p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex justify-between items-center gap-4 text-xs font-mono mb-1 last:mb-0">
                            <span style={{ color: entry.color }} className="text-text-secondary">{entry.name}:</span>
                            <span className="font-medium text-text-primary">{entry.value.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const workflowCols = [
        { key: "workflow_name", header: "Workflow", render: (r: WorkflowMetrics) => <span className="font-medium text-text-primary">{r.workflow_name}</span> },
        { key: "total_executions", header: "Total execs" },
        {
            key: "success_rate", header: "Success rate", render: (r: WorkflowMetrics) => (
                <Badge variant={r.success_rate > 90 ? "success" : r.success_rate < 50 ? "danger" : "warning"}>{r.success_rate.toFixed(1)}%</Badge>
            )
        },
        { key: "avg_duration_ms", header: "Avg time", render: (r: WorkflowMetrics) => <span className="font-mono text-xs text-text-secondary">{r.avg_duration_ms.toFixed(0)} ms</span> }
    ];

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-text-primary mb-1">Analytics</h1>
                    <p className="text-text-muted text-sm">
                        Notification delivery stats and channel performance.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">Range:</span>
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="bg-surface border border-bright rounded-[6px] text-sm text-text-primary cursor-pointer outline-none px-2 py-1 font-mono"
                    >
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="py-12 text-center text-text-muted flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full border-2 border-text-muted border-t-accent animate-spin mb-4" />
                    <p className="text-sm text-text-muted animate-pulse">Loading...</p>
                </div>
            ) : (
                <>
                    {/* Stat cards */}
                    {overview && (
                        <div className="flex flex-wrap gap-4">
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

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                        {/* Delivery timeline */}
                        <div className="xl:col-span-2">
                            <Card title="Delivery timeline">
                                {timeline.length === 0 ? (
                                    <div className="text-text-muted text-center py-16 text-sm">No data available</div>
                                ) : (
                                    <div className="w-full h-64 pt-4">
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
                            </Card>
                        </div>

                        {/* Channel breakdown bar chart */}
                        <div>
                            <Card title="Channel breakdown">
                                {channels.length === 0 ? (
                                    <div className="text-text-muted text-center py-16 text-sm">No data</div>
                                ) : (
                                    <div className="w-full h-64 pt-4">
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
                            </Card>
                        </div>

                        {/* Workflow metrics */}
                        <div>
                            <Card title="Workflow metrics">
                                {workflows.length === 0 ? (
                                    <div className="text-center py-12 text-text-muted text-sm">No workflow data</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <Table<WorkflowMetrics> columns={workflowCols} data={workflows} />
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
