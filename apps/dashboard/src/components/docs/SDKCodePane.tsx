"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useLanguage } from "./LanguageContext";

interface SDKCodePaneProps {
  node: string;
  python: string;
  rest?: string;
  title?: string;
}

export default function SDKCodePane({
  node,
  python,
  rest,
  title,
}: SDKCodePaneProps) {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  const code = language === "rest" && rest ? rest : language === "python" ? python : node;
  const lines = code.split("\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "6px",
        overflow: "hidden",
        fontSize: "13px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          background: "var(--color-elevated)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            color: "var(--color-text-muted)",
          }}
        >
          {title || (language === "rest" ? "cURL" : language === "node" ? "TypeScript" : "Python")}
        </span>
        <button
          onClick={handleCopy}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 6px",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: copied ? "var(--color-success)" : "var(--color-text-muted)",
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            transition: "color 150ms",
          }}
        >
          {copied ? (
            <Check style={{ width: 12, height: 12 }} />
          ) : (
            <Copy style={{ width: 12, height: 12 }} />
          )}
        </button>
      </div>
      <div style={{ overflowX: "auto", background: "var(--color-surface)" }}>
        <pre style={{ padding: 0, margin: 0 }}>
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              lineHeight: "1.6",
            }}
          >
            {lines.map((line, i) => (
              <div
                key={i}
                style={{ display: "flex" }}
              >
                <span
                  style={{
                    userSelect: "none",
                    width: "2.5rem",
                    flexShrink: 0,
                    textAlign: "right",
                    paddingRight: "0.75rem",
                    paddingLeft: "0.5rem",
                    color: "var(--color-text-muted)",
                    borderRight: "1px solid var(--color-border)",
                    opacity: 0.4,
                  }}
                >
                  {i + 1}
                </span>
                <span
                  style={{
                    paddingLeft: "0.75rem",
                    paddingRight: "0.75rem",
                    whiteSpace: "pre",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <HighlightedLine line={line} language={language} />
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

function HighlightedLine({
  line,
  language,
}: {
  line: string;
  language: "node" | "python" | "rest";
}) {
  const tokens = tokenize(line, language);
  return (
    <>
      {tokens.map((t, i) => (
        <span key={i} className={`token-${t.type}`}>
          {t.text}
        </span>
      ))}
    </>
  );
}

interface Token {
  type: "keyword" | "string" | "comment" | "property" | "method" | "punctuation" | "plain" | "number";
  text: string;
}

function tokenize(line: string, lang: "node" | "python" | "rest"): Token[] {
  const tokens: Token[] = [];
  let remaining = line;
  const kwSet =
    lang === "rest"
      ? /^(curl|GET|POST|PATCH|PUT|DELETE|HEAD|OPTIONS|HTTP)\b/
      : lang === "node"
      ? /^(import|from|const|await|new|export|default|async|function|return|let|var|type|interface|try|catch|throw|if|else|for|of)\b/
      : /^(import|from|def|await|async|with|as|return|class|try|except|raise|if|else|for|in|True|False|None)\b/;

  while (remaining.length > 0) {
    // Comments
    const commentMatch =
      lang === "node"
        ? remaining.match(/^(\/\/.*)/)
        : remaining.match(/^(#.*)/)  /* python + rest both use # */;
    if (commentMatch) {
      tokens.push({ type: "comment", text: commentMatch[1] });
      remaining = remaining.slice(commentMatch[1].length);
      continue;
    }
    // Strings (double, single, backtick, f-string)
    const strMatch = remaining.match(/^(f?"""[\s\S]*?"""|f?'''[\s\S]*?'''|f?"[^"]*"|f?'[^']*'|`[^`]*`)/);
    if (strMatch) {
      tokens.push({ type: "string", text: strMatch[1] });
      remaining = remaining.slice(strMatch[1].length);
      continue;
    }
    // Keywords
    const kwMatch = remaining.match(kwSet);
    if (kwMatch) {
      tokens.push({ type: "keyword", text: kwMatch[1] });
      remaining = remaining.slice(kwMatch[1].length);
      continue;
    }
    // Numbers
    const numMatch = remaining.match(/^(\d+\.?\d*)/);
    if (numMatch) {
      tokens.push({ type: "number", text: numMatch[1] });
      remaining = remaining.slice(numMatch[1].length);
      continue;
    }
    // Methods (.xxx)
    const methodMatch = remaining.match(/^\.(\w+)/);
    if (methodMatch) {
      tokens.push({ type: "punctuation", text: "." });
      tokens.push({ type: "method", text: methodMatch[1] });
      remaining = remaining.slice(methodMatch[0].length);
      continue;
    }
    // Property before colon
    const propMatch = remaining.match(/^(\w+)(?=\s*[:=])/);
    if (propMatch) {
      tokens.push({ type: "property", text: propMatch[1] });
      remaining = remaining.slice(propMatch[1].length);
      continue;
    }
    // Punctuation
    const punctMatch = remaining.match(/^([{}(),:;=<>\[\]@|&*+\-/])/);
    if (punctMatch) {
      tokens.push({ type: "punctuation", text: punctMatch[1] });
      remaining = remaining.slice(1);
      continue;
    }
    // Whitespace
    const wsMatch = remaining.match(/^(\s+)/);
    if (wsMatch) {
      tokens.push({ type: "plain", text: wsMatch[1] });
      remaining = remaining.slice(wsMatch[1].length);
      continue;
    }
    // Identifier
    const idMatch = remaining.match(/^(\w+)/);
    if (idMatch) {
      tokens.push({ type: "plain", text: idMatch[1] });
      remaining = remaining.slice(idMatch[1].length);
      continue;
    }
    tokens.push({ type: "plain", text: remaining[0] });
    remaining = remaining.slice(1);
  }

  return tokens;
}
