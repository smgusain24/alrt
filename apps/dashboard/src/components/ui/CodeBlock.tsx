"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

interface Token {
  type: "keyword" | "string" | "comment" | "property" | "method" | "punctuation" | "plain" | "number";
  text: string;
}

const TOKEN_COLORS: Record<Token["type"], string> = {
  keyword: "text-[#c084fc]",
  string: "text-[#4ade80]",
  comment: "text-[#525252]",
  property: "text-[#60a5fa]",
  method: "text-[#34d399]",
  punctuation: "text-[#a1a1aa]",
  plain: "text-[#e4e4e7]",
  number: "text-[#fb923c]",
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
        <span key={i} className={TOKEN_COLORS[token.type]}>
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
    <div className={`border border-[rgba(255,255,255,0.06)] rounded-md overflow-hidden ${className}`}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#18181b] border-b border-[rgba(255,255,255,0.06)]">
        <span className="font-mono text-xs text-[#a1a1aa]">
          {title}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs rounded
            text-[#71717a] hover:text-[#fafafa]
            transition-colors duration-150 focus:outline-none"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#22c55e]" strokeWidth={2} />
              <span className="text-[#22c55e]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" strokeWidth={2} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code area */}
      <div className="overflow-x-auto bg-[#111113]">
        <pre className="p-0 m-0">
          <code className="font-mono text-sm leading-6">
            {lines.map((line, i) => (
              <div
                key={i}
                className="flex hover:bg-[#18181b]/60"
              >
                <span className="select-none w-12 shrink-0 text-right pr-4 pl-2 text-[#525252] border-r border-[rgba(255,255,255,0.06)]">
                  {i + 1}
                </span>
                <span className="pl-4 pr-4 whitespace-pre">
                  <HighlightedLine line={line} />
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#18181b] border-t border-[rgba(255,255,255,0.06)] text-xs font-mono text-[#71717a]">
        <span>TypeScript</span>
        <span>{lines.length} lines</span>
      </div>
    </div>
  );
}
