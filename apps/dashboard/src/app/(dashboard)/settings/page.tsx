"use client";

import { useState, useEffect, useCallback } from "react";
import {
  RetroButton,
  RetroTable,
  Badge,
  GrooveDivider,
  WindowCard,
  BeveledInput,
  RetroModal,
} from "@/components/retro";
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
        <span className="font-bold text-sm">
          {row.name || <span className="text-muted">Unnamed</span>}
        </span>
      ),
    },
    {
      key: "key_prefix",
      header: "Key Prefix",
      render: (row: ApiKeyRow) => (
        <code className="font-mono text-xs bg-row-alt px-1.5 py-0.5 bevel-inset">
          {row.key_prefix}
        </code>
      ),
    },
    {
      key: "key_type",
      header: "Type",
      render: (row: ApiKeyRow) => (
        <Badge variant={row.key_type === "server" ? "new" : "warning"}>
          {row.key_type}
        </Badge>
      ),
    },
    {
      key: "is_active",
      header: "Status",
      render: (row: ApiKeyRow) => (
        <Badge variant={row.is_active ? "success" : "default"}>
          {row.is_active ? "active" : "revoked"}
        </Badge>
      ),
    },
    {
      key: "last_used_at",
      header: "Last Used",
      render: (row: ApiKeyRow) => (
        <span className="font-mono text-xs text-muted">
          {row.last_used_at ? relativeDate(row.last_used_at) : "Never"}
        </span>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (row: ApiKeyRow) => (
        <span className="font-mono text-xs text-muted">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row: ApiKeyRow) => (
        <RetroButton
          variant="danger"
          className="!px-2 !py-1 !text-xs"
          disabled={!row.is_active}
          onClick={(e) => {
            e.stopPropagation();
            setShowRevokeConfirm(row.id);
          }}
        >
          <Trash2 className="w-3.5 h-3.5 inline mr-1" strokeWidth={2} />
          Revoke
        </RetroButton>
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl uppercase">
          Settings — API Keys
        </h1>
        <RetroButton variant="accent" onClick={openCreateModal}>
          <Plus className="w-4 h-4 inline mr-1" strokeWidth={2} />
          Create API Key
        </RetroButton>
      </div>

      <p className="text-foreground mb-4">
        API keys authenticate requests to the Alrt API. Server keys have full
        access. Client keys are read-only.
      </p>

      <GrooveDivider />

      <div className="mt-4">
        {loading ? (
          <p className="text-muted">Loading API keys...</p>
        ) : error ? (
          <WindowCard title="Error">
            <p className="text-red-500">{error}</p>
          </WindowCard>
        ) : (
          <RetroTable<ApiKeyRow> columns={columns} data={apiKeys} />
        )}
      </div>

      {/* Create API Key Modal */}
      <RetroModal
        title={createStep === 1 ? "CREATE API KEY" : "SAVE YOUR API KEY"}
        open={showCreateModal}
        onClose={closeCreateModal}
      >
        {createStep === 1 ? (
          <div className="flex flex-col gap-4">
            <BeveledInput
              id="key-name"
              label="Key Name"
              placeholder="e.g. Production, CI/CD"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />

            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wide text-foreground">
                Key Type
              </span>
              <div className="flex gap-2">
                <RetroButton
                  variant={newKeyType === "server" ? "accent" : "default"}
                  className={newKeyType === "server" ? "bevel-inset" : ""}
                  onClick={() => setNewKeyType("server")}
                >
                  <Key className="w-3.5 h-3.5 inline mr-1" strokeWidth={2} />
                  Server Key
                </RetroButton>
                <RetroButton
                  variant={newKeyType === "client" ? "accent" : "default"}
                  className={newKeyType === "client" ? "bevel-inset" : ""}
                  onClick={() => setNewKeyType("client")}
                >
                  <Key className="w-3.5 h-3.5 inline mr-1" strokeWidth={2} />
                  Client Key
                </RetroButton>
              </div>
              <p className="text-xs text-muted">
                {newKeyType === "server"
                  ? "Full read/write access"
                  : "Read-only (frontend/WebSocket)"}
              </p>
            </div>

            <RetroButton
              variant="accent"
              onClick={handleCreate}
              disabled={creating}
              className="w-full"
            >
              {creating ? "Creating..." : "Create Key"}
            </RetroButton>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" strokeWidth={2} />
              <p className="text-danger font-bold text-sm">
                This key will only be shown once. Copy it now and store it
                securely.
              </p>
            </div>

            <div className="bevel-inset bg-navy p-4 break-all">
              <code className="font-mono text-sm text-[#00ff00]">
                {createdRawKey}
              </code>
            </div>

            <RetroButton onClick={handleCopyKey} className="w-full">
              {copied ? (
                <>
                  <Check className="w-4 h-4 inline mr-1" strokeWidth={2} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 inline mr-1" strokeWidth={2} />
                  Copy to Clipboard
                </>
              )}
            </RetroButton>

            <RetroButton
              variant="accent"
              className="w-full"
              onClick={closeCreateModal}
            >
              I've Saved My Key
            </RetroButton>
          </div>
        )}
      </RetroModal>

      {/* Revoke Confirmation Modal */}
      <RetroModal
        title="REVOKE API KEY"
        open={showRevokeConfirm !== null}
        onClose={() => setShowRevokeConfirm(null)}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" strokeWidth={2} />
            <p className="text-sm">
              This action cannot be undone. Any services using this key will lose
              access.
            </p>
          </div>

          <div className="flex gap-2 justify-end">
            <RetroButton onClick={() => setShowRevokeConfirm(null)}>
              Cancel
            </RetroButton>
            <RetroButton
              variant="danger"
              onClick={handleRevoke}
              disabled={revoking}
            >
              {revoking ? "Revoking..." : "Revoke Key"}
            </RetroButton>
          </div>
        </div>
      </RetroModal>
    </div>
  );
}
