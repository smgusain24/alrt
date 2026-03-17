"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CodeBlock } from "@/components/ui";
import {
  Bell,
  Mail,
  MessageSquare,
  Workflow,
  Users,
  Code2,
  Zap,
  Check,
} from "lucide-react";

/* --- Nav --- */
function TopNav() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("alrt_token"));
  }, []);

  return (
    <nav
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(10,10,11,0.8)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div
        style={{
          maxWidth: "1152px",
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span
              style={{
                fontFamily: "var(--font-brand)",
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--color-text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              ALRT
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                color: "var(--color-text-muted)",
              }}
            >
              .dev
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              fontSize: "14px",
              fontWeight: 500,
              color: "var(--color-text-secondary)",
            }}
          >
            <a href="#features" style={{ color: "inherit", textDecoration: "none" }}>
              features
            </a>
            <a href="#pricing" style={{ color: "inherit", textDecoration: "none" }}>
              pricing
            </a>
            <Link href="/docs" style={{ color: "inherit", textDecoration: "none" }}>
              docs
            </Link>
          </div>
        </div>
        {isLoggedIn ? (
          <Link href="/workflows">
            <button
              style={{
                background: "var(--color-accent)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                padding: "8px 20px",
                borderRadius: "9999px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 0 15px rgba(59,130,246,0.5)",
              }}
            >
              Dashboard
            </button>
          </Link>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Link href="/login">
              <button
                className="ghost"
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                }}
              >
                Log In
              </button>
            </Link>
            <Link href="/signup">
              <button
                style={{
                  background: "var(--color-accent)",
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: 700,
                  padding: "8px 20px",
                  borderRadius: "9999px",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 0 15px rgba(59,130,246,0.5)",
                }}
              >
                Get Started
              </button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

/* --- Hero --- */
function Hero() {
  return (
    <section
      style={{
        paddingTop: "96px",
        paddingBottom: "48px",
        paddingLeft: "24px",
        paddingRight: "24px",
        maxWidth: "1280px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "768px",
          marginBottom: "80px",
          position: "relative",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "384px",
            height: "384px",
            background: "rgba(59,130,246,0.2)",
            filter: "blur(100px)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />

        <h1
          style={{
            fontSize: "clamp(3rem, 7vw, 4.5rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: "var(--color-text-primary)",
            marginBottom: "24px",
            position: "relative",
            zIndex: 10,
            lineHeight: 1.1,
          }}
        >
          One API<br />All the noise
        </h1>
        <p
          style={{
            fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
            color: "var(--color-text-secondary)",
            maxWidth: "640px",
            margin: "0 auto",
            position: "relative",
            zIndex: 10,
          }}
        >
          Notifications shouldn&apos;t be a couple of sprints. Replace your notification technical debt with a single key. Route to multiple channels through a visual builder your PM can actually use.
        </p>
        <div
          style={{
            marginTop: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            position: "relative",
            zIndex: 10,
          }}
        >
          <Link href="/signup">
            <button
              style={{
                background: "var(--color-accent)",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 700,
                padding: "12px 24px",
                borderRadius: "9999px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 0 20px rgba(59,130,246,0.4)",
              }}
            >
              Get Started Free
            </button>
          </Link>
          <Link href="/docs">
            <button
              className="outline"
              style={{
                fontSize: "14px",
                fontWeight: 500,
                padding: "12px 24px",
                borderRadius: "9999px",
              }}
            >
              View Docs
            </button>
          </Link>
        </div>
      </div>

      {/* Code -> Hub -> Channels flow */}
      <div
        style={{
          width: "100%",
          maxWidth: "896px",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 0,
          marginBottom: "48px",
          position: "relative",
        }}
      >
        {/* Code snippet */}
        <div
          style={{
            background: "#121214",
            border: "1px solid var(--color-border)",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
            position: "relative",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", gap: "6px", marginBottom: "12px" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#333" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#333" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#333" }} />
          </div>
          <pre
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              lineHeight: 1.6,
              color: "#e4e4e7",
              overflowX: "auto",
              margin: 0,
            }}
          >
            <code>
              <span style={{ color: "#c084fc" }}>await</span>
              {` fetch(`}
              <span style={{ color: "#4ade80" }}>&quot;/events/trigger&quot;</span>
              {`, {\n  `}
              <span style={{ color: "#60a5fa" }}>method</span>
              {`: `}
              <span style={{ color: "#4ade80" }}>&quot;POST&quot;</span>
              {`,\n  `}
              <span style={{ color: "#60a5fa" }}>body</span>
              {`: JSON.stringify({\n    `}
              <span style={{ color: "#60a5fa" }}>workflow</span>
              {`: `}
              <span style={{ color: "#4ade80" }}>&quot;user.signup&quot;</span>
              {`,\n    `}
              <span style={{ color: "#60a5fa" }}>subscriber_id</span>
              {`: `}
              <span style={{ color: "#4ade80" }}>&quot;user_987&quot;</span>
              {`,\n    `}
              <span style={{ color: "#60a5fa" }}>payload</span>
              {`: { `}
              <span style={{ color: "#60a5fa" }}>name</span>
              {`: `}
              <span style={{ color: "#4ade80" }}>&quot;alice&quot;</span>
              {` }\n  })\n});`}
            </code>
          </pre>
        </div>

        {/* Connector: left line + hub + right line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 8px",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "1px",
              background: "linear-gradient(to right, rgba(255,255,255,0.1), rgba(59,130,246,0.5))",
            }}
          />
          <div style={{ position: "relative", flexShrink: 0, margin: "0 4px" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(59,130,246,0.3)",
                filter: "blur(20px)",
                borderRadius: "50%",
              }}
            />
            <div
              style={{
                width: "64px",
                height: "64px",
                background: "#121214",
                border: "1px solid var(--color-accent)",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                boxShadow: "0 0 30px rgba(59,130,246,0.3)",
              }}
            >
              <Zap
                style={{ width: "28px", height: "28px", color: "var(--color-accent)" }}
                strokeWidth={1.5}
              />
            </div>
          </div>
          <div
            style={{
              width: "32px",
              height: "1px",
              background: "linear-gradient(to right, rgba(59,130,246,0.5), rgba(255,255,255,0.1))",
            }}
          />
        </div>

        {/* Channel cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            position: "relative",
            zIndex: 10,
          }}
        >
          {[
            { icon: Bell, color: "#22c55e", label: "In-App" },
            { icon: Mail, color: "#a855f7", label: "Email" },
            { icon: MessageSquare, color: "#f97316", label: "Slack" },
            { icon: Zap, color: "#3b82f6", label: "Webhooks" },
          ].map((ch) => (
            <div
              key={ch.label}
              style={{
                background: "#121214",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                padding: "12px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: `${ch.color}15`,
                }}
              >
                <ch.icon style={{ width: "16px", height: "16px", color: ch.color }} strokeWidth={2} />
              </div>
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                }}
              >
                {ch.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --- Code Examples --- */
const CODE_EXAMPLES: { lang: string; title: string; code: string }[] = [
  {
    lang: "curl",
    title: "terminal",
    code: `curl -X POST https://api.alrt.dev/events/trigger \\
  -H "Authorization: Bearer \${ALRT_API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "workflow": "new-comment",
    "subscriber_id": "user_123",
    "payload": {
      "commenter_name": "Sarah",
      "comment_preview": "Looks great!",
      "post_url": "https://app.example.com/posts/456"
    }
  }'`,
  },
  {
    lang: "TypeScript",
    title: "app.ts",
    code: `const res = await fetch("https://api.alrt.dev/events/trigger", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${ALRT_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    workflow: "new-comment",
    subscriber_id: "user_123",
    payload: {
      commenter_name: "Sarah",
      comment_preview: "Looks great!",
      post_url: "https://app.example.com/posts/456",
    },
  }),
});`,
  },
  {
    lang: "Python",
    title: "app.py",
    code: `import requests

requests.post("https://api.alrt.dev/events/trigger",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "workflow": "new-comment",
        "subscriber_id": "user_123",
        "payload": {
            "commenter_name": "Sarah",
            "comment_preview": "Looks great!",
            "post_url": "https://app.example.com/posts/456",
        },
    },
)`,
  },
  {
    lang: "Go",
    title: "main.go",
    code: `body, _ := json.Marshal(map[string]any{
    "workflow":      "new-comment",
    "subscriber_id": "user_123",
    "payload": map[string]string{
        "commenter_name":  "Sarah",
        "comment_preview": "Looks great!",
        "post_url":        "https://app.example.com/posts/456",
    },
})

req, _ := http.NewRequest("POST", url, bytes.NewBuffer(body))
req.Header.Set("Authorization", "Bearer "+apiKey)
req.Header.Set("Content-Type", "application/json")
http.DefaultClient.Do(req)`,
  },
];

const MAX_CODE_LINES = Math.max(...CODE_EXAMPLES.map((ex) => ex.code.split("\n").length));

function CodeExample() {
  const [activeLang, setActiveLang] = useState(0);
  const active = CODE_EXAMPLES[activeLang];

  // Pad code to max lines so height stays fixed
  const padded = active.code + "\n".repeat(MAX_CODE_LINES - active.code.split("\n").length);

  return (
    <section style={{ padding: "80px 24px", maxWidth: "896px", margin: "0 auto" }}>
      <h2
        style={{
          fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--color-text-primary)",
          textAlign: "center",
          marginBottom: "40px",
        }}
      >
        Integrate in Minutes
      </h2>

      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {CODE_EXAMPLES.map((ex, i) => (
          <button
            key={ex.lang}
            onClick={() => setActiveLang(i)}
            className="ghost"
            style={{
              padding: "10px 16px",
              fontSize: "14px",
              fontWeight: 500,
              cursor: "pointer",
              position: "relative",
              color:
                i === activeLang
                  ? "var(--color-text-primary)"
                  : "var(--color-text-muted)",
              borderRadius: 0,
            }}
          >
            {ex.lang}
            {i === activeLang && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "2px",
                  background: "var(--color-accent)",
                }}
              />
            )}
          </button>
        ))}
      </div>

      <CodeBlock title={active.title} code={padded} />
    </section>
  );
}

/* --- Features --- */
const FEATURES = [
  {
    icon: Workflow,
    title: "Visual Workflow Builder",
    desc: "Drag-and-drop notification flows. Triggers, channels, delays, and conditions -- no code needed.",
  },
  {
    icon: Zap,
    title: "Multi-Channel Delivery",
    desc: "In-app, email, and Slack from a single API call. We route to the right channel automatically.",
  },
  {
    icon: Bell,
    title: "Real-Time In-App",
    desc: "WebSocket-powered live delivery. Your users see notifications the instant they're triggered.",
  },
  {
    icon: Mail,
    title: "Template Editor",
    desc: "Edit email subjects, Slack messages, and in-app content with live preview and variables.",
  },
  {
    icon: Users,
    title: "Subscriber Preferences",
    desc: "Per-workflow, per-channel opt-in/out. Your users control how they get notified.",
  },
  {
    icon: Code2,
    title: "API-First Design",
    desc: "REST API with auto-generated types. Idempotent triggers. Batch support. Built for developers.",
  },
];

function Features() {
  return (
    <section
      id="features"
      style={{ padding: "80px 24px", maxWidth: "1152px", margin: "0 auto" }}
    >
      <h2
        style={{
          fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--color-text-primary)",
          marginBottom: "40px",
          padding: "0 8px",
        }}
      >
        Features
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "20px",
        }}
      >
        {FEATURES.map((f) => (
          <article
            key={f.title}
            className="card"
            style={{
              padding: "32px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "rgba(59,130,246,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
              }}
            >
              <f.icon
                style={{ width: "20px", height: "20px", color: "var(--color-accent)" }}
                strokeWidth={1.5}
              />
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "8px" }}>
              {f.title}
            </h3>
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              {f.desc}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* --- Pricing --- */
interface PricingTier {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

const TIERS: PricingTier[] = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    features: [
      "1,000 notifications/mo",
      "3 channels (in-app, email, Slack)",
      "Visual workflow builder",
      "1 team member",
      "Community support",
    ],
    cta: "Get Started",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    features: [
      "100K notifications/mo",
      "All channels",
      "Unlimited workflows",
      "5 team members",
      "Priority support",
      "Analytics dashboard",
    ],
    cta: "Start Pro Trial",
  },
  {
    name: "Enterprise",
    price: "custom",
    period: "",
    features: [
      "Unlimited notifications",
      "All channels + custom",
      "Unlimited workflows",
      "Unlimited team members",
      "Dedicated support",
      "SLA guarantee",
      "SSO / SAML",
    ],
    cta: "Contact Sales",
  },
];

function Pricing() {
  return (
    <section
      id="pricing"
      style={{ padding: "80px 24px", maxWidth: "1152px", margin: "0 auto" }}
    >
      <h2
        style={{
          fontSize: "clamp(1.5rem, 4vw, 2.25rem)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--color-text-primary)",
          marginBottom: "40px",
          padding: "0 8px",
        }}
      >
        Pricing
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "24px",
        }}
      >
        {TIERS.map((tier) => (
          <article
            key={tier.name}
            className="card"
            style={{
              padding: "32px",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              borderColor: tier.highlighted
                ? "rgba(59,130,246,0.3)"
                : undefined,
              boxShadow: tier.highlighted
                ? "0 0 30px rgba(59,130,246,0.1)"
                : undefined,
            }}
          >
            {tier.highlighted && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  background: "var(--color-accent)",
                  color: "#fff",
                  fontSize: "10px",
                  fontWeight: 700,
                  padding: "4px 12px",
                  borderBottomLeftRadius: "8px",
                  borderTopRightRadius: "12px",
                }}
              >
                Free
              </div>
            )}
            <h3
              style={{
                fontSize: "20px",
                fontWeight: 700,
                color: "var(--color-text-primary)",
                marginBottom: "8px",
              }}
            >
              {tier.name}
            </h3>
            <div style={{ marginBottom: "24px" }}>
              <span
                style={{
                  fontSize: "36px",
                  fontWeight: 900,
                  color: "var(--color-text-primary)",
                }}
              >
                {tier.price}
              </span>
              {tier.period && (
                <span
                  style={{
                    fontSize: "16px",
                    color: "var(--color-text-muted)",
                    fontWeight: 400,
                  }}
                >
                  {tier.period}
                </span>
              )}
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 32px 0",
                flex: 1,
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              {tier.features.map((f, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    fontSize: "14px",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  <Check
                    style={{
                      width: "16px",
                      height: "16px",
                      color: "var(--color-accent)",
                      flexShrink: 0,
                    }}
                    strokeWidth={2}
                  />
                  {f}
                </li>
              ))}
            </ul>
            <button
              className="outline"
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "14px",
                fontWeight: 700,
                borderColor: tier.highlighted
                  ? "rgba(59,130,246,0.5)"
                  : undefined,
                color: tier.highlighted
                  ? "var(--color-accent)"
                  : "var(--color-text-primary)",
              }}
            >
              {tier.cta}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

/* --- Footer --- */
function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--color-border)",
        padding: "48px 24px",
        marginTop: "48px",
        textAlign: "center",
        color: "var(--color-text-muted)",
        fontSize: "14px",
        fontFamily: "var(--font-mono)",
      }}
    >
      &copy; 2026 ALRT Inc.
    </footer>
  );
}

/* --- Page --- */
export default function LandingPage() {
  return (
    <main
      style={{
        background: "var(--color-background)",
        minHeight: "100vh",
        color: "var(--color-text-primary)",
        overflowX: "hidden",
      }}
    >
      <TopNav />
      <Hero />
      <CodeExample />
      <Features />
      <Pricing />
      <Footer />
    </main>
  );
}
