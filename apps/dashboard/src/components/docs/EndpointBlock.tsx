"use client";

import MethodBadge from "./MethodBadge";
import ParamsTable from "./ParamsTable";
import { CodeBlock } from "@/components/ui";

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "WS";

interface Param {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
}

interface EndpointBlockProps {
  method: Method;
  path: string;
  description: string;
  pathParams?: Param[];
  queryParams?: Param[];
  bodyParams?: Param[];
  requestExample?: string;
  responseExample?: string;
  responseStatus?: string;
  errors?: { status: string; detail: string }[];
  className?: string;
}

export default function EndpointBlock({
  method,
  path,
  description,
  pathParams = [],
  queryParams = [],
  bodyParams = [],
  requestExample,
  responseExample,
  responseStatus = "200 OK",
  errors = [],
}: EndpointBlockProps) {
  const hasParams =
    pathParams.length > 0 ||
    queryParams.length > 0 ||
    bodyParams.length > 0 ||
    errors.length > 0;
  const hasCode = !!requestExample || !!responseExample;

  return (
    <article
      className="card"
      style={{
        marginBottom: "40px",
        overflow: "hidden",
        padding: 0,
      }}
    >
      {/* Header bar */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 20px",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        <MethodBadge method={method} />
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "14px",
            fontWeight: 500,
            color: "var(--color-text-primary)",
          }}
        >
          {path}
        </code>
      </header>

      {/* Description */}
      <div style={{ padding: "16px 20px 12px" }}>
        <p
          style={{
            fontSize: "14px",
            color: "var(--color-text-secondary)",
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      </div>

      {/* Two-column content */}
      {(hasParams || hasCode) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            alignItems: "start",
          }}
        >
          {/* Left: params + errors */}
          <div style={{ padding: "0 20px 20px" }}>
            {pathParams.length > 0 && (
              <ParamsTable title="Path parameters" params={pathParams} />
            )}
            {queryParams.length > 0 && (
              <ParamsTable title="Query parameters" params={queryParams} />
            )}
            {bodyParams.length > 0 && (
              <ParamsTable title="Body parameters" params={bodyParams} />
            )}
            {errors.length > 0 && (
              <div
                style={{
                  marginTop:
                    pathParams.length > 0 ||
                    queryParams.length > 0 ||
                    bodyParams.length > 0
                      ? "16px"
                      : undefined,
                }}
              >
                <h4
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--color-text-muted)",
                    marginBottom: "8px",
                  }}
                >
                  Errors
                </h4>
                {errors.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      gap: "12px",
                      padding: "8px 0",
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
            )}
          </div>

          {/* Right: code examples */}
          <div
            style={{
              padding: "0 20px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "16px",
            }}
          >
            {requestExample && (
              <CodeBlock title="Request" code={requestExample} />
            )}
            {responseExample && (
              <CodeBlock
                title={`Response \u2014 ${responseStatus}`}
                code={responseExample}
              />
            )}
          </div>
        </div>
      )}
    </article>
  );
}
