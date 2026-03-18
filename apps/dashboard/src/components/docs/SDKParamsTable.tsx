"use client";

import { useLanguage } from "./LanguageContext";

interface SDKParam {
  name: string;
  nodeType: string;
  pythonType: string;
  restType?: string;
  required: boolean;
  default?: string;
  description: string;
}

interface SDKParamsTableProps {
  title: string;
  params: SDKParam[];
}

export default function SDKParamsTable({ title, params }: SDKParamsTableProps) {
  const { language } = useLanguage();

  if (params.length === 0) return null;

  return (
    <div style={{ marginBottom: "20px" }}>
      <h4
        style={{
          fontSize: "11px",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--color-text-muted)",
          marginBottom: "10px",
        }}
      >
        {title}
      </h4>
      <div
        style={{
          border: "1px solid var(--color-border)",
          borderRadius: "6px",
          overflow: "hidden",
        }}
      >
        {params.map((p, i) => (
          <div
            key={p.name}
            style={{
              display: "grid",
              gridTemplateColumns: "140px 100px 70px 1fr",
              gap: "8px",
              padding: "10px 14px",
              borderBottom:
                i < params.length - 1
                  ? "1px solid var(--color-border)"
                  : undefined,
              alignItems: "baseline",
            }}
          >
            <code
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                fontWeight: 500,
                color: "var(--color-text-primary)",
              }}
            >
              {p.name}
            </code>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "11px",
                color: "var(--color-accent)",
              }}
            >
              {language === "rest" ? (p.restType || p.nodeType) : language === "node" ? p.nodeType : p.pythonType}
            </span>
            <span>
              {p.required ? (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "#f87171",
                  }}
                >
                  required
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 500,
                    color: "var(--color-text-muted)",
                  }}
                >
                  {p.default !== undefined ? `= ${p.default}` : "optional"}
                </span>
              )}
            </span>
            <span
              style={{
                fontSize: "12px",
                color: "var(--color-text-secondary)",
                lineHeight: 1.5,
              }}
            >
              {p.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { SDKParam };
