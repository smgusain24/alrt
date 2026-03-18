"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
import { Mail, Bell, Smartphone, Shield, BarChart3, RefreshCw, Layers, ArrowRight } from "lucide-react";
import { SiWhatsapp, SiDiscord, SiTelegram } from "@icons-pack/react-simple-icons";

/* ==== Hero ==== */
function Hero() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("alrt_token"));
  }, []);

  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Floating nav — no background, sits over the Hermes art */}
      <nav
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "1.5rem 2rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-serif), Playfair Display, serif",
            fontWeight: 700,
            fontSize: "1.5rem",
            letterSpacing: "-0.025em",
            color: "#F5F5DC",
          }}
        >
          ALRT
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          {isLoggedIn ? (
            <>
              <Link href="/docs" style={{ color: "rgba(245, 245, 220, 0.6)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500 }}>
                Docs
              </Link>
              <Link href="/workflows" style={{ color: "rgba(245, 245, 220, 0.6)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500 }}>
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/docs" style={{ color: "rgba(245, 245, 220, 0.6)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500 }}>
                Docs
              </Link>
              <Link href="/login" style={{ color: "rgba(245, 245, 220, 0.6)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500 }}>
                Sign In
              </Link>
              <Link href="/signup" style={{ color: "rgba(245, 245, 220, 0.6)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500 }}>
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hermes background */}
      <div
        style={{
          position: "absolute",
          left: "-5%",
          bottom: "-5%",
          opacity: 0.15,
          width: "50%",
          pointerEvents: "none",
          zIndex: 1,
        }}
        className="hermes-bg"
      >
        <img src="/hermes.png" alt="" style={{ width: "100%", height: "auto" }} />
      </div>
      <div
        style={{
          position: "absolute",
          right: "-5%",
          bottom: "-5%",
          transform: "scaleX(-1)",
          opacity: 0.15,
          width: "50%",
          pointerEvents: "none",
          zIndex: 1,
        }}
        className="hermes-bg"
      >
        <img src="/hermes.png" alt="" style={{ width: "100%", height: "auto" }} />
      </div>

      {/* Hero content */}
      <div
        className="animate-fade-in"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 1.5rem",
          position: "relative",
          zIndex: 10,
          maxWidth: "56rem",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "0.25rem 0.75rem",
            borderRadius: "9999px",
            border: "1px solid rgba(211, 47, 47, 0.3)",
            background: "rgba(211, 47, 47, 0.08)",
            color: "#D32F2F",
            fontSize: "0.75rem",
            fontFamily: "var(--font-mono)",
            marginBottom: "2rem",
            letterSpacing: "0.05em",
          }}
        >
          8 CHANNELS &middot; ONE API KEY &middot; ZERO SETUP
        </div>

        <h1
          style={{
            fontFamily: "var(--font-serif), Playfair Display, serif",
            fontSize: "clamp(3rem, 7vw, 4.5rem)",
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: "1.5rem",
            color: "#F5F5DC",
          }}
        >
          Notification infrastructure{" "}
          <span style={{ fontStyle: "italic", color: "#D32F2F" }}>that just works.</span>
        </h1>

        <p
          style={{
            fontSize: "clamp(1.125rem, 2.5vw, 1.25rem)",
            color: "rgba(245, 245, 220, 0.6)",
            maxWidth: "42rem",
            margin: "0 auto 1.5rem",
            fontWeight: 300,
            lineHeight: 1.625,
          }}
        >
          Email, In-App, Slack, WhatsApp, Discord, Telegram, SMS, and Push &mdash; all from a single API call. No SendGrid account. No Twilio setup. No Slack app registration.
        </p>

        <p
          style={{
            fontSize: "1rem",
            color: "rgba(245, 245, 220, 0.4)",
            maxWidth: "36rem",
            margin: "0 auto 3rem",
            fontWeight: 300,
            lineHeight: 1.625,
          }}
        >
          ALRT owns the sending infrastructure. You just trigger events.
        </p>

        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
          <Link href="/signup" style={{ textDecoration: "none" }}>
            <button
              style={{
                background: "#D32F2F",
                color: "#fff",
                padding: "1rem 2rem",
                fontSize: "1.125rem",
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                transition: "all 150ms",
              }}
            >
              Start for free
            </button>
          </Link>
          <Link href="/docs" style={{ textDecoration: "none" }}>
            <button
              style={{
                background: "transparent",
                border: "1px solid rgba(245, 245, 220, 0.2)",
                color: "#F5F5DC",
                padding: "1rem 2rem",
                fontSize: "1.125rem",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 150ms",
              }}
            >
              Read the docs
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ==== Visual Workflow ==== */
function VisualWorkflow() {
  return (
    <section style={{ padding: "6rem 1.5rem", background: "rgba(30, 30, 30, 0.3)" }}>
      <div
        style={{
          maxWidth: "76rem",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "5fr 7fr",
          gap: "3rem",
          alignItems: "center",
        }}
      >
        {/* Text */}
        <div>
          <h4
            style={{
              color: "#D32F2F",
              fontFamily: "var(--font-mono)",
              fontSize: "0.875rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}
          >
            Visual Workflow Builder
          </h4>
          <h2
            style={{
              fontFamily: "var(--font-serif), Playfair Display, serif",
              fontSize: "clamp(2.25rem, 4vw, 3rem)",
              fontWeight: 700,
              fontStyle: "italic",
              lineHeight: 1.1,
              marginBottom: "1.5rem",
              color: "#F5F5DC",
            }}
          >
            Logic that lives outside your codebase.
          </h2>
          <p
            style={{
              color: "rgba(245, 245, 220, 0.7)",
              fontSize: "1.125rem",
              lineHeight: 1.625,
              marginBottom: "2rem",
            }}
          >
            Drag channels, add conditions and delays, connect the flow. Modify sequences and swap providers without a single code deploy.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[
              "Drag-and-drop with 8 channel types",
              "Conditional branching with 8 operators",
              "Delay nodes with persistent scheduling",
              "Undo/redo, keyboard shortcuts, validation",
            ].map((item) => (
              <li key={item} style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ color: "#D32F2F" }}>&#10003;</span>
                <span style={{ color: "#F5F5DC", fontSize: "0.9375rem" }}>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Workflow builder mockup */}
        <div
          style={{
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            overflow: "hidden",
            background: "#0a0a0b",
            boxShadow: "0 25px 60px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          {/* Builder toolbar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0.5rem 0.75rem",
              background: "#111113",
              borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "10px", color: "rgba(245, 245, 220, 0.3)", fontFamily: "var(--font-mono)" }}>&#8592; Workflows</span>
              <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.15)" }}>/</span>
              <span style={{ fontSize: "10px", color: "rgba(245, 245, 220, 0.6)", fontFamily: "var(--font-mono)", fontWeight: 600 }}>Order Confirmation</span>
            </div>
            <div style={{ display: "flex", gap: "0.375rem" }}>
              <span style={{ fontSize: "9px", color: "#22c55e", background: "rgba(34, 197, 94, 0.1)", padding: "2px 8px", borderRadius: "9999px", fontFamily: "var(--font-mono)", border: "1px solid rgba(34, 197, 94, 0.2)" }}>Published</span>
              <span style={{ fontSize: "9px", color: "rgba(245, 245, 220, 0.4)", background: "rgba(255,255,255,0.04)", padding: "2px 8px", borderRadius: "3px", fontFamily: "var(--font-mono)", border: "1px solid rgba(255,255,255,0.06)" }}>Save</span>
            </div>
          </div>

          {/* Canvas area with dot grid */}
          <div style={{ position: "relative", minHeight: "460px" }}>
            {/* Dot grid background */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
              <defs>
                <pattern id="dotgrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <circle cx="10" cy="10" r="0.7" fill="rgba(255, 255, 255, 0.08)" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#dotgrid)" />
            </svg>

            {/* Mini node palette (left) */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                bottom: 0,
                width: "36px",
                background: "rgba(17, 17, 19, 0.9)",
                borderRight: "1px solid rgba(255, 255, 255, 0.06)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                paddingTop: "12px",
                gap: "10px",
                zIndex: 5,
              }}
            >
              {[
                { color: "#D32F2F", icon: "⚡" },
                { color: "#3b82f6", icon: "✉" },
                { color: "#f59e0b", icon: "⏱" },
                { color: "#f43f5e", icon: "◇" },
              ].map((p, i) => (
                <div
                  key={i}
                  style={{
                    width: "22px",
                    height: "22px",
                    borderRadius: "4px",
                    border: `1px solid ${p.color}30`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    cursor: "default",
                    background: `${p.color}10`,
                  }}
                >
                  {p.icon}
                </div>
              ))}
            </div>

            {/* Workflow nodes */}
            <svg
              viewBox="0 0 440 370"
              style={{ width: "100%", height: "100%", position: "relative", zIndex: 2 }}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <marker id="arrowhead" viewBox="0 0 10 8" refX="9" refY="4" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 4 L 0 8 z" fill="rgba(255, 255, 255, 0.15)" />
                </marker>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Edge: Trigger → Condition */}
              <path d="M 240 62 L 240 90" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" markerEnd="url(#arrowhead)" />

              {/* Edge: Condition → Delay (yes) */}
              <path d="M 205 142 C 205 165, 155 165, 155 190" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
              <rect x="155" y="158" width="28" height="14" rx="3" fill="#0a0a0b" />
              <text x="169" y="168" fill="#22c55e" fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="600">yes</text>

              {/* Edge: Condition → Email Receipt (no) */}
              <path d="M 275 142 C 275 165, 340 165, 340 190" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
              <rect x="292" y="158" width="20" height="14" rx="3" fill="#0a0a0b" />
              <text x="302" y="168" fill="#ef4444" fontSize="8" fontFamily="var(--font-mono)" textAnchor="middle" fontWeight="600">no</text>

              {/* Edge: Delay → VIP Email */}
              <path d="M 120 242 C 120 265, 95 270, 95 290" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" markerEnd="url(#arrowhead)" />

              {/* Edge: Delay → Slack */}
              <path d="M 155 242 C 155 268, 220 268, 220 290" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" markerEnd="url(#arrowhead)" />

              {/* Edge: Delay → Push */}
              <path d="M 190 242 C 190 265, 345 270, 345 290" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" markerEnd="url(#arrowhead)" />


              {/* === NODES === */}

              {/* Trigger: order_placed */}
              <g>
                <rect x="170" y="20" width="140" height="42" rx="6" fill="#18181b" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <rect x="170" y="20" width="4" height="42" rx="2" fill="#D32F2F" />
                {/* Status dot */}
                <circle cx="300" cy="30" r="3" fill="#22c55e" />
                <text x="184" y="35" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="0.06em">TRIGGER</text>
                <text x="184" y="50" fill="#fafafa" fontSize="11" fontFamily="var(--font-mono)" fontWeight="600">order_placed</text>
                {/* Bottom handle */}
                <circle cx="240" cy="62" r="4" fill="#18181b" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              </g>

              {/* Condition: amount > $100 */}
              <g>
                <rect x="170" y="100" width="140" height="42" rx="6" fill="#18181b" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <rect x="170" y="100" width="4" height="42" rx="2" fill="#f43f5e" />
                <circle cx="300" cy="110" r="3" fill="#22c55e" />
                <text x="184" y="115" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="0.06em">CONDITION</text>
                <text x="184" y="130" fill="#fafafa" fontSize="11" fontFamily="var(--font-mono)" fontWeight="600">amount &gt; $100</text>
                {/* Top handle */}
                <circle cx="240" cy="100" r="4" fill="#18181b" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                {/* Bottom handles (two outputs) */}
                <circle cx="205" cy="142" r="4" fill="#18181b" stroke="#22c55e" strokeWidth="1.5" />
                <circle cx="275" cy="142" r="4" fill="#18181b" stroke="#ef4444" strokeWidth="1.5" />
              </g>

              {/* Delay: Wait 5 min */}
              <g>
                <rect x="85" y="200" width="140" height="42" rx="6" fill="#18181b" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <rect x="85" y="200" width="4" height="42" rx="2" fill="#a855f7" />
                <circle cx="215" cy="210" r="3" fill="#f59e0b" />
                <text x="99" y="215" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="0.06em">DELAY</text>
                <text x="99" y="230" fill="#fafafa" fontSize="11" fontFamily="var(--font-mono)" fontWeight="600">Wait 5 min</text>
                <circle cx="155" cy="200" r="4" fill="#18181b" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                <circle cx="120" cy="242" r="4" fill="#18181b" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                <circle cx="155" cy="242" r="4" fill="#18181b" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
                <circle cx="190" cy="242" r="4" fill="#18181b" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              </g>

              {/* Email: Receipt (no branch) */}
              <g>
                <rect x="275" y="200" width="130" height="42" rx="6" fill="#18181b" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <rect x="275" y="200" width="4" height="42" rx="2" fill="#3b82f6" />
                <circle cx="395" cy="210" r="3" fill="#22c55e" />
                <text x="289" y="215" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="0.06em">EMAIL</text>
                <text x="289" y="230" fill="#fafafa" fontSize="11" fontFamily="var(--font-mono)" fontWeight="600">Receipt</text>
                <circle cx="340" cy="200" r="4" fill="#18181b" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              </g>

              {/* VIP Welcome (Email) */}
              <g>
                <rect x="50" y="300" width="100" height="42" rx="6" fill="#18181b" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <rect x="50" y="300" width="4" height="42" rx="2" fill="#3b82f6" />
                <circle cx="140" cy="310" r="3" fill="#22c55e" />
                <text x="64" y="315" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="0.06em">EMAIL</text>
                <text x="64" y="330" fill="#fafafa" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">VIP Welcome</text>
                <circle cx="95" cy="300" r="4" fill="#18181b" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              </g>

              {/* Slack Alert */}
              <g>
                <rect x="170" y="300" width="100" height="42" rx="6" fill="#18181b" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <rect x="170" y="300" width="4" height="42" rx="2" fill="#f97316" />
                <circle cx="260" cy="310" r="3" fill="#22c55e" />
                <text x="184" y="315" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="0.06em">SLACK</text>
                <text x="184" y="330" fill="#fafafa" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">Team Alert</text>
                <circle cx="220" cy="300" r="4" fill="#18181b" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              </g>

              {/* Push Notify */}
              <g>
                <rect x="290" y="300" width="110" height="42" rx="6" fill="#18181b" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                <rect x="290" y="300" width="4" height="42" rx="2" fill="#ec4899" />
                <circle cx="390" cy="310" r="3" fill="#22c55e" />
                <text x="304" y="315" fill="rgba(255,255,255,0.35)" fontSize="8" fontFamily="var(--font-mono)" letterSpacing="0.06em">PUSH</text>
                <text x="304" y="330" fill="#fafafa" fontSize="10" fontFamily="var(--font-mono)" fontWeight="600">Mobile Alert</text>
                <circle cx="345" cy="300" r="4" fill="#18181b" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              </g>
            </svg>

            {/* Status bar (bottom) */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "24px",
                background: "rgba(17, 17, 19, 0.9)",
                borderTop: "1px solid rgba(255, 255, 255, 0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 10px",
                zIndex: 5,
              }}
            >
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-mono)" }}>7 nodes &middot; 6 edges</span>
              <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.25)", fontFamily: "var(--font-mono)" }}>&#8984;S to save &middot; Last saved 2m ago</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==== Channel Grid ==== */
const CHANNELS = [
  { label: "Email", desc: "Resend, ALRT-hosted", icon: <Mail size={28} strokeWidth={1.25} /> },
  { label: "In-App", desc: "WebSocket real-time", icon: <Bell size={28} strokeWidth={1.25} /> },
  { label: "SMS", desc: "Twilio + Kaleyra", icon: <Smartphone size={28} strokeWidth={1.25} /> },
  { label: "Push", desc: "FCM + APNs", icon: <Bell size={28} strokeWidth={1.25} /> },
  {
    label: "Slack",
    desc: "OAuth, Block Kit",
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
      </svg>
    ),
  },
  { label: "WhatsApp", desc: "Meta Cloud API", icon: <SiWhatsapp size={28} /> },
  { label: "Discord", desc: "Webhook embeds", icon: <SiDiscord size={28} /> },
  { label: "Telegram", desc: "Bot API", icon: <SiTelegram size={28} /> },
];

function Channels() {
  return (
    <section style={{ padding: "6rem 1.5rem" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h4
            style={{
              color: "#D32F2F",
              fontFamily: "var(--font-mono)",
              fontSize: "0.875rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}
          >
            Channels
          </h4>
          <h2
            style={{
              fontFamily: "var(--font-serif), Playfair Display, serif",
              fontSize: "clamp(2.25rem, 4vw, 3rem)",
              fontWeight: 700,
              fontStyle: "italic",
              color: "#F5F5DC",
              marginBottom: "1rem",
            }}
          >
            Eight channels. Zero accounts to create.
          </h2>
          <p style={{ color: "rgba(245, 245, 220, 0.5)", fontSize: "1.0625rem", maxWidth: "36rem", margin: "0 auto" }}>
            ALRT owns the sending infrastructure. Your team sends from day one without registering with any provider.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
          {CHANNELS.map((ch) => (
            <div
              key={ch.label}
              className="glass-card"
              style={{
                padding: "1.75rem",
                textAlign: "center",
                transition: "border-color 150ms",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(211, 47, 47, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(245, 245, 220, 0.1)";
              }}
            >
              <div style={{ marginBottom: "0.75rem", color: "rgba(245, 245, 220, 0.6)" }}>{ch.icon}</div>
              <div
                style={{
                  fontSize: "0.8125rem",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "#F5F5DC",
                  marginBottom: "0.25rem",
                }}
              >
                {ch.label}
              </div>
              <div style={{ fontSize: "0.75rem", color: "rgba(245, 245, 220, 0.35)" }}>{ch.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==== Developer Experience ==== */
function DeveloperExperience() {
  return (
    <section style={{ padding: "6rem 1.5rem", background: "rgba(30, 30, 30, 0.2)" }}>
      <div
        style={{
          maxWidth: "76rem",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "7fr 5fr",
          gap: "3rem",
          alignItems: "center",
        }}
      >
        {/* Code block */}
        <div>
          <div
            style={{
              borderRadius: "0.5rem",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              background: "#0d0d0d",
              fontFamily: "var(--font-mono)",
              fontSize: "0.9375rem",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            }}
          >
            {/* Window chrome */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                background: "#121212",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ef4444" }} />
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#eab308" }} />
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#22c55e" }} />
              <span
                style={{
                  marginLeft: "1rem",
                  fontSize: "10px",
                  color: "rgba(245, 245, 220, 0.4)",
                  textTransform: "uppercase",
                }}
              >
                POST /events/trigger
              </span>
            </div>

            {/* Code */}
            <div style={{ padding: "1.5rem", overflowX: "auto" }}>
              <pre style={{ margin: 0, background: "transparent", lineHeight: 1.8 }}>
                <code style={{ background: "transparent" }}>
                  <span style={{ color: "rgba(245, 245, 220, 0.35)" }}>{"// One call. Eight channels."}</span>
                  {"\n"}
                  <span style={{ color: "#D32F2F" }}>await</span>
                  {" "}
                  <span style={{ color: "#60a5fa" }}>fetch</span>
                  {"("}
                  <span style={{ color: "#4ade80" }}>{`'https://api.alrt.dev/events/trigger'`}</span>
                  {", {"}
                  {"\n  method: "}
                  <span style={{ color: "#4ade80" }}>{`'POST'`}</span>
                  {","}
                  {"\n  headers: {"}
                  {"\n    "}
                  <span style={{ color: "#4ade80" }}>{`'Authorization'`}</span>
                  {": "}
                  <span style={{ color: "#4ade80" }}>{`'Bearer alrt_sk_...'`}</span>
                  {","}
                  {"\n    "}
                  <span style={{ color: "#4ade80" }}>{`'Content-Type'`}</span>
                  {": "}
                  <span style={{ color: "#4ade80" }}>{`'application/json'`}</span>
                  {"\n  },"}
                  {"\n  body: JSON.stringify({"}
                  {"\n    workflow: "}
                  <span style={{ color: "#4ade80" }}>{`'order_placed'`}</span>
                  {","}
                  {"\n    subscriber: {"}
                  {"\n      id: "}
                  <span style={{ color: "#4ade80" }}>{`'usr_123'`}</span>
                  {","}
                  {"\n      email: "}
                  <span style={{ color: "#4ade80" }}>{`'jane@example.com'`}</span>
                  {"\n    },"}
                  {"\n    payload: {"}
                  {"\n      item: "}
                  <span style={{ color: "#4ade80" }}>{`'Mechanical Keyboard'`}</span>
                  {","}
                  {"\n      price: "}
                  <span style={{ color: "#fb923c" }}>599</span>
                  {"\n    }"}
                  {"\n  })"}
                  {"\n});"}
                </code>
              </pre>
            </div>
          </div>
        </div>

        {/* Text */}
        <div>
          <h4
            style={{
              color: "#D32F2F",
              fontFamily: "var(--font-mono)",
              fontSize: "0.875rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}
          >
            Developer First
          </h4>
          <h2
            style={{
              fontFamily: "var(--font-serif), Playfair Display, serif",
              fontSize: "clamp(2.25rem, 4vw, 3rem)",
              fontWeight: 700,
              fontStyle: "italic",
              marginBottom: "1.5rem",
              color: "#F5F5DC",
            }}
          >
            Integrate in minutes, not months.
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {[
              {
                title: "Inline subscriber upsert",
                desc: "Pass subscriber data with every trigger. No pre-registration step. We create or update on the fly.",
              },
              {
                title: "Bulk trigger API",
                desc: "Send to millions. Fan out across dedicated per-channel queues with automatic retries. Built to scale with you.",
              },
              {
                title: "Scheduled delivery",
                desc: "Schedule notifications for any future time. No cron jobs, no external schedulers. Just pass a timestamp.",
              },
            ].map((item) => (
              <li
                key={item.title}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  borderLeft: "2px solid rgba(211, 47, 47, 0.5)",
                  paddingLeft: "1rem",
                }}
              >
                <div>
                  <strong style={{ display: "block", marginBottom: "0.25rem", color: "#F5F5DC", fontSize: "0.9375rem" }}>
                    {item.title}
                  </strong>
                  <p style={{ color: "rgba(245, 245, 220, 0.5)", fontSize: "0.875rem", margin: 0, lineHeight: 1.5 }}>
                    {item.desc}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ==== Capabilities ==== */
const CAPABILITIES = [
  {
    icon: <Layers size={20} strokeWidth={1.5} />,
    tag: "Isolation",
    title: "Per-Channel Queues",
    desc: "Every channel runs on a dedicated queue. Scale each independently. A Slack outage never blocks your email delivery.",
  },
  {
    icon: <BarChart3 size={20} strokeWidth={1.5} />,
    tag: "Observability",
    title: "Activity Feed + Analytics",
    desc: "Real-time delivery log, per-channel breakdown, failure rates. 90-day retention included.",
  },
  {
    icon: <RefreshCw size={20} strokeWidth={1.5} />,
    tag: "Reliability",
    title: "Dead Letter Queue",
    desc: "Failed notifications captured automatically. Inspect errors and retry with one click.",
  },
  {
    icon: <Shield size={20} strokeWidth={1.5} />,
    tag: "Infrastructure",
    title: "Smart Retries",
    desc: "Per-channel retry policies with exponential backoff and jitter. Transient failures handled automatically.",
  },
];

function Capabilities() {
  return (
    <section style={{ padding: "6rem 1.5rem" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h4
            style={{
              color: "#D32F2F",
              fontFamily: "var(--font-mono)",
              fontSize: "0.875rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}
          >
            Infrastructure
          </h4>
          <h2
            style={{
              fontFamily: "var(--font-serif), Playfair Display, serif",
              fontSize: "clamp(2.25rem, 4vw, 3rem)",
              fontWeight: 700,
              fontStyle: "italic",
              color: "#F5F5DC",
            }}
          >
            Built to scale to millions.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem" }}>
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.title}
              className="glass-card"
              style={{
                padding: "2rem",
                borderLeft: "2px solid rgba(211, 47, 47, 0.4)",
              }}
            >
              <div style={{ color: "#D32F2F", marginBottom: "1rem" }}>{cap.icon}</div>
              <h5
                style={{
                  color: "rgba(245, 245, 220, 0.4)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "0.75rem",
                }}
              >
                {cap.tag}
              </h5>
              <h3
                style={{
                  fontFamily: "var(--font-serif), Playfair Display, serif",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  marginBottom: "0.75rem",
                  color: "#F5F5DC",
                }}
              >
                {cap.title}
              </h3>
              <p style={{ color: "rgba(245, 245, 220, 0.5)", fontSize: "0.875rem", lineHeight: 1.625, margin: 0 }}>
                {cap.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==== Pricing ==== */
const PLANS = [
  {
    name: "Free",
    price: "0",
    period: "forever",
    quota: "10,000",
    features: [
      "All 8 channels",
      "Visual workflow builder",
      "Activity feed + analytics",
      "Dead letter queue + retry",
      "Team members + roles",
      "Community support",
    ],
    cta: "Start for free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "49",
    period: "/mo",
    quota: "100,000",
    features: [
      "Everything in Free",
      "Custom email sending domain",
      "BYOC for any channel",
      "Priority email support",
      "90-day log retention",
      "Soft quota (no hard blocks)",
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
  {
    name: "Scale",
    price: "249",
    period: "/mo",
    quota: "1,000,000",
    features: [
      "Everything in Pro",
      "Full white-label (all channels)",
      "Dedicated support",
      "Custom integrations",
      "SLA guarantees",
      "Volume discounts",
    ],
    cta: "Talk to us",
    highlighted: false,
  },
];

function Pricing() {
  return (
    <section style={{ padding: "6rem 1.5rem", background: "rgba(30, 30, 30, 0.2)" }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "4rem" }}>
          <h4
            style={{
              color: "#D32F2F",
              fontFamily: "var(--font-mono)",
              fontSize: "0.875rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "1rem",
            }}
          >
            Pricing
          </h4>
          <h2
            style={{
              fontFamily: "var(--font-serif), Playfair Display, serif",
              fontSize: "clamp(2.25rem, 4vw, 3rem)",
              fontWeight: 700,
              fontStyle: "italic",
              color: "#F5F5DC",
              marginBottom: "1rem",
            }}
          >
            Simple, transparent pricing.
          </h2>
          <p style={{ color: "rgba(245, 245, 220, 0.5)", fontSize: "1.0625rem", maxWidth: "32rem", margin: "0 auto" }}>
            Start free. Scale as you grow. Pay for white-label when you need your own brand.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1.5rem",
            maxWidth: "64rem",
            margin: "0 auto",
          }}
        >
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="glass-card"
              style={{
                padding: "2.5rem",
                borderRadius: "0.75rem",
                border: plan.highlighted
                  ? "1px solid rgba(211, 47, 47, 0.5)"
                  : "1px solid rgba(245, 245, 220, 0.08)",
                position: "relative",
              }}
            >
              {plan.highlighted && (
                <div
                  style={{
                    position: "absolute",
                    top: "-0.75rem",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "#D32F2F",
                    color: "#fff",
                    fontSize: "10px",
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    padding: "0.25rem 0.75rem",
                    borderRadius: "9999px",
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Most Popular
                </div>
              )}
              <h3
                style={{
                  fontFamily: "var(--font-serif), Playfair Display, serif",
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  marginBottom: "0.5rem",
                  color: "#F5F5DC",
                }}
              >
                {plan.name}
              </h3>
              <div style={{ marginBottom: "0.5rem" }}>
                <span
                  style={{
                    fontFamily: "var(--font-serif), Playfair Display, serif",
                    fontSize: "2.5rem",
                    fontWeight: 700,
                    color: "#F5F5DC",
                  }}
                >
                  ${plan.price}
                </span>
                <span style={{ color: "rgba(245, 245, 220, 0.5)", fontSize: "0.875rem" }}>{plan.period}</span>
              </div>
              <p style={{ color: "rgba(245, 245, 220, 0.5)", fontSize: "0.875rem", marginBottom: "2rem" }}>
                Up to {plan.quota} notifications/month
              </p>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "0 0 2rem 0",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {plan.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.875rem" }}>
                    <span style={{ color: "#D32F2F", fontWeight: 700 }}>&#10003;</span>
                    <span style={{ color: "rgba(245, 245, 220, 0.7)" }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/signup" style={{ textDecoration: "none" }}>
                <button
                  style={{
                    width: "100%",
                    padding: "0.875rem",
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    border: "none",
                    borderRadius: "2px",
                    cursor: "pointer",
                    transition: "all 150ms",
                    background: plan.highlighted ? "#D32F2F" : "rgba(255, 255, 255, 0.05)",
                    color: plan.highlighted ? "#fff" : "#F5F5DC",
                    ...(plan.highlighted ? {} : { border: "1px solid rgba(245, 245, 220, 0.1)" }),
                  }}
                >
                  {plan.cta}
                </button>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==== CTA ==== */
function CTASection() {
  return (
    <section style={{ padding: "6rem 1.5rem", position: "relative", overflow: "visible" }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 0,
          transform: "translateX(-50%)",
          opacity: 0.08,
          pointerEvents: "none",
          width: "100%",
          maxWidth: "42rem",
        }}
      >
        <img src="/hermes_final.png" alt="" style={{ width: "100%", height: "auto", display: "block" }} />
      </div>

      <div
        className="glass-card"
        style={{
          maxWidth: "48rem",
          margin: "0 auto",
          padding: "5rem",
          textAlign: "center",
          borderRadius: "1rem",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          position: "relative",
          zIndex: 10,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-serif), Playfair Display, serif",
            fontSize: "clamp(2.25rem, 4vw, 3rem)",
            fontWeight: 700,
            fontStyle: "italic",
            marginBottom: "1.5rem",
            color: "#F5F5DC",
          }}
        >
          Ship your first notification in 15 minutes.
        </h2>
        <p
          style={{
            color: "rgba(245, 245, 220, 0.6)",
            fontSize: "1.0625rem",
            marginBottom: "3rem",
            maxWidth: "480px",
            margin: "0 auto 3rem",
            lineHeight: 1.625,
          }}
        >
          Sign up, grab your API key, trigger an event. ALRT handles the rest &mdash; routing, delivery, retries, tracking.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/signup" style={{ textDecoration: "none" }}>
            <button
              style={{
                background: "#D32F2F",
                color: "#fff",
                padding: "1rem 2.5rem",
                fontWeight: 700,
                borderRadius: "2px",
                border: "none",
                cursor: "pointer",
                transition: "all 150ms",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              Get started free <ArrowRight size={18} />
            </button>
          </Link>
          <Link href="/docs" style={{ textDecoration: "none" }}>
            <button
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#fff",
                padding: "1rem 2.5rem",
                fontWeight: 700,
                borderRadius: "2px",
                cursor: "pointer",
                transition: "all 150ms",
              }}
            >
              Explore the API
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ==== Footer ==== */
function Footer() {
  return (
    <footer
      style={{
        background: "#0d0d0d",
        borderTop: "1px solid rgba(255, 255, 255, 0.05)",
        padding: "5rem 1.5rem 2.5rem",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2.5fr 1fr 1fr 1fr",
            gap: "3rem",
            marginBottom: "4rem",
          }}
        >
          {/* Brand column */}
          <div>
            <span
              style={{
                fontFamily: "var(--font-serif), Playfair Display, serif",
                fontWeight: 700,
                fontSize: "1.25rem",
                letterSpacing: "-0.025em",
                color: "#F5F5DC",
                display: "block",
                marginBottom: "1rem",
              }}
            >
              ALRT
            </span>
            <p
              style={{
                color: "rgba(245, 245, 220, 0.35)",
                fontSize: "0.875rem",
                lineHeight: 1.625,
                maxWidth: "18rem",
                margin: "0 0 1.5rem 0",
              }}
            >
              Notification infrastructure for startups. One API key, eight channels, zero maintenance.
            </p>
            {/* Social icons */}
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <a
                href="https://github.com/alrt-dev"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "rgba(245, 245, 220, 0.3)", transition: "color 150ms" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.646.64.699 1.028 1.592 1.028 2.683 0 3.842-2.337 4.687-4.565 4.935.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.137 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </a>
              <a
                href="https://x.com/alrtdev"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "rgba(245, 245, 220, 0.3)", transition: "color 150ms" }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h6
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                marginBottom: "1.25rem",
                color: "#D32F2F",
              }}
            >
              Product
            </h6>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {[
                { label: "Documentation", href: "/docs" },
                { label: "Channels", href: "/docs#channels" },
                { label: "Workflow Builder", href: "/docs#workflows" },
                { label: "Pricing", href: "#pricing" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} style={{ color: "rgba(245, 245, 220, 0.4)", textDecoration: "none", fontSize: "0.875rem", transition: "color 150ms" }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Developers */}
          <div>
            <h6
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                marginBottom: "1.25rem",
                color: "#D32F2F",
              }}
            >
              Developers
            </h6>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {[
                { label: "API Reference", href: "/docs" },
                { label: "Quickstart", href: "/docs#quickstart" },
                { label: "Status", href: "#" },
                { label: "Changelog", href: "#" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} style={{ color: "rgba(245, 245, 220, 0.4)", textDecoration: "none", fontSize: "0.875rem", transition: "color 150ms" }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h6
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                marginBottom: "1.25rem",
                color: "#D32F2F",
              }}
            >
              Company
            </h6>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {[
                { label: "About", href: "#" },
                { label: "Privacy Policy", href: "#" },
                { label: "Terms of Service", href: "#" },
              ].map((link) => (
                <li key={link.label}>
                  <Link href={link.href} style={{ color: "rgba(245, 245, 220, 0.4)", textDecoration: "none", fontSize: "0.875rem", transition: "color 150ms" }}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "1.5rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.04)",
          }}
        >
          <p
            style={{
              fontSize: "0.75rem",
              fontFamily: "var(--font-mono)",
              color: "rgba(245, 245, 220, 0.2)",
              letterSpacing: "0.025em",
              margin: 0,
            }}
          >
            &copy; {new Date().getFullYear()} Alrt. All rights reserved.
          </p>
          <p
            style={{
              fontSize: "0.75rem",
              color: "rgba(245, 245, 220, 0.2)",
              margin: 0,
              fontFamily: "var(--font-mono)",
            }}
          >
            Built for developers who ship.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ==== Page ==== */
export default function LandingPage() {
  return (
    <main
      style={{
        background: "#121212",
        color: "#F5F5DC",
        fontFamily: "var(--font-sans)",
        minHeight: "100vh",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <Hero />
      <VisualWorkflow />
      <Channels />
      <DeveloperExperience />
      <Capabilities />
      <Pricing />
      <CTASection />
      <Footer />
    </main>
  );
}
