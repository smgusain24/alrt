"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
/* eslint-disable @next/next/no-img-element */
import { Mail, Bell, Smartphone } from "lucide-react";
import { SiWhatsapp, SiDiscord, SiTelegram } from "@icons-pack/react-simple-icons";

/* ==== Navigation ==== */
function Nav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("alrt_token"));
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(18, 18, 18, 0.9)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      }}
    >
      <nav
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "0 1.5rem",
          height: "80px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          {isLoggedIn ? (
            <Link href="/workflows">
              <button
                style={{
                  background: "#D32F2F",
                  color: "#fff",
                  padding: "0.625rem 1.5rem",
                  borderRadius: "2px",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 150ms",
                }}
              >
                Dashboard
              </button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <button
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    color: "#F5F5DC",
                    cursor: "pointer",
                    transition: "color 150ms",
                  }}
                >
                  Sign In
                </button>
              </Link>
              <Link href="/signup">
                <button
                  style={{
                    background: "#D32F2F",
                    color: "#fff",
                    padding: "0.625rem 1.5rem",
                    borderRadius: "2px",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 150ms",
                  }}
                >
                  Get Started
                </button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

/* ==== Hero ==== */
function Hero() {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "0 1.5rem",
      }}
    >
      {/* Hermes figures — full height, positioned lower behind text */}
      <div
        style={{
          position: "absolute",
          left: "-5%",
          bottom: "-5%",
          opacity: 0.2,
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
          opacity: 0.2,
          width: "50%",
          pointerEvents: "none",
          zIndex: 1,
        }}
        className="hermes-bg"
      >
        <img src="/hermes.png" alt="" style={{ width: "100%", height: "auto" }} />
      </div>

      <div
        className="animate-fade-in"
        style={{ position: "relative", zIndex: 10, maxWidth: "56rem", margin: "0 auto" }}
      >
        {/* Badge
        <div
          style={{
            display: "inline-block",
            padding: "0.25rem 0.75rem",
            borderRadius: "9999px",
            border: "1px solid rgba(211, 47, 47, 0.3)",
            background: "rgba(211, 47, 47, 0.1)",
            color: "#D32F2F",
            fontSize: "0.75rem",
            fontFamily: "var(--font-mono)",
            marginBottom: "2rem",
          }}
        >
          V2.0 STABLE RELEASE
        </div> */}

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
          Notification infrastructure <br />
          <span style={{ fontStyle: "italic", color: "#D32F2F" }}>for startups.</span>
        </h1>

        <p
          style={{
            fontSize: "clamp(1.125rem, 2.5vw, 1.25rem)",
            color: "rgba(245, 245, 220, 0.6)",
            maxWidth: "42rem",
            margin: "0 auto 3rem",
            fontWeight: 300,
            lineHeight: 1.625,
          }}
        >
          One API for Email, In-app, Slack, and many other channels. High performance delivery logic, built-in observability, zero maintenance.
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
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
                Start shipping for free
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
                View the docs
              </button>
            </Link>
          </div>
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
          maxWidth: "64rem",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4rem",
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
            Visual Workflow
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
            Decouple your notification triggers from your business logic. Modify sequences, add delays, and change providers without a single code deploy.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1rem" }}>
            <li style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ color: "#D32F2F" }}>&#10003;</span>
              <span style={{ color: "#F5F5DC" }}>Drag-and-drop sequencing</span>
            </li>
            <li style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ color: "#D32F2F" }}>&#10003;</span>
              <span style={{ color: "#F5F5DC" }}>Smart conditional branching</span>
            </li>
          </ul>
        </div>

        {/* Workflow diagram */}
        <div
          className="glass-card"
          style={{ padding: "2rem", borderRadius: "0.75rem", border: "1px solid rgba(255, 255, 255, 0.05)" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", position: "relative" }}>
            {/* Connection line */}
            <div
              style={{
                position: "absolute",
                left: "1.5rem",
                top: "2.5rem",
                bottom: "2.5rem",
                width: "1px",
                background: "rgba(211, 47, 47, 0.3)",
              }}
            />

            {/* Trigger */}
            <div
              style={{
                position: "relative",
                background: "#121212",
                padding: "1rem",
                borderRadius: "4px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                marginLeft: "3rem",
              }}
            >
              <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "rgba(245, 245, 220, 0.4)", textTransform: "uppercase", marginBottom: "4px" }}>
                Trigger
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "#F5F5DC" }}>order_created</div>
              <div
                style={{
                  position: "absolute",
                  left: "-2.4rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "1rem",
                  height: "1rem",
                  borderRadius: "50%",
                  background: "#D32F2F",
                  border: "4px solid #121212",
                }}
              />
            </div>

            {/* Step */}
            <div
              style={{
                position: "relative",
                background: "#121212",
                padding: "1rem",
                borderRadius: "4px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                marginLeft: "3rem",
              }}
            >
              <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "rgba(245, 245, 220, 0.4)", textTransform: "uppercase", marginBottom: "4px" }}>
                Step
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "#F5F5DC", fontStyle: "italic" }}>
                If price &gt; $500
              </div>
              <div
                style={{
                  position: "absolute",
                  left: "-2.4rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "1rem",
                  height: "1rem",
                  borderRadius: "50%",
                  background: "rgba(245, 245, 220, 0.2)",
                  border: "4px solid #121212",
                }}
              />
            </div>

            {/* Action */}
            <div
              style={{
                position: "relative",
                background: "#D32F2F",
                padding: "1rem",
                borderRadius: "4px",
                border: "1px solid rgba(211, 47, 47, 0.5)",
                marginLeft: "3rem",
                boxShadow: "0 10px 15px -3px rgba(211, 47, 47, 0.2)",
              }}
            >
              <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "rgba(255, 255, 255, 0.6)", textTransform: "uppercase", marginBottom: "4px" }}>
                Action
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem", color: "#fff", fontWeight: 700 }}>
                Send VIP Email
              </div>
              <div
                style={{
                  position: "absolute",
                  left: "-2.4rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "1rem",
                  height: "1rem",
                  borderRadius: "50%",
                  background: "#D32F2F",
                  border: "4px solid #121212",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ==== Channel Grid ==== */
const CHANNELS = [
  { label: "Email", icon: <Mail size={36} strokeWidth={1.25} /> },
  { label: "In-App", icon: <Bell size={36} strokeWidth={1.25} /> },
  { label: "SMS", icon: <Smartphone size={36} strokeWidth={1.25} /> },
  { label: "Push", icon: <Bell size={36} strokeWidth={1.25} /> },
  { label: "Slack", icon: <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor"><path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.122 2.521a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zm-2.523 10.122a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/></svg> },
  { label: "WhatsApp", icon: <SiWhatsapp size={36} /> },
  { label: "Discord", icon: <SiDiscord size={36} /> },
  { label: "Telegram", icon: <SiTelegram size={36} /> },
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
            Integrations
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
            Omnichannel by default.
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
          }}
        >
          {CHANNELS.map((ch) => (
            <div
              key={ch.label}
              className="glass-card"
              style={{
                padding: "2rem",
                textAlign: "center",
                transition: "border-color 150ms",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(211, 47, 47, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(245, 245, 220, 0.1)";
              }}
            >
              <div style={{ marginBottom: "1rem", color: "rgba(245, 245, 220, 0.6)" }}>{ch.icon}</div>
              <div
                style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#F5F5DC",
                }}
              >
                {ch.label}
              </div>
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
          maxWidth: "64rem",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4rem",
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
              fontSize: "0.875rem",
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
                POST /v1/events/trigger
              </span>
            </div>

            {/* Code */}
            <div style={{ padding: "1.5rem", overflowX: "auto" }}>
              <pre style={{ margin: 0, background: "transparent", lineHeight: 1.7 }}>
                <code style={{ background: "transparent" }}>
                  <span style={{ color: "rgba(245, 245, 220, 0.4)" }}>{"// Initialize client"}</span>
                  {"\n"}
                  <span style={{ color: "#D32F2F" }}>const</span>
                  {" alrt = "}
                  <span style={{ color: "#D32F2F" }}>new</span>
                  {" "}
                  <span style={{ color: "#facc15" }}>Alrt</span>
                  {"({ apiKey: "}
                  <span style={{ color: "#4ade80" }}>{`'...'`}</span>
                  {" });"}
                  {"\n\n"}
                  <span style={{ color: "rgba(245, 245, 220, 0.4)" }}>{"// Trigger event"}</span>
                  {"\n"}
                  <span style={{ color: "#D32F2F" }}>await</span>
                  {" alrt."}
                  <span style={{ color: "#60a5fa" }}>trigger</span>
                  {"("}
                  <span style={{ color: "#4ade80" }}>{`'order_created'`}</span>
                  {", {"}
                  {"\n  subscriber: { id: "}
                  <span style={{ color: "#4ade80" }}>{`'usr_123'`}</span>
                  {" },"}
                  {"\n  data: {"}
                  {"\n    price: "}
                  <span style={{ color: "#fb923c" }}>599</span>
                  {","}
                  {"\n    item: "}
                  <span style={{ color: "#4ade80" }}>{`'Mechanical Keyboard'`}</span>
                  {"\n  }"}
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
              { title: "Automatic subscriber upsertion", desc: "Don't worry about syncing users. We handle it on the fly." },
              { title: "Type-safe SDKs", desc: "Fully typed libraries for Node, Python, and Go." },
              { title: "CLI Tool", desc: "Test and debug your workflows from the terminal." },
            ].map((item) => (
              <li key={item.title} style={{ display: "flex", alignItems: "flex-start", gap: "1rem", borderLeft: "2px solid rgba(211, 47, 47, 0.5)", paddingLeft: "1rem" }}>
                <div>
                  <strong style={{ display: "block", marginBottom: "0.25rem", color: "#F5F5DC" }}>{item.title}</strong>
                  <p style={{ color: "rgba(245, 245, 220, 0.5)", fontSize: "0.875rem", margin: 0 }}>{item.desc}</p>
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
    tag: "High Availability",
    title: "Dedicated Queues",
    desc: "Isolated processing paths for every customer to ensure zero crosstalk.",
  },
  {
    tag: "Observability",
    title: "90-day Retention",
    desc: "Full audit trails and delivery logs stored for 3 months by default.",
  },
  {
    tag: "Error Handling",
    title: "Dead Letter Queue",
    desc: "Automatic capture of failed events for inspection and manual retry.",
  },
  {
    tag: "Reliability",
    title: "Smart Retries",
    desc: "Exponential backoff with jitter to handle transient provider downtime.",
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
            Built for high scale.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem" }}>
          {CAPABILITIES.map((cap) => (
            <div
              key={cap.title}
              className="glass-card"
              style={{
                padding: "2rem",
                borderLeft: "2px solid rgba(211, 47, 47, 0.5)",
              }}
            >
              <h5
                style={{
                  color: "#D32F2F",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "1rem",
                }}
              >
                {cap.tag}
              </h5>
              <h3
                style={{
                  fontFamily: "var(--font-serif), Playfair Display, serif",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  marginBottom: "1rem",
                  color: "#F5F5DC",
                }}
              >
                {cap.title}
              </h3>
              <p style={{ color: "rgba(245, 245, 220, 0.6)", fontSize: "0.875rem", lineHeight: 1.625, margin: 0 }}>
                {cap.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ==== CTA ==== */
/* ==== Pricing ==== */
const PLANS = [
  {
    name: "Free",
    price: "0",
    period: "forever",
    quota: "1,000",
    features: [
      "All 8 channels",
      "Visual workflow builder",
      "Activity feed + analytics",
      "Shared infrastructure",
      "Community support",
    ],
    cta: "Start for free",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "999",
    period: "/mo",
    quota: "25,000",
    features: [
      "Everything in Free",
      "BYOC email & Slack",
      "Soft quota (no hard blocks)",
      "Team member invites",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
  },
  {
    name: "Growth",
    price: "4,999",
    period: "/mo",
    quota: "200,000",
    features: [
      "Everything in Pro",
      "All BYOC options",
      "Overage tracking",
      "Dedicated support",
      "Custom integrations",
    ],
    cta: "Go Growth",
    highlighted: false,
  },
];

function Pricing() {
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
            Pricing
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
            Simple, transparent pricing.
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem", maxWidth: "64rem", margin: "0 auto" }}>
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className="glass-card"
              style={{
                padding: "2.5rem",
                borderRadius: "0.75rem",
                border: plan.highlighted
                  ? "1px solid rgba(211, 47, 47, 0.5)"
                  : "1px solid rgba(245, 245, 220, 0.1)",
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
                  &#x20B9;{plan.price}
                </span>
                <span style={{ color: "rgba(245, 245, 220, 0.5)", fontSize: "0.875rem" }}>{plan.period}</span>
              </div>
              <p style={{ color: "rgba(245, 245, 220, 0.5)", fontSize: "0.875rem", marginBottom: "2rem" }}>
                {plan.quota} notifications/month
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 2rem 0", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
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
      {/* Background Hermes — full image, allowed to overflow upward */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 0,
          transform: "translateX(-50%)",
          opacity: 0.1,
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
          border: "1px solid rgba(255, 255, 255, 0.1)",
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
          Ready to fix your notifications?
        </h2>
        <p
          style={{
            color: "rgba(245, 245, 220, 0.7)",
            fontSize: "1.125rem",
            marginBottom: "3rem",
            maxWidth: "560px",
            margin: "0 auto 3rem",
          }}
        >
          Join thousands of developers building reliable communication workflows with ALRT.
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
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
                transition: "all 150ms",
              }}
            >
              Create Free Account
            </button>
          </Link>
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
            Book a Demo
          </button>
        </div>
      </div>
    </section>
  );
}

/* ==== Footer ==== */
const FOOTER_LINKS = {
  Product: ["Docs", "API Reference", "Integrations"],
  Resources: ["Pricing", "Changelog", "Status"],
  Company: ["Privacy", "Terms", "About"],
};

function Footer() {
  return (
    <footer
      style={{
        background: "#121212",
        paddingTop: "6rem",
        paddingBottom: "3rem",
        borderTop: "1px solid rgba(255, 255, 255, 0.05)",
        padding: "6rem 1.5rem 3rem",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: "3rem",
            marginBottom: "5rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem" }}>
              <span
                style={{
                  fontFamily: "var(--font-serif), Playfair Display, serif",
                  fontWeight: 700,
                  fontSize: "1.25rem",
                  letterSpacing: "-0.025em",
                  color: "#F5F5DC",
                }}
              >
                ALRT
              </span>
            </div>
            <p
              style={{
                color: "rgba(245, 245, 220, 0.4)",
                fontSize: "0.875rem",
                lineHeight: 1.625,
                maxWidth: "20rem",
                margin: 0,
              }}
            >
              Reliable notification infrastructure for modern product teams.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([section, links]) => (
            <div key={section}>
              <h6
                style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                  marginBottom: "1.5rem",
                  color: "#D32F2F",
                }}
              >
                {section}
              </h6>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      style={{
                        color: "rgba(245, 245, 220, 0.5)",
                        textDecoration: "none",
                        fontSize: "0.875rem",
                        transition: "color 150ms",
                      }}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingTop: "2rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "rgba(245, 245, 220, 0.3)",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              margin: 0,
            }}
          >
            &copy; 2026 ALRT INFRASTRUCTURE CO. ALL RIGHTS RESERVED.
          </p>
          <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
            {/* GitHub */}
            <a href="#" style={{ color: "rgba(245, 245, 220, 0.3)", transition: "color 150ms" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.646.64.699 1.028 1.592 1.028 2.683 0 3.842-2.337 4.687-4.565 4.935.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482C19.137 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </a>
            {/* X/Twitter */}
            <a href="#" style={{ color: "rgba(245, 245, 220, 0.3)", transition: "color 150ms" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
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
