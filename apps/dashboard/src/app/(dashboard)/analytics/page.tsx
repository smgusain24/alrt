"use client";

import { useEffect, useState } from "react";
import { WindowCard, RetroTable, Badge } from "@/components/retro";
import { api } from "@/lib/api";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend,
    PieChart, Pie, Cell, Sector
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

export default function AnalyticsDashboard() {
    const [days, setDays] = useState(30);
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

    const channelCols = [
        { key: "channel", header: "Channel", render: (r: ChannelMetrics) => <Badge variant="default">{r.channel.replace("_", "-").toUpperCase()}</Badge> },
        { key: "sent", header: "Sent" },
        { key: "failed", header: "Failed" },
        { key: "pending", header: "Pending" },
        {
            key: "success_rate", header: "Success Rate", render: (r: ChannelMetrics) => (
                <span className={r.success_rate > 90 ? "text-success font-bold" : r.success_rate < 50 ? "text-danger font-bold" : "text-warning font-bold"}>
                    {r.success_rate.toFixed(1)}%
                </span>
            )
        }
    ];

    const workflowCols = [
        { key: "workflow_name", header: "Workflow", render: (r: WorkflowMetrics) => <span className="font-bold text-navy">{r.workflow_name}</span> },
        { key: "total_executions", header: "Total Execs" },
        {
            key: "success_rate", header: "Success Rate", render: (r: WorkflowMetrics) => (
                <Badge variant={r.success_rate > 90 ? "success" : r.success_rate < 50 ? "danger" : "warning"}>{r.success_rate.toFixed(1)}%</Badge>
            )
        },
        { key: "avg_duration_ms", header: "Avg Time", render: (r: WorkflowMetrics) => <span className="font-mono text-xs">{r.avg_duration_ms.toFixed(0)} ms</span> }
    ];

    // Custom Tooltip for Recharts
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-navy/95 backdrop-blur-md text-white p-3 border-2 border-muted shadow-[4px_4px_0px_rgba(0,0,0,0.3)]">
                    <p className="font-bold border-b border-muted/50 pb-1 mb-2 font-mono tracking-tighter text-[#00ff00] text-xs">
                        {label}
                    </p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex justify-between items-center gap-4 text-xs font-mono mb-1 last:mb-0">
                            <span style={{ color: entry.color }}>{entry.name}:</span>
                            <span className="font-bold">{entry.value.toLocaleString()}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const renderTimelineChart = () => {
        if (!timeline.length) return <div className="text-muted text-center py-16 flex items-center justify-center font-mono text-sm uppercase tracking-widest bg-row-alt/50 bevel-inset">NO DATA AVAILABLE</div>;

        return (
            <div className="w-full h-72 pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={formattedTimeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} opacity={0.3} />
                        <XAxis
                            dataKey="formattedDate"
                            tick={{ fontSize: 10, fill: '#666', fontFamily: 'monospace' }}
                            axisLine={false}
                            tickLine={false}
                            dy={10}
                        />
                        <YAxis
                            tick={{ fontSize: 10, fill: '#666', fontFamily: 'monospace' }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}
                        />
                        <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '10px' }} iconType="circle" />
                        <Bar dataKey="sent" name="Sent" stackId="a" fill="#22c55e" radius={[timeline.every(t => t.failed === 0) ? 2 : 0, timeline.every(t => t.failed === 0) ? 2 : 0, 0, 0]} />
                        <Bar dataKey="failed" name="Failed" stackId="a" fill="#ef4444" radius={[2, 2, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    // Custom Tooltip for Pie
    const CustomPieTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-navy/95 backdrop-blur-md text-white px-3 py-2 border-2 border-muted shadow-[4px_4px_0px_rgba(0,0,0,0.3)]">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 border border-white" style={{ backgroundColor: payload[0].payload.fill }} />
                        <span className="font-bold text-xs uppercase tracking-wider">{payload[0].name.replace("_", " ")}</span>
                    </div>
                    <div className="font-mono text-sm mt-1">{payload[0].value.toLocaleString()} sent</div>
                </div>
            );
        }
        return null;
    };

    const renderChannelPieChart = () => {
        if (!channels.length) return <div className="text-muted text-center py-16 flex items-center justify-center font-mono text-sm uppercase tracking-widest bg-row-alt/50 bevel-inset h-full">NO DATA</div>;

        const pieData = channels.map((c, i) => ({
            name: c.channel,
            value: c.sent,
            fill: ["#22c55e", "#3b82f6", "#eab308", "#f97316", "#a855f7"][i % 5]
        }));

        return (
            <div className="w-full h-64 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                        >
                            {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <RechartsTooltip content={<CustomPieTooltip />} />
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '0px' }} iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        );
    };

    // Animate numbers for stats
    const AnimatedCounter = ({ value, label, colorClass }: { value: number; label: string; colorClass: string }) => {
        const [count, setCount] = useState(0);

        useEffect(() => {
            let start = 0;
            const end = value;
            if (end === 0) return;
            const duration = 1000;
            const incrementTime = Math.max(16, duration / end);

            const timer = setInterval(() => {
                start += Math.ceil(end / (duration / 16));
                if (start >= end) {
                    setCount(end);
                    clearInterval(timer);
                } else {
                    setCount(start);
                }
            }, incrementTime);

            return () => clearInterval(timer);
        }, [value]);

        return (
            <div className="flex-1 bg-white border-b-4 border-r-4 border-t border-l border-t-white/50 border-l-white/50 border-b-muted border-r-muted p-4 shadow-sm flex flex-col items-center justify-center min-w-[150px] transform transition-transform hover:-translate-y-1 duration-200">
                <div className={`text-4xl font-mono font-bold tracking-tighter ${colorClass} drop-shadow-sm`}>
                    {count.toLocaleString()}
                </div>
                <div className="text-[10px] font-heading text-muted mt-1 uppercase tracking-widest font-bold">
                    {label}
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-heading mb-2 uppercase text-navy">Analytics Telemetry</h1>
                    <p className="text-muted font-mono text-sm max-w-xl">
                        Monitor notification delivery, workflow performance, and channel health metrics across the stack.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase text-muted tracking-wider">Time Range:</span>
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="bevel-inset bg-white text-sm font-bold uppercase cursor-pointer outline-none bg-row-alt px-2 py-1"
                    >
                        <option value={7}>Last 7 Days</option>
                        <option value={30}>Last 30 Days</option>
                        <option value={90}>Last 90 Days</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="py-12 text-center text-muted flex flex-col items-center">
                    <div className="bevel-inset p-4 bg-navy w-16 h-16 mb-4 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border-4 border-white border-t-[#00ff00] animate-spin" />
                    </div>
                    <p className="font-mono text-xs uppercase tracking-widest animate-pulse">Loading telemetry data...</p>
                </div>
            ) : (
                <>
                    {/* Animated Overview Metrics */}
                    {overview && (
                        <div className="mb-8 flex flex-wrap gap-4 justify-center bg-[#c0c0c0] p-4 bevel-outset">
                            <AnimatedCounter value={overview.total_sent} label="Total Sent" colorClass="text-success" />
                            <AnimatedCounter value={overview.total_failed} label="Total Failed" colorClass="text-danger" />
                            <AnimatedCounter value={overview.total_pending} label="In Flight" colorClass="text-warning" />
                        </div>
                    )}

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-3">
                            <WindowCard title="DELIVERY TIMELINE">
                                {renderTimelineChart()}
                            </WindowCard>
                        </div>

                        <div className="xl:col-span-1 flex flex-col gap-6">
                            <WindowCard title="CHANNEL USAGE" className="flex-1">
                                {renderChannelPieChart()}
                            </WindowCard>
                        </div>

                        <div className="xl:col-span-2">
                            <WindowCard title="CHANNEL PERFORMANCE">
                                {channels.length === 0 ? (
                                    <div className="text-center py-12 text-muted font-mono text-xs uppercase bg-row-alt/50 bevel-inset">No channel data</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <RetroTable<ChannelMetrics> columns={channelCols} data={channels} />
                                    </div>
                                )}
                            </WindowCard>
                        </div>

                        <div className="xl:col-span-3">
                            <WindowCard title="WORKFLOW METRICS">
                                {workflows.length === 0 ? (
                                    <div className="text-center py-12 text-muted font-mono text-xs uppercase bg-row-alt/50 bevel-inset">No workflow data</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <RetroTable<WorkflowMetrics> columns={workflowCols} data={workflows} />
                                    </div>
                                )}
                            </WindowCard>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
