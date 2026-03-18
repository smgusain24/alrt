"use client";

import { useState, useEffect } from "react";
import {
  Table,
  Badge,
  Input,
  Modal,
} from "@/components/ui";
import { Users, Plus, Search } from "lucide-react";
import { api } from "@/lib/api";

interface SubscriberRow {
  id: string;
  external_id: string;
  name: string;
  email: string;
  channel_preferences: Record<string, boolean>;
  created_at: string;
  [key: string]: unknown;
}

const CHANNEL_CONFIG: Record<
  string,
  { label: string; variant: "success" | "neutral" | "warning" }
> = {
  in_app: { label: "in-app", variant: "success" },
  email: { label: "email", variant: "neutral" },
  slack: { label: "slack", variant: "warning" },
};

const columns = [
  {
    key: "external_id",
    header: "External ID",
    render: (row: SubscriberRow) => (
      <code style={{
        fontFamily: "monospace",
        fontSize: "0.75rem",
        background: "var(--color-elevated)",
        borderRadius: 4,
        padding: "2px 6px",
        color: "var(--color-text-secondary)",
      }}>
        {row.external_id}
      </code>
    ),
  },
  {
    key: "name",
    header: "Name",
    render: (row: SubscriberRow) => (
      <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{row.name}</span>
    ),
  },
  {
    key: "email",
    header: "Email",
    render: (row: SubscriberRow) => (
      <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{row.email}</span>
    ),
  },
  {
    key: "channel_preferences",
    header: "Channels",
    render: (row: SubscriberRow) => {
      const channels = row.channel_preferences
        ? Object.entries(row.channel_preferences)
            .filter(([, enabled]) => enabled)
            .map(([ch]) => ch)
        : [];
      return (
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {channels.map((ch) => {
            const config = CHANNEL_CONFIG[ch];
            if (!config) return null;
            return (
              <Badge key={ch} variant={config.variant}>
                {config.label}
              </Badge>
            );
          })}
        </div>
      );
    },
  },
  {
    key: "created_at",
    header: "Created",
    render: (row: SubscriberRow) => (
      <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
        {new Date(row.created_at).toLocaleDateString()}
      </span>
    ),
  },
];

function EmptyState() {
  return (
    <div className="alrt-empty">
      <div style={{
        background: "var(--color-elevated)",
        borderRadius: "50%",
        width: 64,
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 1rem",
      }}>
        <Users style={{ width: 32, height: 32, color: "var(--color-text-muted)" }} strokeWidth={1.5} />
      </div>
      <h3>No subscribers yet</h3>
      <p>
        Click <strong>&quot;Add subscriber&quot;</strong> above to create one for testing,
        or use the API to create subscribers programmatically.
      </p>
    </div>
  );
}

