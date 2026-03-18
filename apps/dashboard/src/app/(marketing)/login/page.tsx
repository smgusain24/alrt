"use client";

import { useState } from "react";
import NextLink from "next/link";
import { api } from "@/lib/api";
import { ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.auth.login({ email, password });
      window.location.href = "/workflows";
    } catch (err: any) {
      setError(err.message || "Login failed");
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
          <header>
            <h2>Log in to ALRT</h2>
          </header>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <label data-field>
              Email
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </label>
            <label data-field>
              Password
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </label>
            {error && (
              <p style={{ color: "#f87171", fontSize: "14px", margin: 0 }}>
                {error}
              </p>
            )}
            <button type="submit" disabled={loading} style={{ width: "100%" }}>
              {loading ? "Logging in..." : "Log in"}
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
            Don&apos;t have an account?{" "}
            <NextLink href="/signup" style={{ color: "var(--color-accent)" }}>
              Sign up
            </NextLink>
          </p>
        </article>
      </div>
    </div>
  );
}
