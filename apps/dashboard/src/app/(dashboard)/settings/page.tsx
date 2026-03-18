"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Table,
  Badge,
  Input,
  Modal,
} from "@/components/ui";
import { Key, Plus, Trash2, Copy, Check, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";

interface ApiKeyRow {
  id: string;
  name: string | null;
  key_prefix: string;
  key_type: "server" | "client";
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  [key: string]: unknown;
}

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyType, setNewKeyType] = useState<"server" | "client">("server");
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Revoke modal state
  const [showRevokeConfirm, setShowRevokeConfirm] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Copy feedback
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async (tid: string) => {
    const data: any = await api.apiKeys.list(tid);
    setApiKeys(data);
  }, []);

  useEffect(() => {
    api.auth
      .me()
      .then(async (user: any) => {
        const tid = user.team_id;
        setTeamId(tid);
        await fetchKeys(tid);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [fetchKeys]);

  const openCreateModal = () => {
    setNewKeyName("");
    setNewKeyType("server");
    setCreatedRawKey(null);
    setCreateStep(1);
    setCopied(false);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    if (createStep === 2 && teamId) {
      fetchKeys(teamId);
    }
  };

  const handleCreate = async () => {
    if (!teamId) return;
    setCreating(true);
    try {
      const res: any = await api.apiKeys.create(teamId, {
        key_type: newKeyType,
        name: newKeyName || undefined,
      });
      setCreatedRawKey(res.raw_key);
      setCreateStep(2);
      setCopied(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyKey = async () => {
    if (!createdRawKey) return;
    await navigator.clipboard.writeText(createdRawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevoke = async () => {
    if (!teamId || !showRevokeConfirm) return;
    setRevoking(true);
    try {
      await api.apiKeys.revoke(teamId, showRevokeConfirm);
      await fetchKeys(teamId);
      setShowRevokeConfirm(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRevoking(false);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (row: ApiKeyRow) => (
        <span style={{ fontWeight: 500, fontSize: "0.875rem", color: "var(--color-text-primary)" }}>
          {row.name || <span style={{ color: "var(--color-text-muted)" }}>Unnamed</span>}
        </span>
      ),
    },
    {
      key: "key_prefix",
      header: "Key prefix",
      render: (row: ApiKeyRow) => (
        <code style={{
          fontFamily: "monospace",
          fontSize: "0.75rem",
          background: "var(--color-elevated)",
          borderRadius: 4,
          padding: "2px 6px",
          color: "var(--color-text-secondary)",
        }}>
          {row.key_prefix}
        </code>
      ),
    },
    {
      key: "key_type",
      header: "Type",
      render: (row: ApiKeyRow) => (
        <Badge variant={row.key_type === "server" ? "neutral" : "warning"}>
          {row.key_type}
        </Badge>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      render: (row: ApiKeyRow) => (
        <Badge variant={row.is_active ? "success" : "neutral"}>
          {row.is_active ? "active" : "revoked"}
        </Badge>
      ),
    },
    {
      key: "last_used_at",
      header: "Last used",
      render: (row: ApiKeyRow) => (
        <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
          {row.last_used_at ? relativeDate(row.last_used_at) : "Never"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (row: ApiKeyRow) => (
        <span style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: ApiKeyRow) => (
        <button
          data-variant="danger"
          className="small"
          disabled={!row.is_active}
          onClick={(e) => {
            e.stopPropagation();
            setShowRevokeConfirm(row.id);
          }}
        >
          <Trash2 style={{ width: 14, height: 14, display: "inline", marginRight: 4 }} strokeWidth={1.5} />
          Revoke
        </button>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      <div className="alrt-page-header">
        <h1 className="alrt-page-title">
          Settings &mdash; API keys
        </h1>
        <button onClick={openCreateModal}>
          <Plus style={{ width: 16, height: 16, display: "inline", marginRight: 4 }} strokeWidth={1.5} />
          Create API key
        </button>
      </div>

      <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginBottom: 16 }}>
        API keys authenticate requests to the Alrt API. Server keys have full
        access. Client keys are read-only.
      </p>

      <hr />

      <div style={{ marginTop: 16 }}>
        {loading ? (
          <div aria-busy="true" data-spinner="large"></div>
        ) : error ? (
          <article className="card">
            <p style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>{error}</p>
          </article>
        ) : (
          <Table<ApiKeyRow> columns={columns} data={apiKeys} />
        )}
      </div>

      {/* Create API Key Modal */}
      <Modal
        title={createStep === 1 ? "Create API key" : "Save your API key"}
        open={showCreateModal}
        onClose={closeCreateModal}
      >
        {createStep === 1 ? (
          <div className="vstack">
            <Input
              id="key-name"
              label="Key name"
              placeholder="e.g. Production, CI/CD"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />

            <div className="vstack" style={{ gap: 8 }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>
                Key type
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className={newKeyType === "server" ? "small" : "outline small"}
                  onClick={() => setNewKeyType("server")}
                >
                  <Key style={{ width: 14, height: 14, display: "inline", marginRight: 4 }} strokeWidth={1.5} />
                  Server key
                </button>
                <button
                  className={newKeyType === "client" ? "small" : "outline small"}
                  onClick={() => setNewKeyType("client")}
                >
                  <Key style={{ width: 14, height: 14, display: "inline", marginRight: 4 }} strokeWidth={1.5} />
                  Client key
                </button>
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {newKeyType === "server"
                  ? "Full read/write access"
                  : "Read-only (frontend/WebSocket)"}
              </p>
            </div>

            <button
              onClick={handleCreate}
              disabled={creating}
              style={{ width: "100%" }}
            >
              {creating ? "Creating..." : "Create key"}
            </button>
          </div>
        ) : (
          <div className="vstack">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              <AlertTriangle style={{ width: 20, height: 20, color: "var(--color-danger)", flexShrink: 0, marginTop: 2 }} strokeWidth={1.5} />
              <p style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>
                This key will only be shown once. Copy it now and store it
                securely.
              </p>
            </div>

            <div style={{
              background: "var(--color-elevated)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              padding: 12,
              fontFamily: "monospace",
              color: "var(--color-accent)",
              fontSize: "0.875rem",
              wordBreak: "break-all",
            }}>
              {createdRawKey}
            </div>

            <button className="outline" onClick={handleCopyKey} style={{ width: "100%" }}>
              {copied ? (
                <>
                  <Check style={{ width: 16, height: 16, display: "inline", marginRight: 4 }} strokeWidth={1.5} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy style={{ width: 16, height: 16, display: "inline", marginRight: 4 }} strokeWidth={1.5} />
                  Copy to clipboard
                </>
              )}
            </button>

            <button
              onClick={closeCreateModal}
              style={{ width: "100%" }}
            >
              I've saved my key
            </button>
          </div>
        )}
      </Modal>

      {/* Revoke Confirmation Modal */}
      <Modal
        title="Revoke API key"
        open={showRevokeConfirm !== null}
        onClose={() => setShowRevokeConfirm(null)}
      >
        <div className="vstack">
          <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <AlertTriangle style={{ width: 20, height: 20, color: "var(--color-danger)", flexShrink: 0, marginTop: 2 }} strokeWidth={1.5} />
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
              This action cannot be undone. Any services using this key will lose
              access.
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="outline" onClick={() => setShowRevokeConfirm(null)}>
              Cancel
            </button>
            <button
              data-variant="danger"
              onClick={handleRevoke}
              disabled={revoking}
            >
              {revoking ? "Revoking..." : "Revoke key"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
