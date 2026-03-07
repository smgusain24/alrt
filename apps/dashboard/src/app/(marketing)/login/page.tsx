"use client";

import { useState } from "react";
import NextLink from "next/link";
import { Button, Input } from "@/components/ui";
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md px-4">
        <NextLink
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> Back to home
        </NextLink>
        <div className="bg-surface border border-default rounded-lg p-8">
          <h2 className="text-xl font-semibold text-text-primary mb-6">Log in to alrt</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              label="Email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            <Input
              id="password"
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
            {error && (
              <div className="text-danger text-sm">{error}</div>
            )}
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log in"}
            </Button>
          </form>
          <p className="mt-4 text-sm text-center text-text-muted">
            Don&apos;t have an account?{" "}
            <NextLink href="/signup" className="text-accent hover:underline">Sign up</NextLink>
          </p>
        </div>
      </div>
    </div>
  );
}
