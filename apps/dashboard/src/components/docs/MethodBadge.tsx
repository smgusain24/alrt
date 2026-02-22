type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "WS";

const METHOD_STYLES: Record<Method, string> = {
  GET: "bg-accent text-white bevel-accent",
  POST: "bg-success text-white bevel-success",
  PATCH: "bg-warning text-black border-2 border-[#cc9900]",
  PUT: "bg-warning text-black border-2 border-[#cc9900]",
  DELETE: "bg-danger text-white bevel-danger",
  WS: "bg-navy text-white border-2 border-[#5555ff]",
};

interface MethodBadgeProps {
  method: Method;
  className?: string;
}

export default function MethodBadge({ method, className = "" }: MethodBadgeProps) {
  return (
    <span
      className={`inline-block px-3 py-1 font-mono text-sm font-bold uppercase tracking-wider ${METHOD_STYLES[method]} ${className}`}
    >
      {method}
    </span>
  );
}
