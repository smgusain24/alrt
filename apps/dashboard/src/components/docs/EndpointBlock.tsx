"use client";

import MethodBadge from "./MethodBadge";
import ParamsTable from "./ParamsTable";
import { CodeBlock } from "@/components/retro";

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
  return (
    <div className={`mb-8 ${className}`}>
      {/* Method + Path header */}
      <div className="flex items-center gap-3 mb-3">
        <MethodBadge method={method} />
        <code className="font-mono text-base font-bold text-foreground">{path}</code>
      </div>

      <p className="text-base text-foreground mb-4 leading-relaxed">{description}</p>

      {/* Split layout: params left, code right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: params */}
        <div>
          {pathParams.length > 0 && (
            <ParamsTable title="Path Parameters" params={pathParams} />
          )}
          {queryParams.length > 0 && (
            <ParamsTable title="Query Parameters" params={queryParams} />
          )}
          {bodyParams.length > 0 && (
            <ParamsTable title="Request Body" params={bodyParams} />
          )}
          {errors.length > 0 && (
            <div className="mt-4">
              <h4 className="font-heading text-sm uppercase tracking-wide mb-2 text-foreground font-bold">
                Errors
              </h4>
              <div className="space-y-1.5">
                {errors.map((e, i) => (
                  <div key={i} className="flex gap-2 text-sm">
                    <span className="font-mono text-danger font-bold shrink-0">
                      {e.status}
                    </span>
                    <span className="text-foreground">{e.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: code examples */}
        <div className="space-y-3">
          {requestExample && (
            <CodeBlock title="Request" code={requestExample} />
          )}
          {responseExample && (
            <CodeBlock title={`Response — ${responseStatus}`} code={responseExample} />
          )}
        </div>
      </div>
    </div>
  );
}
