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
}

export default function ParamsTable({ title, params }: ParamsTableProps) {
  if (params.length === 0) return null;

  return (
    <div style={{ marginBottom: "16px" }}>
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
        {title}
      </h4>
      <div className="table">
        <table>
          <thead>
            <tr>
              <th style={{ width: "130px", textAlign: "left" }}>Name</th>
              <th style={{ width: "70px", textAlign: "left" }}>Type</th>
              <th style={{ width: "64px", textAlign: "left" }}></th>
              <th style={{ textAlign: "left" }}>Description</th>
            </tr>
          </thead>
          <tbody>
            {params.map((p) => (
              <tr key={p.name}>
                <td style={{ verticalAlign: "top" }}>
                  <code
                    style={{
                      fontSize: "13px",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 500,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {p.name}
                  </code>
                </td>
                <td style={{ verticalAlign: "top" }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--color-text-muted)",
                    }}
                  >
                    {p.type}
                  </span>
                </td>
                <td style={{ verticalAlign: "top" }}>
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
                </td>
                <td
                  style={{
                    verticalAlign: "top",
                    fontSize: "12px",
                    color: "var(--color-text-secondary)",
                    lineHeight: 1.6,
                  }}
                >
                  {p.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
