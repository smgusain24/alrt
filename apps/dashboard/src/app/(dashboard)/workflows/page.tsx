"use client";

import { useState, useEffect } from "react";
import {
  RetroButton,
  RetroTable,
  Badge,
  WindowCard,
  RetroModal,
  BeveledInput,
  GrooveDivider,
} from "@/components/retro";
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
      <span className="font-bold text-foreground">{row.name}</span>
    ),
  },
  {
    key: "event_name",
    header: "Trigger Event",
    render: (row: WorkflowRow) => (
      <code className="font-mono text-xs bg-row-alt px-1.5 py-0.5 bevel-inset">
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
    header: "Last Edited",
    render: (row: WorkflowRow) => (
      <span className="font-mono text-xs text-muted">
        {new Date(row.updated_at).toLocaleDateString()}
      </span>
    ),
  },
];

function EmptyState() {
  return (
    <WindowCard title="No Workflows Yet">
      <div className="text-center py-8">
        <div className="bevel-outset bg-navy w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <Workflow className="w-8 h-8 text-white" strokeWidth={2} />
        </div>
        <p className="text-foreground">
          No workflows yet. Click <strong>&quot;Create Workflow&quot;</strong> above to build your first notification flow.
        </p>
      </div>
    </WindowCard>
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
        <h1 className="font-heading text-2xl uppercase">Workflows</h1>
        <RetroButton variant="accent" onClick={openCreateModal}>
          <Plus className="w-4 h-4 inline mr-1" strokeWidth={2} />
          Create Workflow
        </RetroButton>
      </div>

      {loading ? (
        <p className="text-muted">Loading workflows...</p>
      ) : error ? (
        <WindowCard title="Error">
          <p className="text-red-500">{error}</p>
        </WindowCard>
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <RetroTable<WorkflowRow>
          columns={columns}
          data={workflows}
          onRowClick={(row) => (window.location.href = `/workflows/${row.id}`)}
        />
      )}

      {/* Create Workflow Modal */}
      <RetroModal
        title="CREATE WORKFLOW"
        open={showCreate}
        onClose={() => setShowCreate(false)}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <BeveledInput
            id="wf-name"
            label="Workflow Name"
            placeholder="e.g. Welcome Email, New Comment"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            disabled={creating}
          />
          <BeveledInput
            id="wf-event"
            label="Event Name"
            placeholder="e.g. user-signup, new-comment"
            value={newEventName}
            onChange={(e) => setNewEventName(e.target.value)}
            required
            disabled={creating}
          />
          <p className="text-xs text-muted">
            The event name is used in the trigger API call. It must be unique per team.
          </p>

          {createError && (
            <div className="text-danger text-sm font-bold">{createError}</div>
          )}

          <GrooveDivider className="!my-3" />

          <RetroButton
            type="submit"
            variant="accent"
            className="w-full"
            disabled={creating}
          >
            {creating ? "Creating..." : "Create & Open Builder"}
          </RetroButton>
        </form>
      </RetroModal>
    </div>
  );
}
