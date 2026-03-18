"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import { Copy, Check, Trash2, UserPlus } from "lucide-react";
import { Badge, Table, Modal, Input } from "@/components/ui";
import { api } from "@/lib/api";

interface Member {
  id: string;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
  last_login_at: string | null;
  record_type: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [submitting, setSubmitting] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchMembers = useCallback(async (tid: string) => {
    try {
      const data = await api.invites.listMembers(tid);
      setMembers(data.members);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.auth.me().then((user: any) => {
      setTeamId(user.team_id);
      setIsAdmin(user.role === "admin");
      fetchMembers(user.team_id);
    }).catch(() => setLoading(false));
  }, [fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId || !inviteEmail.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.invites.create(teamId, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteUrl(res.invite_url);
      fetchMembers(teamId);
    } catch (err: any) {
      setError(err.message || "Failed to create invite");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (inviteId: string) => {
    if (!teamId) return;
    setRevoking(inviteId);
    try {
      await api.invites.delete(teamId, inviteId);
      fetchMembers(teamId);
    } catch {
      // silent
    } finally {
      setRevoking(null);
    }
  };

  const handleCopy = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeModal = () => {
    setModalOpen(false);
    setInviteEmail("");
    setInviteRole("viewer");
    setInviteUrl(null);
    setError(null);
  };

  const columns: { key: string; header: string; render?: (row: Member) => ReactNode }[] = [
    {
      key: "name",
      header: "Name",
      render: (row: Member) => (
        <span style={{ color: "var(--color-text-primary)" }}>
          {row.record_type === "invite" ? "Pending invite" : row.name || "\u2014"}
        </span>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (row: Member) => (
        <span style={{ color: "var(--color-text-secondary)" }}>{row.email}</span>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row: Member) => (
        <Badge variant="neutral">
          {row.role}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row: Member) =>
        row.record_type === "member" ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="warning">Pending</Badge>
        ),
    },
    ...(isAdmin
      ? [
          {
            key: "actions",
            header: "",
            render: (row: Member) =>
              row.record_type === "invite" ? (
                <button
                  data-variant="danger"
                  className="ghost small"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    handleRevoke(row.id);
                  }}
                  disabled={revoking === row.id}
                >
                  <Trash2 style={{ width: 14, height: 14, marginRight: 4 }} strokeWidth={1.5} />
                  {revoking === row.id ? "Revoking..." : "Revoke"}
                </button>
              ) : null,
          },
        ]
      : []),
  ];

  if (loading) {
    return (
      <div style={{ maxWidth: 768 }}>
        <div aria-busy="true" data-spinner="large"></div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 768 }} className="vstack">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h1 className="alrt-page-title">Team Members</h1>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginTop: 4 }}>
            Manage your team members and pending invites.
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setModalOpen(true)}>
            <UserPlus style={{ width: 16, height: 16, marginRight: 6 }} strokeWidth={1.5} />
            Invite Member
          </button>
        )}
      </div>

      {/* Members table */}
      {members.length === 0 ? (
        <div className="alrt-empty">
          No team members yet. Invite someone to get started.
        </div>
      ) : (
        <Table<Member> columns={columns} data={members} />
      )}

      {/* Invite Modal */}
      <Modal title="Invite Member" open={modalOpen} onClose={closeModal}>
        {inviteUrl ? (
          <div className="vstack">
            <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
              Share this link with the invitee:
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                readOnly
                value={inviteUrl}
                style={{
                  flex: 1,
                  background: "var(--color-background)",
                  color: "var(--color-text-primary)",
                  fontSize: "0.75rem",
                  fontFamily: "monospace",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              />
              <button
                className="outline"
                onClick={() => handleCopy(inviteUrl)}
                style={{ flexShrink: 0 }}
              >
                {copied ? (
                  <Check style={{ width: 16, height: 16, color: "var(--color-success)" }} strokeWidth={1.5} />
                ) : (
                  <Copy style={{ width: 16, height: 16 }} strokeWidth={1.5} />
                )}
              </button>
            </div>
            <button className="outline" onClick={closeModal} style={{ width: "100%" }}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="vstack">
            {error && (
              <aside style={{
                fontSize: "0.875rem",
                color: "var(--color-danger)",
                background: "rgba(239,68,68,0.1)",
                borderRadius: 6,
                padding: "8px 12px",
              }}>
                {error}
              </aside>
            )}
            <Input
              id="invite-email"
              label="Email address"
              type="email"
              required
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <label data-field>
              Role
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="viewer">Viewer</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <div style={{ display: "flex", gap: 8, paddingTop: 8 }}>
              <button
                type="button"
                className="outline"
                onClick={closeModal}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !inviteEmail.trim()}
                style={{ flex: 1 }}
              >
                {submitting ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
