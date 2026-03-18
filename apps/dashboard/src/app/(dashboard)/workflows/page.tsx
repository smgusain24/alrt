"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Table,
  Badge,
  Modal,
  Input,
} from "@/components/ui";
import { Plus, Workflow } from "lucide-react";
import { api } from "@/lib/api";

interface WorkflowRow {
  id: string;
  name: string;
  event_name: string;
  status: "published" | "draft";
  updated_at: string;
  [key: string]: unknown;
}

const columns = [
  {
    key: "name",
    header: "Workflow",
    render: (row: WorkflowRow) => (
      <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{row.name}</span>
    ),
  },
  {
    key: "event_name",
    header: "Trigger event",
    render: (row: WorkflowRow) => (
      <code style={{
        fontFamily: "monospace",
        fontSize: "0.75rem",
        background: "var(--color-elevated)",
        borderRadius: "4px",
        padding: "2px 6px",
        color: "var(--color-text-secondary)",
      }}>
        {row.event_name}
      </code>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row: WorkflowRow) => (
      <Badge variant={row.status === "published" ? "success" : "warning"}>
        {row.status}
      </Badge>
    ),
  },
  {
    key: "updated_at",
    header: "Last edited",
    render: (row: WorkflowRow) => (
      <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
        {new Date(row.updated_at).toLocaleDateString()}
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
        <Workflow style={{ width: 32, height: 32, color: "var(--color-text-muted)" }} strokeWidth={1.5} />
      </div>
      <h3>No workflows yet</h3>
      <p>
        Click <strong>&quot;Create workflow&quot;</strong> above to build your first notification flow.
      </p>
    </div>
  );
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create modal state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEventName, setNewEventName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    api.workflows
      .list()
      .then((data: any) => setWorkflows(data))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEventName.trim()) return;

    setCreating(true);
    setCreateError("");
    try {
      const wf: any = await api.workflows.create({
        name: newName.trim(),
        event_name: newEventName.trim(),
        definition: {},
      });
      window.location.href = `/workflows/${wf.id}`;
    } catch (err: any) {
      setCreateError(err.message || "Failed to create workflow");
    } finally {
      setCreating(false);
    }
  };

  const openCreateModal = () => {
    setNewName("");
    setNewEventName("");
    setCreateError("");
    setShowCreate(true);
  };

  const isEmpty = workflows.length === 0;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div className="alrt-page-header">
        <h1 className="alrt-page-title">Workflows</h1>
        <button onClick={openCreateModal}>
          <Plus style={{ width: 16, height: 16, display: "inline", marginRight: 4 }} strokeWidth={1.5} />
          Create workflow
        </button>
      </div>

      {loading ? (
        <div aria-busy="true" data-spinner="large"></div>
      ) : error ? (
        <article className="card">
          <p style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>{error}</p>
        </article>
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <Table<WorkflowRow>
          columns={columns}
          data={workflows}
          onRowClick={(row) => (window.location.href = `/workflows/${row.id}`)}
        />
      )}

      {/* Create Workflow Modal */}
      <Modal
        title="Create workflow"
        open={showCreate}
        onClose={() => setShowCreate(false)}
      >
        <form onSubmit={handleCreate} className="vstack">
          <Input
            id="wf-name"
            label="Workflow name"
            placeholder="e.g. Welcome Email, New Comment"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            disabled={creating}
          />
          <Input
            id="wf-event"
            label="Event name"
            placeholder="e.g. user-signup, new-comment"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            required
            disabled={creating}
          />
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
            The event name is used in the trigger API call. It must be unique per team.
          </p>

          {createError && (
            <div style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>{createError}</div>
          )}

          <hr />

          <button
            type="submit"
            disabled={creating}
            style={{ width: "100%" }}
          >
            {creating ? "Creating..." : "Create & open builder"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
