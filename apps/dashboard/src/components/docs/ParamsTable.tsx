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
      <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-2">
        {title}
      </h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[rgba(255,255,255,0.08)]">
            <th className="text-left pb-2 text-[11px] font-medium text-text-muted w-[130px]">
              Name
            </th>
            <th className="text-left pb-2 text-[11px] font-medium text-text-muted w-[70px]">
              Type
            </th>
            <th className="text-left pb-2 text-[11px] font-medium text-text-muted w-[64px]">
            </th>
            <th className="text-left pb-2 text-[11px] font-medium text-text-muted">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {params.map((p, i) => (
            <tr
              key={p.name}
              className={
                i < params.length - 1
                  ? "border-b border-[rgba(255,255,255,0.06)]"
                  : ""
              }
            >
              <td className="py-2.5 align-top pr-2">
                <code className="text-[13px] font-mono font-medium text-text-primary">
                  {p.name}
                </code>
              </td>
              <td className="py-2.5 align-top pr-2">
                <span className="text-[11px] font-mono text-text-muted">
                  {p.type}
                </span>
              </td>
              <td className="py-2.5 align-top pr-2">
                {p.required ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-danger">
                    required
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-text-muted">
                    {p.default !== undefined ? `= ${p.default}` : "optional"}
                  </span>
                )}
              </td>
              <td className="py-2.5 align-top text-xs text-text-secondary leading-relaxed">
                {p.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
