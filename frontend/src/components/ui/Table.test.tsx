import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Table, type TableColumn } from "./Table";

interface TestRow {
  id: number;
  name: string;
  status: string;
}

const columns: TableColumn<TestRow>[] = [
  { key: "id", label: "ID" },
  { key: "name", label: "Name" },
  { key: "status", label: "Status" },
];

const rows: TestRow[] = [
  { id: 1, name: "Run A", status: "completed" },
  { id: 2, name: "Run B", status: "running" },
  { id: 3, name: "Run C", status: "pending" },
];

describe("Table", () => {
  it("renders column headers", () => {
    render(<Table columns={columns} rows={rows} />);
    expect(screen.getByText("ID")).toBeInTheDocument();
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("renders row data", () => {
    render(<Table columns={columns} rows={rows} />);
    expect(screen.getByText("Run A")).toBeInTheDocument();
    expect(screen.getByText("Run B")).toBeInTheDocument();
    expect(screen.getByText("Run C")).toBeInTheDocument();
  });

  it("shows 'No data' when rows is empty", () => {
    render(<Table columns={columns} rows={[]} />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("calls onRowClick when a row is clicked", () => {
    const onRowClick = vi.fn();
    render(<Table columns={columns} rows={rows} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText("Run B"));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });

  it("uses custom render function", () => {
    const colsWithRender: TableColumn<TestRow>[] = [
      ...columns,
      {
        key: "status",
        label: "Badge",
        render: (value) => `[${String(value).toUpperCase()}]`,
      },
    ];
    render(<Table columns={colsWithRender} rows={rows} />);
    expect(screen.getByText("[COMPLETED]")).toBeInTheDocument();
    expect(screen.getByText("[RUNNING]")).toBeInTheDocument();
  });
});
