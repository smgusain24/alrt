"use client";

import { useState, useEffect } from "react";
import {
  Button,
  Table,
  Badge,
  Card,
  Modal,
  Input,
  Divider,
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
      <span className="font-medium text-text-primary">{row.name}</span>
    ),
  },
  {
    key: "event_name",
    header: "Trigger event",
    render: (row: WorkflowRow) => (
      <code className="font-mono text-xs bg-elevated rounded px-1.5 py-0.5 text-text-secondary">
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
      <span className="font-mono text-xs text-text-muted">
        {new Date(row.updated_at).toLocaleDateString()}
      </span>
    ),
  },
];

function EmptyState() {
  return (
    <Card className="text-center py-12">
      <div className="flex flex-col items-center">
        <div className="bg-elevated rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <Workflow className="w-8 h-8 text-text-muted" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-semibold text-text-primary mb-2">No workflows yet</h3>
        <p className="text-text-secondary text-sm max-w-sm">
          Click <strong>&quot;Create workflow&quot;</strong> above to build your first notification flow.
        </p>
      </div>
    </Card>
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
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Workflows</h1>
        <Button variant="primary" onClick={openCreateModal}>
          <Plus className="w-4 h-4 inline mr-1" strokeWidth={1.5} />
          Create workflow
        </Button>
      </div>

      {loading ? (
        <p className="text-text-muted text-sm">Loading workflows...</p>
      ) : error ? (
        <Card>
          <p className="text-red-500 text-sm">{error}</p>
        </Card>
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
        <form onSubmit={handleCreate} className="space-y-4">
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
          <p className="text-xs text-text-muted">
            The event name is used in the trigger API call. It must be unique per team.
          </p>

          {createError && (
            <div className="text-danger text-sm">{createError}</div>
          )}

          <Divider className="!my-3" />

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={creating}
          >
            {creating ? "Creating..." : "Create & open builder"}
          </Button>
        </form>
      </Modal>
    </div>
  );
}
