"use client";

import SDKCodePane from "./SDKCodePane";
import SDKParamsTable, { type SDKParam } from "./SDKParamsTable";
import { useLanguage } from "./LanguageContext";

interface SDKMethodBlockProps {
  id: string;
  nodeSignature: string;
  pythonSignature: string;
  restSignature?: string;
  description: string;
  params?: SDKParam[];
  returnType?: { node: string; python: string; rest?: string };
  nodeExample: string;
  pythonExample: string;
  restExample?: string;
  responseExample?: string;
  errors?: { status: string; detail: string }[];
}

export default function SDKMethodBlock({
  id,
  nodeSignature,
  pythonSignature,
  restSignature,
  description,
  params = [],
  returnType,
  nodeExample,
  pythonExample,
  restExample,
  responseExample,
  errors = [],
}: SDKMethodBlockProps) {
  const { language } = useLanguage();
  const signature =
    language === "rest" && restSignature
      ? restSignature
      : language === "python"
      ? pythonSignature
      : nodeSignature;

  const returnLabel =
    returnType &&
    (language === "rest" && returnType.rest
      ? returnType.rest
      : language === "python"
      ? returnType.python
      : returnType.node);

  return (
    <section id={id} style={{ marginBottom: "48px", scrollMarginTop: "80px" }}>
      {/* Method signature */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "8px",
        }}
      >
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "15px",
            fontWeight: 600,
            color: "var(--color-text-primary)",
            background: "var(--color-elevated)",
            padding: "4px 10px",
            borderRadius: "4px",
            border: "1px solid var(--color-border)",
          }}
        >
          {signature}
        </code>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: "14px",
          color: "var(--color-text-secondary)",
          lineHeight: 1.7,
          marginBottom: "16px",
          maxWidth: "640px",
        }}
      >
        {description}
      </p>

      {/* Return type */}
      {returnLabel && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "16px",
            fontSize: "12px",
          }}
        >
          <span style={{ color: "var(--color-text-muted)" }}>Returns</span>
          <code
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
              color: "var(--color-accent)",
              background: "rgba(211, 47, 47, 0.08)",
              padding: "2px 6px",
              borderRadius: "3px",
            }}
          >
            {returnLabel}
          </code>
        </div>
      )}

      {/* Two-column: params left, code right */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Left: Params + Errors */}
        <div>
          {params.length > 0 && (
            <SDKParamsTable title="Parameters" params={params} />
          )}
          {errors.length > 0 && (
            <div style={{ marginTop: params.length > 0 ? "8px" : undefined }}>
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
                Errors
              </h4>
              <div
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: "6px",
                  overflow: "hidden",
                }}
              >
                {errors.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "12px",
                      padding: "8px 14px",
                      borderBottom:
                        i < errors.length - 1
                          ? "1px solid var(--color-border)"
                          : undefined,
                    }}
                  >
                    <code
                      style={{
                        fontSize: "12px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        color: "#f87171",
                        flexShrink: 0,
                      }}
                    >
                      {e.status}
                    </code>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {e.detail}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Code pane */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <SDKCodePane node={nodeExample} python={pythonExample} rest={restExample} />
          {responseExample && (
            <SDKCodePane
              node={responseExample}
              python={responseExample}
              rest={responseExample}
              title="Response"
            />
          )}
        </div>
      </div>
    </section>
  );
}
