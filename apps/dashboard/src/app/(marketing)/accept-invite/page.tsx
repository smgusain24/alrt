"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import NextLink from "next/link";
import { api } from "@/lib/api";
import { ArrowLeft } from "lucide-react";

type InviteInfo = {
  email: string;
  role: string;
  team_id: string;
};

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; invite: InviteInfo }
  | { status: "success" };

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [pageState, setPageState] = useState<PageState>({ status: "loading" });
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setPageState({ status: "error", message: "This invite link is invalid." });
      return;
    }

    api.invites
      .getInviteInfo(token)
      .then((info) => {
        setPageState({ status: "ready", invite: info });
      })
      .catch((err: any) => {
        const msg = err.message || "";
        if (msg.includes("already accepted") || msg.includes("already been used")) {
          setPageState({ status: "error", message: "This invite has already been used." });
        } else if (msg.includes("expired")) {
          setPageState({
            status: "error",
            message: "This invite has expired. Please ask your admin for a new invite.",
          });
        } else {
          setPageState({ status: "error", message: "This invite link is invalid." });
        }
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await api.invites.acceptInvite({
        token: token!,
        password,
        name: name || undefined,
      });
      setPageState({ status: "success" });
      window.location.href = "/workflows";
    } catch (err: any) {
      const msg = err.message || "Failed to accept invite";
      if (msg.includes("already exists")) {
        setError("An account with this email already exists. Please log in.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--color-background)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "448px", padding: "0 16px" }}>
        <NextLink
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "14px",
            color: "var(--color-text-muted)",
            marginBottom: "24px",
            textDecoration: "none",
          }}
        >
          <ArrowLeft size={14} /> Back to home
        </NextLink>

        <article className="card" style={{ padding: "32px" }}>
          {pageState.status === "loading" && (
            <div style={{ textAlign: "center" }}>
              <h2>Validating invite...</h2>
              <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
                Please wait while we verify your invitation.
              </p>
            </div>
          )}

          {pageState.status === "error" && (
            <div style={{ textAlign: "center" }}>
              <h2>Invite unavailable</h2>
              <p
                style={{
                  fontSize: "14px",
                  color: "#f87171",
                  marginBottom: "24px",
                }}
              >
                {pageState.message}
              </p>
              <NextLink href="/login">
                <button style={{ width: "100%" }}>Go to login</button>
              </NextLink>
            </div>
          )}

          {pageState.status === "success" && (
            <div style={{ textAlign: "center" }}>
              <h2>Welcome to alrt!</h2>
              <p style={{ fontSize: "14px", color: "var(--color-text-muted)" }}>
                Redirecting to dashboard...
              </p>
            </div>
          )}

          {pageState.status === "ready" && (
            <>
              <header>
                <h2>Join your team</h2>
              </header>
              <p
                style={{
                  fontSize: "14px",
                  color: "var(--color-text-muted)",
                  marginBottom: "24px",
                }}
              >
                Set up your account to get started with alrt.
              </p>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "24px",
                  padding: "12px",
                  background: "var(--color-background)",
                  borderRadius: "6px",
                  border: "1px solid var(--color-border)",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {pageState.invite.email}
                </span>
                <span className="badge">{pageState.invite.role}</span>
              </div>

              <form
                onSubmit={handleSubmit}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <label data-field>
                  Name (optional)
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                  />
                </label>
                <label data-field>
                  Password
                  <input
                    type="password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </label>
                <label data-field>
                  Confirm password
                  <input
                    type="password"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                </label>
                {error && (
                  <p style={{ color: "#f87171", fontSize: "14px", margin: 0 }}>
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  style={{ width: "100%" }}
                >
                  {loading ? "Joining..." : "Join Team"}
                </button>
              </form>

              <p
                style={{
                  marginTop: "16px",
                  fontSize: "14px",
                  textAlign: "center",
                  color: "var(--color-text-muted)",
                }}
              >
                Already have an account?{" "}
                <NextLink
                  href="/login"
                  style={{ color: "var(--color-accent)" }}
                >
                  Log in
                </NextLink>
              </p>
            </>
          )}
        </article>
      </div>
    </div>
  );
}
