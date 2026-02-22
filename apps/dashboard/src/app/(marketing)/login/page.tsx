"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RetroButton, BeveledInput, WindowCard, RetroLink } from "@/components/retro";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
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
    <div className="flex items-center justify-center min-h-screen bg-surface">
      <WindowCard title="LOG IN TO ALRT" className="max-w-md w-full">
        <form onSubmit={handleSubmit} className="space-y-4">
          <BeveledInput
            id="email"
            label="Email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
          <BeveledInput
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
            <div className="text-danger text-sm font-bold">{error}</div>
          )}
          <RetroButton
            type="submit"
            variant="accent"
            className="w-full"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Log In"}
          </RetroButton>
        </form>
        <p className="mt-4 text-sm text-center">
          Don&apos;t have an account?{" "}
          <RetroLink href="/signup">Sign up</RetroLink>
        </p>
      </WindowCard>
    </div>
  );
}
