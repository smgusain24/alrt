"use client";

import { useLanguage, type Language } from "./LanguageContext";

const OPTIONS: { value: Language; label: string }[] = [
  { value: "node", label: "Node.js" },
  { value: "python", label: "Python" },
  { value: "rest", label: "REST" },
];

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      style={{
        display: "flex",
        background: "var(--color-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      {OPTIONS.map((opt, i) => (
        <button
          key={opt.value}
          onClick={() => setLanguage(opt.value)}
          style={{
            padding: "6px 14px",
            fontSize: "12px",
            fontWeight: 600,
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
            border: "none",
            borderLeft: i > 0 ? "1px solid var(--color-border)" : "none",
            borderRadius: 0,
            transition: "all 150ms",
            background:
              language === opt.value ? "var(--color-accent)" : "transparent",
            color:
              language === opt.value ? "#fff" : "var(--color-text-muted)",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
