import type { ReactNode } from "react";

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  render?: (value: unknown, row: T) => ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  onRowClick?: (row: T) => void;
}

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "14px",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "2px solid #e5e7eb",
  color: "#6b7280",
  fontWeight: 600,
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #e5e7eb",
  color: "#111827",
};

const rowHoverStyle = "#f9fafb";

export function Table<T extends Record<string, unknown>>({
  columns,
  rows,
  onRowClick,
}: TableProps<T>): React.ReactElement {
  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={String(col.key)} style={thStyle}>
              {col.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td
              colSpan={columns.length}
              style={{ ...tdStyle, textAlign: "center", color: "#9ca3af" }}
            >
              No data
            </td>
          </tr>
        )}
        {rows.map((row, rowIndex) => (
          <tr
            key={(row.id as string) ?? rowIndex}
            style={{
              cursor: onRowClick ? "pointer" : "default",
            }}
            onClick={() => onRowClick?.(row)}
            onMouseEnter={(e) => {
              if (onRowClick) {
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  rowHoverStyle;
              }
            }}
            onMouseLeave={(e) => {
              if (onRowClick) {
                (e.currentTarget as HTMLElement).style.backgroundColor = "";
              }
            }}
          >
            {columns.map((col) => (
              <td key={String(col.key)} style={tdStyle}>
                {col.render
                  ? col.render(row[col.key as keyof T], row)
                  : String(row[col.key as keyof T] ?? "")}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