export default function SubscribersPage() {
  const [search, setSearch] = useState("");
  const [subscribers, setSubscribers] = useState<SubscriberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newExternalId, setNewExternalId] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newSlackId, setNewSlackId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Channel preference toggles
  const [prefInApp, setPrefInApp] = useState(true);
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefSlack, setPrefSlack] = useState(false);

  const fetchSubscribers = (pageNum = page) => {
    setLoading(true);
    api.subscribers
      .list(PAGE_SIZE, pageNum * PAGE_SIZE)
      .then((res: any) => {
        setSubscribers(res.data || []);
        setTotal(res.total || 0);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSubscribers(page);
  }, [page]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExternalId.trim()) return;

    setCreating(true);
    setCreateError("");
    try {
      await api.subscribers.create({
        external_id: newExternalId.trim(),
        name: newName.trim() || undefined,
        email: newEmail.trim() || undefined,
        slack_user_id: newSlackId.trim() || undefined,
        channel_preferences: { in_app: prefInApp, email: prefEmail, slack: prefSlack },
      });
      setShowCreate(false);
      fetchSubscribers();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create subscriber");
    } finally {
      setCreating(false);
    }
  };

  const openCreateModal = () => {
    setNewExternalId("");
    setNewName("");
    setNewEmail("");
    setNewSlackId("");
    setCreateError("");
    setPrefInApp(true);
    setPrefEmail(true);
    setPrefSlack(false);
    setShowCreate(true);
  };

  const filtered = subscribers.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase())
  );

  const isEmpty = subscribers.length === 0;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div className="alrt-page-header">
        <h1 className="alrt-page-title">Subscribers</h1>
        <button onClick={openCreateModal}>
          <Plus style={{ width: 16, height: 16, display: "inline", marginRight: 4 }} strokeWidth={1.5} />
          Add subscriber
        </button>
      </div>

      <aside style={{
        background: "rgba(62,163,105,0.1)",
        border: "1px solid rgba(62,163,105,0.2)",
        borderRadius: 6,
        padding: 16,
        marginBottom: 24,
        fontSize: "0.875rem",
        color: "var(--color-text-secondary)",
      }}>
        <strong style={{ color: "var(--color-text-primary)", fontSize: "0.75rem", fontWeight: 500 }}>Note:</strong>{" "}
        In production, subscribers are created automatically via the API when users sign up in your app.
        Use this page to manage existing subscribers and test notification delivery.{" "}
        <a href="/docs#subscribers" style={{ color: "var(--color-accent)" }}>See API docs</a>.
      </aside>

      {loading ? (
        <div aria-busy="true" data-spinner="large"></div>
      ) : error ? (
        <article className="card">
          <p style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>{error}</p>
        </article>
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <>
          <div style={{ marginBottom: 16, position: "relative", maxWidth: 384 }}>
            <Search style={{
              width: 16,
              height: 16,
              position: "absolute",
              left: 10,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--color-text-muted)",
              pointerEvents: "none",
            }} />
            <input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32, width: "100%" }}
            />
          </div>

          <Table<SubscriberRow>
            columns={columns}
            data={filtered}
            onRowClick={(row) => (window.location.href = `/subscribers/${row.external_id}`)}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <nav aria-label="Pagination" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16 }}>
              <span style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--color-text-muted)" }}>
                {page * PAGE_SIZE + 1}--{Math.min((page + 1) * PAGE_SIZE, total)} of {total} subscribers
              </span>
              <menu className="buttons" style={{ display: "flex", gap: 4 }}>
                <li>
                  <button
                    className="outline small"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Prev
                  </button>
                </li>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                  const pageNum = start + i;
                  if (pageNum >= totalPages) return null;
                  return (
                    <li key={pageNum}>
                      <button
                        className={pageNum === page ? "small" : "outline small"}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum + 1}
                      </button>
                    </li>
                  );
                })}
                <li>
                  <button
                    className="outline small"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </button>
                </li>
              </menu>
            </nav>
          )}
        </>
      )}

      {/* Create Subscriber Modal */}
      <Modal
        title="Create subscriber"
        open={showCreate}
        onClose={() => setShowCreate(false)}
      >
        <form onSubmit={handleCreate} className="vstack">
          <p style={{
            fontSize: "0.75rem",
            color: "var(--color-text-muted)",
            background: "var(--color-elevated)",
            borderRadius: 6,
            padding: "8px 12px",
          }}>
            For testing only. In production, create subscribers via <code style={{ fontFamily: "monospace", color: "var(--color-accent)" }}>POST /subscribers</code> in your backend.
          </p>
          <Input
            id="sub-external-id"
            label="External ID"
            placeholder="Your app's user ID (e.g. user_123)"
            value={newExternalId}
            onChange={(e) => setNewExternalId(e.target.value)}
            required
            disabled={creating}
          />
          <Input
            id="sub-name"
            label="Name"
            placeholder="Jane Doe"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            disabled={creating}
          />
          <Input
            id="sub-email"
            label="Email"
            type="email"
            placeholder="jane@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            disabled={creating}
          />
          <Input
            id="sub-slack-id"
            label="Slack User ID"
            placeholder="U04ABC123 (optional)"
            value={newSlackId}
            onChange={(e) => setNewSlackId(e.target.value)}
            disabled={creating}
          />

          <hr />

          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 8 }}>
              Channel preferences
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {[
                { label: "In-app", value: prefInApp, toggle: () => setPrefInApp((v) => !v) },
                { label: "Email", value: prefEmail, toggle: () => setPrefEmail((v) => !v) },
                { label: "Slack", value: prefSlack, toggle: () => setPrefSlack((v) => !v) },
              ].map((ch) => (
                <button
                  key={ch.label}
                  type="button"
                  onClick={ch.toggle}
                  disabled={creating}
                  className={ch.value ? "small" : "outline small"}
                >
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {createError && (
            <div style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>{createError}</div>
          )}

          <button
            type="submit"
            disabled={creating}
            style={{ width: "100%" }}
          >
            {creating ? "Creating..." : "Create subscriber"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
