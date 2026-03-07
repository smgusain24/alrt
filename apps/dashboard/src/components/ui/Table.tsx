import { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  className?: string;
}

export default function Table<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  className = "",
}: TableProps<T>) {
  return (
    <div
      className={`border border-[rgba(255,255,255,0.06)] rounded-md overflow-hidden ${className}`}
    >
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#111113] sticky top-0">
            {columns.map((col) => (
              <th
                key={col.key}
                className="text-left px-4 py-2.5 text-xs font-medium text-[#a1a1aa] border-b border-[rgba(255,255,255,0.06)]"
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
                border-b border-[rgba(255,255,255,0.06)] last:border-b-0
                transition-colors duration-100
                ${onRowClick ? "cursor-pointer hover:bg-[#18181b]" : "hover:bg-[#18181b]"}
              `}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className="px-4 py-2.5 text-[#fafafa]"
                >
                  {col.render ? col.render(row) : (row[col.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
