type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "WS";

const METHOD_STYLES: Record<Method, string> = {
  GET:    "bg-green-500/15 text-green-400 border-green-500/20",
  POST:   "bg-blue-500/15 text-blue-400 border-blue-500/20",
  PATCH:  "bg-amber-500/15 text-amber-400 border-amber-500/20",
  PUT:    "bg-amber-500/15 text-amber-400 border-amber-500/20",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/20",
  WS:     "bg-purple-500/15 text-purple-400 border-purple-500/20",
};

interface MethodBadgeProps {
  method: Method;
  className?: string;
}

export default function MethodBadge({ method, className = "" }: MethodBadgeProps) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide border ${METHOD_STYLES[method]} ${className}`}
    >
      {method}
    </span>
  );
}
