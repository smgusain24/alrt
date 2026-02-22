"use client";

import { useState, ReactNode } from "react";
import { Copy, Check, Terminal } from "lucide-react";

interface Token {
  type: "keyword" | "string" | "comment" | "property" | "method" | "punctuation" | "plain" | "number";
  text: string;
}

const TOKEN_COLORS: Record<Token["type"], string> = {
  keyword: "text-[#ff79c6]",    // pink
  string: "text-[#f1fa8c]",     // yellow
  comment: "text-[#6272a4]",    // muted blue-gray
  property: "text-[#8be9fd]",   // cyan
  method: "text-[#50fa7b]",     // green
  punctuation: "text-[#f8f8f2]",// white
  plain: "text-[#f8f8f2]",      // white
  number: "text-[#bd93f9]",     // purple
};

function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let remaining = line;

  while (remaining.length > 0) {
    // Comments
    const commentMatch = remaining.match(/^(\/\/.*)/);
    if (commentMatch) {
      tokens.push({ type: "comment", text: commentMatch[1] });
      remaining = remaining.slice(commentMatch[1].length);
      continue;
    }

    // Strings (double-quoted)
    const stringMatch = remaining.match(/^("[^"]*")/);
    if (stringMatch) {
      tokens.push({ type: "string", text: stringMatch[1] });
      remaining = remaining.slice(stringMatch[1].length);
      continue;
    }

    // Keywords
    const keywordMatch = remaining.match(/^(import|from|const|await|new|export|default|async|function|return|let|var)\b/);
    if (keywordMatch) {
      tokens.push({ type: "keyword", text: keywordMatch[1] });
      remaining = remaining.slice(keywordMatch[1].length);
      continue;
    }

    // Property keys (word followed by colon)
    const propertyMatch = remaining.match(/^(\w+)(?=\s*:)/);
    if (propertyMatch) {
      tokens.push({ type: "property", text: propertyMatch[1] });
      remaining = remaining.slice(propertyMatch[1].length);
      continue;
    }

    // Method calls (word followed by open paren, or after dot)
    const methodMatch = remaining.match(/^\.(\w+)/);
    if (methodMatch) {
      tokens.push({ type: "punctuation", text: "." });
      tokens.push({ type: "method", text: methodMatch[1] });
      remaining = remaining.slice(methodMatch[0].length);
      continue;
    }

    // Punctuation
    const punctMatch = remaining.match(/^([{}(),:;=])/);
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

    // Identifiers / other text
    const identMatch = remaining.match(/^(\w+)/);
    if (identMatch) {
      tokens.push({ type: "plain", text: identMatch[1] });
      remaining = remaining.slice(identMatch[1].length);
      continue;
    }

    // Fallback: single char
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
    <div className={`bevel-outset bg-[#1e1e2e] ${className}`}>
      {/* Title bar — terminal style */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#181825] border-b-2 border-[#313244]">
        <div className="flex items-center gap-2">
          {/* Traffic light dots */}
          <div className="flex gap-1.5">
            <div className="w-3 h-3 bg-[#ff5555] bevel-outset" />
            <div className="w-3 h-3 bg-[#f1fa8c] bevel-outset" />
            <div className="w-3 h-3 bg-[#50fa7b] bevel-outset" />
          </div>
          <Terminal className="w-3.5 h-3.5 text-[#6272a4] ml-1" strokeWidth={2} />
          <span className="font-mono text-sm text-[#cdd6f4] font-bold">
            {title}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-1 font-mono text-xs uppercase tracking-wider
            bevel-outset bg-[#313244] text-[#cdd6f4] hover:bg-[#45475a]
            active:bevel-pressed transition-none focus-retro"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-[#50fa7b]" strokeWidth={3} />
              <span className="text-[#50fa7b]">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" strokeWidth={2} />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code area */}
      <div className="overflow-x-auto">
        <pre className="p-0 m-0">
          <code className="font-mono text-sm leading-6">
            {lines.map((line, i) => (
              <div
                key={i}
                className="flex hover:bg-[#313244]/40 transition-none"
              >
                {/* Line number */}
                <span className="select-none w-12 shrink-0 text-right pr-4 pl-2 text-[#6272a4] border-r border-[#313244]">
                  {i + 1}
                </span>
                {/* Code */}
                <span className="pl-4 pr-4 whitespace-pre">
                  <HighlightedLine line={line} />
                </span>
              </div>
            ))}
          </code>
        </pre>
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#181825] border-t-2 border-[#313244] text-xs font-mono text-[#6272a4]">
        <span>TypeScript</span>
        <span>{lines.length} lines</span>
      </div>
    </div>
  );
}
