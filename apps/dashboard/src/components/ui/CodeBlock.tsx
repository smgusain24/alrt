"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Token {
  type: "keyword" | "string" | "comment" | "property" | "method" | "punctuation" | "plain" | "number";
  text: string;
}

const TOKEN_CLASSES: Record<Token["type"], string> = {
  keyword: "token-keyword",
  string: "token-string",
  comment: "token-comment",
  property: "token-property",
  method: "token-method",
  punctuation: "token-punctuation",
  plain: "token-plain",
  number: "token-number",
};

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let remaining = line;

  while (remaining.length > 0) {
    const commentMatch = remaining.match(/^(\/\/.*)/);
    if (commentMatch) {
      tokens.push({ type: "comment", text: commentMatch[1] });
      remaining = remaining.slice(commentMatch[1].length);
      continue;
    }
    const stringMatch = remaining.match(/^("[^"]*")/);
    if (stringMatch) {
      tokens.push({ type: "string", text: stringMatch[1] });
      remaining = remaining.slice(stringMatch[1].length);
      continue;
    }
    const keywordMatch = remaining.match(/^(import|from|const|await|new|export|default|async|function|return|let|var)\b/);
    if (keywordMatch) {
      tokens.push({ type: "keyword", text: keywordMatch[1] });
      remaining = remaining.slice(keywordMatch[1].length);
      continue;
    }
    const propertyMatch = remaining.match(/^(\w+)(?=\s*:)/);
    if (propertyMatch) {
      tokens.push({ type: "property", text: propertyMatch[1] });
      remaining = remaining.slice(propertyMatch[1].length);
      continue;
    }
    const methodMatch = remaining.match(/^\.(\w+)/);
    if (methodMatch) {
      tokens.push({ type: "punctuation", text: "." });
      tokens.push({ type: "method", text: methodMatch[1] });
      remaining = remaining.slice(methodMatch[0].length);
      continue;
    }
    const punctMatch = remaining.match(/^([{}(),:;=])/);
    if (punctMatch) {
      tokens.push({ type: "punctuation", text: punctMatch[1] });
      remaining = remaining.slice(1);
      continue;
    }
    const wsMatch = remaining.match(/^(\s+)/);
    if (wsMatch) {
      tokens.push({ type: "plain", text: wsMatch[1] });
      remaining = remaining.slice(wsMatch[1].length);
      continue;
    }
    const identMatch = remaining.match(/^(\w+)/);
    if (identMatch) {
      tokens.push({ type: "plain", text: identMatch[1] });
      remaining = remaining.slice(identMatch[1].length);
      continue;
    }
    tokens.push({ type: "plain", text: remaining[0] });
    remaining = remaining.slice(1);
  }

  return tokens;
}

function HighlightedLine({ line }: { line: string }) {
  const tokens = tokenizeLine(line);
  return (
    <>
      {tokens.map((token, i) => (
        <span key={i} className={TOKEN_CLASSES[token.type]}>
          {token.text}
        </span>
      ))}
    </>
  );
}

interface CodeBlockProps {
  title?: string;
  code: string;
  className?: string;
}

export default function CodeBlock({
  title = "code.ts",
  code,
  className = "",
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n");

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={className || undefined}
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: "6px",
        overflow: "hidden",
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.5rem 1rem",
          background: "var(--color-elevated)",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "0.75rem",
            color: "var(--color-text-secondary)",
          }}
        >
          {title}
        </span>
        <button
          onClick={handleCopy}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.25rem 0.5rem",
            fontSize: "0.75rem",
            background: "none",
            border: "none",
            borderRadius: "4px",
            color: copied ? "var(--color-success)" : "var(--color-text-muted)",
            cursor: "pointer",
            transition: "color 0.15s",
          }}
        >
          {copied ? (
            <>
              <Check style={{ width: 14, height: 14 }} strokeWidth={2} />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy style={{ width: 14, height: 14 }} strokeWidth={2} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code area */}
      <div style={{ overflowX: "auto", background: "var(--color-surface)" }}>
        <pre style={{ padding: 0, margin: 0 }}>
          <code
            style={{
              fontFamily: "monospace",
              fontSize: "0.875rem",
              lineHeight: "1.5rem",
            }}
          >
            {lines.map((line, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(24, 24, 27, 0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <span
                  style={{
                    userSelect: "none",
                    width: "3rem",
                    flexShrink: 0,
                    textAlign: "right",
                    paddingRight: "1rem",
                    paddingLeft: "0.5rem",
                    color: "var(--color-text-muted)",
                    borderRight: "1px solid var(--color-border)",
                    opacity: 0.5,
                  }}
                >
                  {i + 1}
                </span>
                <span style={{ paddingLeft: "1rem", paddingRight: "1rem", whiteSpace: "pre" }}>
                  <HighlightedLine line={line} />
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>

      {/* Bottom status bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.375rem 1rem",
          background: "var(--color-elevated)",
          borderTop: "1px solid var(--color-border)",
          fontSize: "0.75rem",
          fontFamily: "monospace",
          color: "var(--color-text-muted)",
        }}
      >
        <span>TypeScript</span>
        <span>{lines.length} lines</span>
      </div>
    </div>
  );
}
