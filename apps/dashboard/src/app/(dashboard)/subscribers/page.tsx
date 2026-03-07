"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Table,
  Card,
  Badge,
  Input,
  Modal,
  Divider,
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
      <code className="font-mono text-xs bg-elevated rounded px-1.5 py-0.5 text-text-secondary">
        {row.external_id}
      </code>
    ),
  },
  {
    key: "name",
    header: "Name",
    render: (row: SubscriberRow) => (
      <span className="font-medium text-text-primary">{row.name}</span>
    ),
  },
  {
    key: "email",
    header: "Email",
    render: (row: SubscriberRow) => (
      <span className="font-mono text-xs text-text-muted">{row.email}</span>
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
        <div className="flex gap-1 flex-wrap">
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
      <span className="font-mono text-xs text-text-muted">
        {new Date(row.created_at).toLocaleDateString()}
      </span>
    ),
  },
];

function EmptyState() {
  return (
    <Card className="text-center py-12">
      <div className="flex flex-col items-center">
        <div className="bg-elevated rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-text-muted" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">No subscribers yet</h3>
        <p className="text-text-secondary text-sm max-w-sm">
          Click <strong>&quot;Add subscriber&quot;</strong> above to create one for testing,
          or use the API to create subscribers programmatically.
        </p>
      </div>
    </Card>
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
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Subscribers</h1>
        <Button variant="primary" onClick={openCreateModal}>
          <Plus className="w-4 h-4 inline mr-1" strokeWidth={1.5} />
          Add subscriber
        </Button>
      </div>

      <div className="bg-accent/10 border border-accent/20 rounded-md p-4 mb-6 text-sm text-text-secondary">
        <strong className="text-text-primary text-xs font-medium">Note:</strong>{" "}
        In production, subscribers are created automatically via the API when users sign up in your app.
        Use this page to manage existing subscribers and test notification delivery.{" "}
        <a href="/docs#subscribers" className="text-accent hover:underline">See API docs</a>.
      </div>

      {loading ? (
        <p className="text-text-muted text-sm">Loading subscribers...</p>
      ) : error ? (
        <Card>
          <p className="text-red-500 text-sm">{error}</p>
        </Card>
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <>
          <div className="mb-4 relative max-w-sm">
            <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <Table<SubscriberRow>
            columns={columns}
            data={filtered}
            onRowClick={(row) => (window.location.href = `/subscribers/${row.external_id}`)}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs font-mono text-text-muted">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total} subscribers
              </span>
              <div className="flex gap-1">
                <Button
                  variant="default"
                  className="text-xs px-3 py-1"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Prev
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const start = Math.max(0, Math.min(page - 2, totalPages - 5));
                  const pageNum = start + i;
                  if (pageNum >= totalPages) return null;
                  return (
                    <Button
                      key={pageNum}
                      variant="default"
                      className={`text-xs px-3 py-1 ${pageNum === page ? "bg-elevated text-accent font-medium" : ""}`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum + 1}
                    </Button>
                  );
                })}
                <Button
                  variant="default"
                  className="text-xs px-3 py-1"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Create Subscriber Modal */}
      <Modal
        title="Create subscriber"
        open={showCreate}
        onClose={() => setShowCreate(false)}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <p className="text-xs text-text-muted bg-elevated rounded-md px-3 py-2">
            For testing only. In production, create subscribers via <code className="font-mono text-accent">POST /subscribers</code> in your backend.
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

          <Divider className="!my-3" />

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Channel preferences
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPrefInApp((v) => !v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-[6px] transition-colors ${
                  prefInApp
                    ? "bg-accent text-white"
                    : "bg-elevated text-text-secondary hover:text-text-primary"
                }`}
                disabled={creating}
              >
                In-app
              </button>
              <button
                type="button"
                onClick={() => setPrefEmail((v) => !v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-[6px] transition-colors ${
                  prefEmail
                    ? "bg-accent text-white"
                    : "bg-elevated text-text-secondary hover:text-text-primary"
                }`}
                disabled={creating}
              >
                Email
              </button>
              <button
                type="button"
                onClick={() => setPrefSlack((v) => !v)}
                className={`px-3 py-1.5 text-xs font-medium rounded-[6px] transition-colors ${
                  prefSlack
                    ? "bg-accent text-white"
                    : "bg-elevated text-text-secondary hover:text-text-primary"
                }`}
                disabled={creating}
              >
                Slack
              </button>
            </div>
          </div>

          {createError && (
            <div className="text-danger text-sm">{createError}</div>
          )}

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={creating}
          >
            {creating ? "Creating..." : "Create subscriber"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
