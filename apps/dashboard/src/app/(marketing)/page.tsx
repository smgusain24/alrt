"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  RetroButton,
  WindowCard,
  GrooveDivider,
  CodeBlock,
  StatsCounter,
  MarqueeBar,
  Badge,
  RetroLink,
} from "@/components/retro";
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

/* ─── Nav ─── */
function TopBar() {
  const isLoggedIn = typeof document !== "undefined" && document.cookie.includes("alrt_token=");

  return (
    <nav className="bg-white border-b-2 border-muted px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="font-heading text-2xl text-foreground">ALRT</span>
          <span className="font-mono text-sm text-muted">.dev</span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <RetroLink href="#features">Features</RetroLink>
          <RetroLink href="#pricing">Pricing</RetroLink>
          <RetroLink href="/docs">Docs</RetroLink>
        </div>
        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <Link href="/workflows"><RetroButton variant="accent">Dashboard</RetroButton></Link>
          ) : (
            <>
              <Link href="/login"><RetroButton variant="default">Log In</RetroButton></Link>
              <Link href="/signup"><RetroButton variant="accent">Get Started</RetroButton></Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ─── Marquee ─── */
const SAUL_LINES = [
  "Notifications not reaching your users? THAT sounds satisfying to your competitors",
  "You don't NEED a notification platform. You need THE notification platform",
  "Has THIS ever happened to YOU? *silent notifications* — NEVER AGAIN",
  "I once had a client who built notifications from scratch. He's still building them",
  "Act now and your first 10,000 notifications are FREE. I'm not kidding. I'm a lawyer— wait no I'm not",
  "Your notifications deserve better representation",
  "Don't let your emails end up in the spam folder of LIFE",
  "Results not guaranteed but also kind of guaranteed — 99.9% uptime baby",
  "Call now! Actually don't call. Just POST to our API. It's easier",
  "Other platforms charge you per notification. We charge you per SMILE",
  "Is your notification provider giving you the OLD RUNAROUND? Switch to ALRT",
  "FREE CONSULTATION— I mean FREE TIER. 1000 notifications. No strings attached. Okay maybe one string. It's an API key",
  "You want notifications? I KNOW notifications. I AM notifications",
  "Side effects may include: higher engagement, happier users, and an overwhelming sense of productivity",
  "As seen on... well you're seeing it right now aren't you",
];

function AnnouncementBar() {
  const saulLine = useMemo(
    () => SAUL_LINES[Math.floor(Math.random() * SAUL_LINES.length)],
    []
  );

  return (
    <MarqueeBar>
      <span className="text-[#00ff00]">★ MULTI-CHANNEL NOTIFICATIONS </span>
      <span className="text-white">// </span>
      <span className="text-[#ffff00]">IN-APP + EMAIL + SLACK </span>
      <span className="text-white">// </span>
      <span className="text-[#00ffff]">ONE API CALL </span>
      <span className="text-white">// </span>
      <span className="text-danger">15 MIN SETUP </span>
      <span className="text-white">// </span>
      <span className="text-[#ff80ff]">FREE TIER: 1000 NOTIFICATIONS/MO </span>
      <span className="text-white">// </span>
      <span className="text-[#ffd700]">★ {saulLine} </span>
      <span className="text-white">// </span>
    </MarqueeBar>
  );
}

/* ─── Hero ─── */
function Hero() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-5xl mx-auto text-center">
        <h1 className="font-heading text-5xl md:text-7xl text-rainbow leading-tight">
          NOTIFICATIONS
          <br />
          INFRASTRUCTURE
        </h1>
        <p className="mt-4 text-lg md:text-xl text-foreground max-w-2xl mx-auto font-body">
          One API call. Three channels. In-app, email, and Slack &mdash; all
          integrated in under 15 minutes.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4 flex-wrap">
          <Link href="/signup"><RetroButton variant="accent">Get Started Free</RetroButton></Link>
          <Link href="/docs"><RetroButton variant="default">View Docs</RetroButton></Link>
        </div>
        <div className="mt-10 flex justify-center">
          <StatsCounter
            stats={[
              { label: "Free/Mo", value: "1000" },
              { label: "Channels", value: "3" },
              { label: "Setup", value: "15min" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}

/* ─── Code Example ─── */
const CODE_EXAMPLES: { lang: string; title: string; code: string }[] = [
  {
    lang: "curl",
    title: "terminal",
    code: `# Send to all channels defined in the workflow
curl -X POST https://api.alrt.dev/events/trigger \\
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
  }'

# Or override channels at trigger time
curl -X POST https://api.alrt.dev/events/trigger \\
  -H "Authorization: Bearer \${ALRT_API_KEY}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "workflow": "new-comment",
    "subscriber_id": "user_123",
    "channels": ["in_app", "slack"],
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
    code: `const ALRT_API_KEY = process.env.ALRT_API_KEY;

// Send to all channels defined in the workflow
const res = await fetch("https://api.alrt.dev/events/trigger", {
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
});

// Or override channels — only in-app and Slack
const filtered = await fetch("https://api.alrt.dev/events/trigger", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${ALRT_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    workflow: "new-comment",
    subscriber_id: "user_123",
    channels: ["in_app", "slack"],
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
    code: `import os
import requests

API_KEY = os.environ["ALRT_API_KEY"]
URL = "https://api.alrt.dev/events/trigger"
HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
}

# Send to all channels defined in the workflow
requests.post(URL, headers=HEADERS, json={
    "workflow": "new-comment",
    "subscriber_id": "user_123",
    "payload": {
        "commenter_name": "Sarah",
        "comment_preview": "Looks great!",
        "post_url": "https://app.example.com/posts/456",
    },
})

# Or override channels — only in-app and Slack
requests.post(URL, headers=HEADERS, json={
    "workflow": "new-comment",
    "subscriber_id": "user_123",
    "channels": ["in_app", "slack"],
    "payload": {
        "commenter_name": "Sarah",
        "comment_preview": "Looks great!",
        "post_url": "https://app.example.com/posts/456",
    },
})`,
  },
  {
    lang: "Go",
    title: "main.go",
    code: `package main

import (
    "bytes"
    "encoding/json"
    "net/http"
    "os"
)

func main() {
    apiKey := os.Getenv("ALRT_API_KEY")
    url := "https://api.alrt.dev/events/trigger"

    // Send to all channels defined in the workflow
    body, _ := json.Marshal(map[string]any{
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
    http.DefaultClient.Do(req)

    // Or override channels — only in-app and Slack
    filtered, _ := json.Marshal(map[string]any{
        "workflow":      "new-comment",
        "subscriber_id": "user_123",
        "channels":     []string{"in_app", "slack"},
        "payload": map[string]string{
            "commenter_name":  "Sarah",
            "comment_preview": "Looks great!",
            "post_url":        "https://app.example.com/posts/456",
        },
    })

    req2, _ := http.NewRequest("POST", url, bytes.NewBuffer(filtered))
    req2.Header.Set("Authorization", "Bearer "+apiKey)
    req2.Header.Set("Content-Type", "application/json")
    http.DefaultClient.Do(req2)
}`,
  },
];

function CodeExample() {
  const [activeLang, setActiveLang] = useState(0);
  const active = CODE_EXAMPLES[activeLang];

  return (
    <section className="py-16 px-4 bg-surface">
      <div className="max-w-3xl mx-auto">
        <h2 className="font-heading text-3xl md:text-4xl text-center mb-8 uppercase">
          Ship Notifications in Minutes
        </h2>

        {/* Language tabs */}
        <div className="flex gap-1 mb-0">
          {CODE_EXAMPLES.map((ex, i) => (
            <button
              key={ex.lang}
              onClick={() => setActiveLang(i)}
              className={`
                px-4 py-2 font-heading text-xs uppercase tracking-wide font-bold
                transition-none cursor-pointer focus-retro
                ${
                  i === activeLang
                    ? "bevel-inset bg-[#1e1e2e] text-[#cdd6f4]"
                    : "bevel-outset bg-[#c0c0c0] text-foreground hover:bg-[#d0d0d0]"
                }
              `}
            >
              {ex.lang}
            </button>
          ))}
        </div>

        <CodeBlock title={active.title} code={active.code} />
      </div>
    </section>
  );
}

/* ─── Features ─── */
const FEATURES = [
  {
    icon: Workflow,
    title: "Visual Workflow Builder",
    desc: "Drag-and-drop notification flows. Triggers, channels, delays, and conditions — no code needed.",
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
    desc: "REST API + TypeScript SDK. Auto-generated types. Idempotent triggers. Batch support.",
  },
];

function Features() {
  return (
    <section id="features" className="py-16 px-4">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-heading text-3xl md:text-4xl text-center mb-10 uppercase">
          Everything You Need
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <WindowCard key={f.title} title={f.title}>
              <div className="flex flex-col gap-3">
                <div className="bevel-outset bg-navy w-10 h-10 flex items-center justify-center">
                  <f.icon className="w-6 h-6 text-white" strokeWidth={2} />
                </div>
                <p className="text-sm text-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </WindowCard>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─── */
interface PricingTier {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  variant: "default" | "accent";
  badge?: string;
}

const TIERS: PricingTier[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "1000 notifications/mo",
      "3 channels (in-app, email, Slack)",
      "Visual workflow builder",
      "1 team member",
      "Community support",
    ],
    cta: "Get Started",
    variant: "default",
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    features: [
      "100K notifications/mo",
      "All channels",
      "Unlimited workflows",
      "5 team members",
      "Priority support",
      "Analytics dashboard",
    ],
    cta: "Start Pro Trial",
    variant: "accent",
    badge: "HOT!",
  },
  {
    name: "Enterprise",
    price: "Custom",
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
    variant: "default",
  },
];

function Pricing() {
  return (
    <section id="pricing" className="py-16 px-4 bg-surface">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-heading text-3xl md:text-4xl text-center mb-10 uppercase">
          Simple Pricing
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TIERS.map((tier) => (
            <div key={tier.name} className="bevel-outset bg-[#c0c0c0] flex flex-col">
              <div className="bg-title-bar px-3 py-2 flex items-center gap-2">
                <span className="font-heading text-sm text-white font-bold">
                  {tier.name}
                </span>
                {tier.badge && (
                  <Badge variant="hot" pulse>
                    {tier.badge}
                  </Badge>
                )}
              </div>
              <div className="bevel-inset bg-white m-1 p-4 flex flex-col flex-1">
                <div className="text-center mb-4">
                  <span className="font-heading text-4xl text-foreground">
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span className="text-muted text-sm">{tier.period}</span>
                  )}
                </div>
                <GrooveDivider />
                <ul className="flex-1 space-y-2 mb-4">
                  {tier.features.map((f, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-2 text-sm px-2 py-1 ${
                        i % 2 === 0 ? "bg-white" : "bg-row-alt"
                      }`}
                    >
                      <Check className="w-4 h-4 text-success flex-shrink-0 mt-0.5" strokeWidth={3} />
                      {f}
                    </li>
                  ))}
                </ul>
                <RetroButton variant={tier.variant} className="w-full">
                  {tier.cta}
                </RetroButton>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA ─── */
function FinalCTA() {
  return (
    <section className="py-16 px-4 bg-construction">
      <div className="max-w-3xl mx-auto text-center">
        <div className="bevel-outset bg-white p-8">
          <h2 className="font-heading text-3xl md:text-4xl uppercase mb-4">
            Ready to Send Your First Notification?
          </h2>
          <p className="text-foreground mb-6 font-body">
            Set up multi-channel notifications in 15 minutes. Free tier included.
          </p>
          <Link href="/signup"><RetroButton variant="accent">Get Started Free</RetroButton></Link>
        </div>
      </div>
    </section>
  );

}

/* ─── Footer ─── */
function Footer() {
  return (
    <footer className="bg-navy py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-white">
          <div>
            <span className="font-heading text-xl">ALRT</span>
            <span className="font-mono text-xs text-white/60">.dev</span>
            <p className="mt-2 text-sm text-white/80">
              Multi-channel notifications for startups.
            </p>
          </div>
          <div>
            <h3 className="font-heading text-sm uppercase mb-2">Product</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <a href="#features" className="text-[#88aaff] underline hover:text-danger">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-[#88aaff] underline hover:text-danger">
                  Pricing
                </a>
              </li>
              <li>
                <a href="/docs" className="text-[#88aaff] underline hover:text-danger">
                  Documentation
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-heading text-sm uppercase mb-2">Company</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <a href="/about" className="text-[#88aaff] underline hover:text-danger">
                  About
                </a>
              </li>
              <li>
                <a href="https://github.com/alrt-dev" className="text-[#88aaff] underline hover:text-danger">
                  GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>
        <GrooveDivider className="!border-muted" />
        <div className="flex items-center justify-between text-xs text-white/60 font-mono">
          <span>&copy; 2026 Alrt. All rights reserved.</span>
          <span>Built with retro love</span>
        </div>
      </div>
    </footer>
  );
}

/* ─── Page ─── */
export default function LandingPage() {
  return (
    <main className="bg-background min-h-screen">
      <TopBar />
      <AnnouncementBar />
      <Hero />
      <GrooveDivider className="max-w-5xl mx-auto" />
      <CodeExample />
      <GrooveDivider className="max-w-5xl mx-auto" />
      <Features />
      <GrooveDivider className="max-w-5xl mx-auto" />
      <Pricing />
      <FinalCTA />
      <Footer />
    </main>
  );
}
