"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RetroButton, BeveledInput, WindowCard, RetroLink } from "@/components/retro";
import { api } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api.auth.signup({ email, password, name, team_name: teamName });
      window.location.href = "/workflows";
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-surface">
      <WindowCard title="CREATE YOUR ACCOUNT" className="max-w-md w-full">
        <form onSubmit={handleSubmit} className="space-y-4">
          <BeveledInput
            id="team_name"
            label="Team Name"
            type="text"
            placeholder="Acme Inc."
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            required
            disabled={loading}
          />
          <BeveledInput
            id="name"
            label="Name"
            type="text"
            placeholder="Jane Doe"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={loading}
          />
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
            placeholder="Choose a password"
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
            {loading ? "Creating account..." : "Create Account"}
          </RetroButton>
        </form>
        <p className="mt-4 text-sm text-center">
          Already have an account?{" "}
          <RetroLink href="/login">Log in</RetroLink>
        </p>
      </WindowCard>
    </div>
  );
}
