"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { WindowCard, RetroTable, Badge, RetroButton, BeveledInput } from "@/components/retro";
import { api } from "@/lib/api";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface EventLog {
  [key: string]: any;
  id: string;
  method: string;
  path: string;
  status_code: number | null;
  latency_ms: number | null;
  request_body: any;
  response_summary: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface LogsResponse {
  logs: EventLog[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

const METHOD_OPTIONS = ["", "GET", "POST", "PUT", "PATCH", "DELETE"];

function StatusBadge({ code }: { code: number | null }) {
  if (!code) return <span className="text-muted">--</span>;
  const variant = code < 300 ? "success" : code < 400 ? "warning" : "danger";
  return <Badge variant={variant}>{code}</Badge>;
}

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "text-[#22c55e]",
    POST: "text-[#3b82f6]",
    PUT: "text-[#eab308]",
    PATCH: "text-[#f97316]",
    DELETE: "text-[#ef4444]",
  };
  return (
    <span className={`font-mono font-bold text-xs ${colors[method] || "text-muted"}`}>
      {method}
    </span>
  );
}

export default function LogsPage() {
  const [logs, setLogs] = useState<EventLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage] = useState(50);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [method, setMethod] = useState("");
  const [path, setPath] = useState("");
  const [statusMin, setStatusMin] = useState("");
  const [statusMax, setStatusMax] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, per_page: perPage };
      if (method) params.method = method;
      if (path) params.path = path;
      if (statusMin) params.status_min = statusMin;
      if (statusMax) params.status_max = statusMax;
      if (startDate) params.start_date = new Date(startDate).toISOString();
      if (endDate) params.end_date = new Date(endDate).toISOString();

      const res = (await api.logs.list(params)) as LogsResponse;
      setLogs(res.logs);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (error) {
      console.error("Failed to load logs", error);
    } finally {
      setLoading(false);
    }
  }, [page, perPage, method, path, statusMin, statusMax, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleFilter = () => {
    setPage(1);
    fetchLogs();
  };

  const clearFilters = () => {
    setMethod("");
    setPath("");
    setStatusMin("");
    setStatusMax("");
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

  const columns = [
    {
      key: "created_at",
      header: "Timestamp",
      render: (r: EventLog) => (
        <span className="font-mono text-xs">{formatTimestamp(r.created_at)}</span>
      ),
    },
    {
      key: "method",
      header: "Method",
      render: (r: EventLog) => <MethodBadge method={r.method} />,
    },
    {
      key: "path",
      header: "Path",
      render: (r: EventLog) => (
        <span className="font-mono text-xs truncate max-w-[300px] inline-block">{r.path}</span>
      ),
    },
    {
      key: "status_code",
      header: "Status",
      render: (r: EventLog) => <StatusBadge code={r.status_code} />,
    },
    {
      key: "latency_ms",
      header: "Latency",
      render: (r: EventLog) => (
        <span className="font-mono text-xs">
          {r.latency_ms !== null ? `${r.latency_ms}ms` : "--"}
        </span>
      ),
    },
  ];

  const hasFilters = method || path || statusMin || statusMax || startDate || endDate;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-heading mb-2 uppercase text-navy">Event Logs</h1>
        <p className="text-muted font-mono text-sm max-w-xl">
          Audit trail of all API requests. Filter, search, and inspect request details.
        </p>
      </div>

      {/* Filters */}
      <WindowCard title="FILTERS">
        <div className="flex flex-wrap gap-3 items-end p-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-muted tracking-wider">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="bevel-inset bg-white text-sm font-bold uppercase cursor-pointer outline-none px-2 py-1.5 min-w-[100px]"
            >
              {METHOD_OPTIONS.map((m) => (
                <option key={m} value={m}>{m || "ALL"}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-muted tracking-wider">Path</label>
            <BeveledInput
              value={path}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPath(e.target.value)}
              placeholder="/events/trigger"
              className="text-sm min-w-[180px]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-muted tracking-wider">Status Min</label>
            <BeveledInput
              type="number"
              value={statusMin}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatusMin(e.target.value)}
              placeholder="200"
              className="text-sm w-[80px]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-muted tracking-wider">Status Max</label>
            <BeveledInput
              type="number"
              value={statusMax}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatusMax(e.target.value)}
              placeholder="599"
              className="text-sm w-[80px]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-muted tracking-wider">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bevel-inset bg-white text-sm px-2 py-1.5 outline-none font-mono"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-bold uppercase text-muted tracking-wider">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bevel-inset bg-white text-sm px-2 py-1.5 outline-none font-mono"
            />
          </div>

          <div className="flex gap-2 items-end">
            <RetroButton onClick={handleFilter} className="text-xs px-3 py-1.5">
              Search
            </RetroButton>
            {hasFilters && (
              <RetroButton variant="danger" onClick={clearFilters} className="text-xs px-3 py-1.5">
                <X className="w-3 h-3 inline mr-1" />
                Clear
              </RetroButton>
            )}
          </div>
        </div>
      </WindowCard>

      {/* Results */}
      <WindowCard title={`EVENT LOGS (${total.toLocaleString()} total)`}>
        {loading ? (
          <div className="py-12 text-center text-muted flex flex-col items-center">
            <div className="bevel-inset p-4 bg-navy w-16 h-16 mb-4 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-4 border-white border-t-[#00ff00] animate-spin" />
            </div>
            <p className="font-mono text-xs uppercase tracking-widest animate-pulse">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted font-mono text-xs uppercase bg-row-alt/50 bevel-inset">
            No logs found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#c0c0c0] bevel-outset">
                    {columns.map((col) => (
                      <th key={col.key} className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wider text-foreground">
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <Fragment key={log.id}>
                      <tr
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        className={`
                          cursor-pointer border-b border-muted/20 transition-none
                          ${idx % 2 === 0 ? "bg-white" : "bg-row-alt"}
                          ${expandedId === log.id ? "bg-accent/10" : "hover:bg-accent/5"}
                        `}
                      >
                        {columns.map((col) => (
                          <td key={col.key} className="px-3 py-2">
                            {col.render(log)}
                          </td>
                        ))}
                      </tr>
                      {expandedId === log.id && (
                        <tr key={`${log.id}-detail`} className="bg-navy/5">
                          <td colSpan={columns.length} className="px-4 py-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-[10px] font-bold uppercase text-muted tracking-wider mb-1">Request Body</h4>
                                <pre className="bevel-inset bg-white p-3 text-xs font-mono overflow-auto max-h-48 whitespace-pre-wrap">
                                  {log.request_body ? JSON.stringify(log.request_body, null, 2) : "No request body"}
                                </pre>
                              </div>
                              <div>
                                <h4 className="text-[10px] font-bold uppercase text-muted tracking-wider mb-1">Details</h4>
                                <div className="bevel-inset bg-white p-3 text-xs font-mono space-y-1">
                                  <div><span className="text-muted">IP:</span> {log.ip_address || "--"}</div>
                                  <div><span className="text-muted">User-Agent:</span> {log.user_agent || "--"}</div>
                                  <div><span className="text-muted">Full Timestamp:</span> {new Date(log.created_at).toISOString()}</div>
                                  {log.response_summary && (
                                    <div>
                                      <span className="text-muted">Response:</span>
                                      <pre className="mt-1 whitespace-pre-wrap">{JSON.stringify(log.response_summary, null, 2)}</pre>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-[#c0c0c0] bevel-outset mt-0">
                <span className="font-mono text-xs text-muted">
                  Page {page} of {totalPages}
                </span>

                <div className="flex gap-1">

                  {/* Prev */}
                  <RetroButton
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="text-xs px-2 py-1"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </RetroButton>


                  {/* Page Numbers */}
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
                      <RetroButton
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        variant={pageNum === page ? "accent" : "default"}
                        className="text-xs px-2 py-1 min-w-[28px]"
                      >
                        {pageNum}
                      </RetroButton>
                    );

                  })}


                  <RetroButton
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="text-xs px-2 py-1"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </RetroButton>

                </div>
              </div>
            )}
          </>
        )}
      </WindowCard>
    </div>
  );
}
