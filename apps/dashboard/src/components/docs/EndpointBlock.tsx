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
  className = "",
}: EndpointBlockProps) {
  const hasParams = pathParams.length > 0 || queryParams.length > 0 || bodyParams.length > 0 || errors.length > 0;
  const hasCode = !!requestExample || !!responseExample;

  return (
    <div className={`mb-10 rounded-lg border border-[rgba(255,255,255,0.08)] overflow-hidden ${className}`}>
      {/* Header bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[rgba(255,255,255,0.08)]">
        <MethodBadge method={method} />
        <code className="font-mono text-sm font-medium text-text-primary">
          {path}
        </code>
      </div>

      {/* Description */}
      <div className="px-5 pt-4 pb-3">
        <p className="text-sm text-text-secondary leading-relaxed">
          {description}
        </p>
      </div>

      {/* Two-column content */}
      {(hasParams || hasCode) && (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] items-start">
          {/* Left: params + errors */}
          <div className="px-5 pb-5">
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
              <div className={pathParams.length > 0 || queryParams.length > 0 || bodyParams.length > 0 ? "mt-4" : ""}>
                <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-2">
                  Errors
                </h4>
                {errors.map((e, i) => (
                  <div
                    key={i}
                    className={`flex items-baseline gap-3 py-2 ${
                      i < errors.length - 1 ? "border-b border-[rgba(255,255,255,0.06)]" : ""
                    }`}
                  >
                    <code className="text-xs font-mono font-semibold text-danger shrink-0">
                      {e.status}
                    </code>
                    <span className="text-xs text-text-secondary">{e.detail}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right: code examples */}
          <div className="px-5 pb-5 space-y-4">
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
    </div>
  );
}
