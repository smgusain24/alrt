import { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
}

interface RetroTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  className?: string;
}

export default function RetroTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  className = "",
}: RetroTableProps<T>) {
  return (
    <div className={`bevel-inset bg-white ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#c0c0c0]">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-3 py-2 font-heading text-xs uppercase tracking-wide border-r-2 border-b-2 border-muted last:border-r-0"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className={`
                ${i % 2 === 0 ? "bg-white" : "bg-row-alt"}
                ${onRowClick ? "cursor-pointer hover:bg-[#d0d0ff]" : ""}
              `}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-3 py-2 border-r-2 border-b border-muted/30 last:border-r-0"
                >
                  {col.render
                    ? col.render(row)
                    : (row[col.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
