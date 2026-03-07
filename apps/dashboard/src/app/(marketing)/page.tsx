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
    <nav className="sticky top-0 z-50 bg-[#0a0a0b]/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-1">
            <span className="font-brand text-base font-bold text-white tracking-tight">ALRT</span>
            <span className="font-mono text-[10px] text-[#71717a]">.dev</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-[#a1a1aa]">
            <a href="#features" className="hover:text-white transition-colors">features</a>
            <a href="#pricing" className="hover:text-white transition-colors">pricing</a>
            <Link href="/docs" className="hover:text-white transition-colors">docs</Link>
          </div>
        </div>
        {isLoggedIn ? (
          <Link href="/workflows">
            <button className="bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white text-sm font-bold px-5 py-2 rounded-full transition-all active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              Dashboard
            </button>
          </Link>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login">
              <button className="text-sm font-medium text-[#a1a1aa] hover:text-white transition-colors">
                Log In
              </button>
            </Link>
            <Link href="/signup">
              <button className="bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white text-sm font-bold px-5 py-2 rounded-full transition-all active:scale-95 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
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
    <section className="pt-24 pb-12 px-6 max-w-7xl mx-auto flex flex-col items-center">
      <div className="text-center max-w-3xl mb-20 relative">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#3b82f6]/20 blur-[100px] rounded-full pointer-events-none" />

        <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-6 relative z-10 leading-[1.1]">
          One API<br />All the noise
        </h1>
        <p className="text-lg md:text-xl text-[#a1a1aa] max-w-2xl mx-auto relative z-10">
          Notifications shouldn't be a couple of sprints. Replace your notification technical debt with a single key. Route to multiple channels through a visual builder your PM can actually use.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3 relative z-10">
          <Link href="/signup">
            <button className="bg-[#3b82f6] hover:bg-[#3b82f6]/90 text-white text-sm font-bold px-6 py-3 rounded-full transition-all active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.4)]">
              Get Started Free
            </button>
          </Link>
          <Link href="/docs">
            <button className="border border-white/10 text-[#a1a1aa] hover:text-white text-sm font-medium px-6 py-3 rounded-full transition-colors hover:bg-white/5">
              View Docs
            </button>
          </Link>
        </div>
      </div>

      {/* Code → Hub → Channels flow */}
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-0 mb-12 relative">
        {/* Code snippet */}
        <div className="bg-[#121214] border border-white/5 rounded-xl p-5 shadow-2xl relative z-10">
          <div className="flex gap-1.5 mb-3">
            <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#333]" />
          </div>
          <pre className="font-mono text-[13px] leading-relaxed text-[#e4e4e7] overflow-x-auto"><code><span className="text-[#c084fc]">await</span>{` fetch(`}<span className="text-[#4ade80]">&quot;/events/trigger&quot;</span>{`, {
  `}<span className="text-[#60a5fa]">method</span>{`: `}<span className="text-[#4ade80]">&quot;POST&quot;</span>{`,
  `}<span className="text-[#60a5fa]">body</span>{`: JSON.stringify({
    `}<span className="text-[#60a5fa]">workflow</span>{`: `}<span className="text-[#4ade80]">&quot;user.signup&quot;</span>{`,
    `}<span className="text-[#60a5fa]">subscriber_id</span>{`: `}<span className="text-[#4ade80]">&quot;user_987&quot;</span>{`,
    `}<span className="text-[#60a5fa]">payload</span>{`: { `}<span className="text-[#60a5fa]">name</span>{`: `}<span className="text-[#4ade80]">&quot;alice&quot;</span>{` }
  })
});`}</code></pre>
        </div>

        {/* Connector: left line + hub + right line */}
        <div className="hidden md:flex items-center justify-center px-2">
          <div className="w-8 h-px bg-gradient-to-r from-white/10 to-[#3b82f6]/50" />
          <div className="relative shrink-0 mx-1">
            <div className="absolute inset-0 bg-[#3b82f6]/30 blur-xl rounded-full" />
            <div className="w-16 h-16 bg-[#121214] border border-[#3b82f6] rounded-2xl flex items-center justify-center relative shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              <Zap className="w-7 h-7 text-[#3b82f6]" strokeWidth={1.5} />
            </div>
          </div>
          <div className="w-8 h-px bg-gradient-to-r from-[#3b82f6]/50 to-white/10" />
        </div>

        {/* Mobile hub (shown only on mobile) */}
        <div className="flex md:hidden items-center justify-center py-4">
          <div className="relative">
            <div className="absolute inset-0 bg-[#3b82f6]/30 blur-xl rounded-full" />
            <div className="w-14 h-14 bg-[#121214] border border-[#3b82f6] rounded-2xl flex items-center justify-center relative shadow-[0_0_30px_rgba(59,130,246,0.3)]">
              <Zap className="w-6 h-6 text-[#3b82f6]" strokeWidth={1.5} />
            </div>
          </div>
        </div>

        {/* Channel cards */}
        <div className="grid grid-cols-2 gap-3 relative z-10">
          {[
            { icon: Bell, color: "#22c55e", label: "In-App" },
            { icon: Mail, color: "#a855f7", label: "Email" },
            { icon: MessageSquare, color: "#f97316", label: "Slack" },
            { icon: Zap, color: "#3b82f6", label: "Webhooks" },
          ].map((ch) => (
            <div key={ch.label} className="bg-[#121214] border border-white/5 rounded-lg p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${ch.color}15` }}>
                <ch.icon className="w-4 h-4" style={{ color: ch.color }} strokeWidth={2} />
              </div>
              <span className="text-sm font-medium text-[#a1a1aa]">{ch.label}</span>
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
    <section className="py-20 px-6 max-w-4xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white text-center mb-10">
        Integrate in Minutes
      </h2>

      <div className="flex gap-0 mb-0 border-b border-white/5">
        {CODE_EXAMPLES.map((ex, i) => (
          <button
            key={ex.lang}
            onClick={() => setActiveLang(i)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer relative
              ${i === activeLang ? "text-white" : "text-[#71717a] hover:text-[#a1a1aa]"}`}
          >
            {ex.lang}
            {i === activeLang && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3b82f6]" />}
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
    desc: "Drag-and-drop notification flows. Triggers, channels, delays, and conditions \u2014 no code needed.",
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
    <section id="features" className="py-20 px-6 max-w-6xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-10 px-2">
        Features
      </h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="bg-[#121214] border border-white/5 rounded-2xl p-8 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#3b82f6]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-[#3b82f6]" strokeWidth={1.5} />
              </div>
              <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-[#a1a1aa] leading-relaxed">{f.desc}</p>
            </div>
          </div>
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
    <section id="pricing" className="py-20 px-6 max-w-6xl mx-auto">
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-10 px-2">
        Pricing
      </h2>
      <div className="grid md:grid-cols-3 gap-6">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`rounded-2xl p-8 flex flex-col relative ${
              tier.highlighted
                ? "bg-[#0f172a] border border-[#3b82f6]/30 shadow-[0_0_30px_rgba(59,130,246,0.1)]"
                : "bg-[#121214] border border-white/5"
            }`}
          >
            {tier.highlighted && (
              <div className="absolute top-0 right-0 bg-[#3b82f6] text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg rounded-tr-2xl">
                Free
              </div>
            )}
            <h3 className="text-xl font-bold text-white mb-2">{tier.name}</h3>
            <div className="mb-6">
              <span className="text-4xl font-black text-white">{tier.price}</span>
              {tier.period && <span className="text-base text-[#71717a] font-normal">{tier.period}</span>}
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {tier.features.map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-[#a1a1aa]">
                  <Check className="w-4 h-4 text-[#3b82f6] shrink-0" strokeWidth={2} />
                  {f}
                </li>
              ))}
            </ul>
            <button
              className={`w-full py-3 rounded-lg text-sm font-bold transition-colors ${
                tier.highlighted
                  ? "border border-[#3b82f6]/50 text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white"
                  : "bg-white/5 hover:bg-white/10 text-white"
              }`}
            >
              {tier.cta}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* --- Footer --- */
function Footer() {
  return (
    <footer className="border-t border-white/5 py-12 px-6 mt-12 text-center text-[#71717a] text-sm font-mono">
      &copy; 2026 ALRT Inc.
    </footer>
  );
}

/* --- Page --- */
export default function LandingPage() {
  return (
    <main className="bg-[#0a0a0b] min-h-screen text-white antialiased overflow-x-hidden">
      <TopNav />
      <Hero />
      <CodeExample />
      <Features />
      <Pricing />
      <Footer />
    </main>
  );
}
