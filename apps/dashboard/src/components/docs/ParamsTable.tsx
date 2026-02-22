interface Param {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
}

interface ParamsTableProps {
  title: string;
  params: Param[];
  className?: string;
}

export default function ParamsTable({ title, params, className = "" }: ParamsTableProps) {
  if (params.length === 0) return null;

  return (
    <div className={`mb-4 ${className}`}>
      <h4 className="font-heading text-sm uppercase tracking-wide mb-2 text-foreground font-bold">
        {title}
      </h4>
      <div className="bevel-inset bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#c0c0c0]">
              <th className="text-left px-3 py-2 font-heading text-xs uppercase tracking-wide font-bold border-r border-b border-muted">
                Field
              </th>
              <th className="text-left px-3 py-2 font-heading text-xs uppercase tracking-wide font-bold border-r border-b border-muted">
                Type
              </th>
              <th className="text-left px-3 py-2 font-heading text-xs uppercase tracking-wide font-bold border-r border-b border-muted">
                Req
              </th>
              <th className="text-left px-3 py-2 font-heading text-xs uppercase tracking-wide font-bold border-b border-muted">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {params.map((p, i) => (
              <tr key={p.name} className={i % 2 === 0 ? "bg-white" : "bg-row-alt"}>
                <td className="px-3 py-2 font-mono font-bold text-accent border-r border-muted/30">
                  {p.name}
                </td>
                <td className="px-3 py-2 font-mono text-foreground border-r border-muted/30">
                  {p.type}
                </td>
                <td className="px-3 py-2 border-r border-muted/30">
                  {p.required ? (
                    <span className="text-danger font-bold">Yes</span>
                  ) : (
                    <span className="text-muted">
                      No{p.default !== undefined ? ` (${p.default})` : ""}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-foreground">{p.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
