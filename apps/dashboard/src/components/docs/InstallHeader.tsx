"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useLanguage } from "./LanguageContext";

export default function InstallHeader() {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);

  const command =
    language === "rest"
      ? "# No SDK needed — use any HTTP client (curl, fetch, httpx, etc.)"
      : language === "node"
      ? "npm install @alrt/node"
      : "pip install alrt-python";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 14px",
        background: "var(--color-elevated)",
        border: "1px solid var(--color-border)",
        borderRadius: "6px",
        fontFamily: "var(--font-mono)",
        fontSize: "13px",
      }}
    >
      <span style={{ color: "var(--color-text-muted)", userSelect: "none" }}>
        $
      </span>
      <code style={{ color: "var(--color-text-primary)", flex: 1 }}>
        {command}
      </code>
      <button
        onClick={handleCopy}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "4px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: copied ? "var(--color-success)" : "var(--color-text-muted)",
          transition: "color 150ms",
        }}
      >
        {copied ? (
          <Check style={{ width: 14, height: 14 }} />
        ) : (
          <Copy style={{ width: 14, height: 14 }} />
        )}
      </button>
    </div>
  );
}
