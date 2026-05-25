import { useState, ReactNode } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import {
  ColumnDef,
  FilterFn,
  PaginationState,
  Row,
  RowSelectionState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

const multiWordFilter: FilterFn<any> = (row, _columnId, filterValue: string) => {
  const raw = filterValue.trim();
  if (!raw) return true;

  const haystack = row
    .getAllCells()
    .filter((c) => c.column.getCanGlobalFilter())
    .map((c) => String(c.getValue() ?? ""))
    .join(" ")
    .toLowerCase();

  // Comma-separated values → OR logic; each segment is a space-separated AND query.
  // e.g. "CNF001, CNF002"  → match either serial
  //      "dell windows"    → match both words anywhere in the row
  const segments = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return segments.some((segment) => {
    const terms = segment.toLowerCase().split(/\s+/).filter(Boolean);
    return terms.every((t) => haystack.includes(t));
  });
};
multiWordFilter.autoRemove = (val: string) => !val;
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Pencil, Trash2 } from "lucide-react";

interface Props<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  itemLabel?: string;
  pageSize?: number;
  toolbarLeft?: ReactNode;
  toolbarRight?: ReactNode;
  onEdit?: (row: T) => void;
  onDelete?: (rows: T[]) => void;
  hideSearch?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  searchPlaceholder = "Rechercher...",
  itemLabel = "éléments",
  pageSize = 50,
  toolbarLeft,
  toolbarRight,
  onEdit,
  onDelete,
  hideSearch = false,
}: Props<T>) {
  const role = useAuth((s) => s.role);
  const canWrite = role !== "read";

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize });

  const handleSelect = (
    e: React.MouseEvent,
    row: Row<T>,
    rowIndex: number
  ) => {
    if (e.shiftKey && lastSelectedIndex !== null) {
      e.preventDefault();
      const rows = table.getRowModel().rows;
      const start = Math.min(lastSelectedIndex, rowIndex);
      const end = Math.max(lastSelectedIndex, rowIndex);
      const next: RowSelectionState = {};
      for (let i = start; i <= end; i++) {
        next[rows[i].id] = true;
      }
      setRowSelection(next);
    } else {
      row.toggleSelected();
    }
    setLastSelectedIndex(rowIndex);
  };

  const selectColumn: ColumnDef<T> = {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() ? "indeterminate" : false)
        }
        onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
        aria-label="Tout sélectionner"
      />
    ),
    cell: ({ row }) => {
      const rows = table.getRowModel().rows;
      const rowIndex = rows.findIndex((r) => r.id === row.id);
      return (
        <div
          onClick={(e) => {
            e.stopPropagation();
            handleSelect(e, row, rowIndex);
          }}
        >
          <Checkbox
            checked={row.getIsSelected()}
            aria-label="Sélectionner"
          />
        </div>
      );
    },
    enableSorting: false,
    enableGlobalFilter: false,
  };

  const allColumns: ColumnDef<T>[] = [selectColumn, ...columns];

  const table = useReactTable({
    data,
    columns: allColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: multiWordFilter,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    autoResetPageIndex: true,
    state: { sorting, globalFilter, rowSelection, pagination },
    enableRowSelection: true,
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  const handleEdit = () => {
    if (selectedCount === 1 && onEdit) {
      onEdit(selectedRows[0].original);
      setRowSelection({});
    }
  };

  const handleDelete = () => {
    if (selectedCount > 0 && onDelete) {
      onDelete(selectedRows.map((r) => r.original));
      setRowSelection({});
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!hideSearch && (
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full sm:max-w-sm"
          />
        )}
        {toolbarLeft}
        <div className="text-sm text-muted-foreground">
          {selectedCount > 0 ? (
            <span className="font-medium">
              {selectedCount} sélectionné{selectedCount > 1 ? "s" : ""} /{" "}
            </span>
          ) : null}
          {table.getPageCount() <= 1
            ? <>{table.getFilteredRowModel().rows.length} / {data.length} {itemLabel}</>
            : <>{table.getFilteredRowModel().rows.length} {itemLabel}</>
          }
        </div>
        <div className="ml-auto flex items-center gap-2">
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              disabled={selectedCount !== 1 || !canWrite}
            >
              <Pencil className="h-4 w-4 mr-1" />
              Modifier
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={selectedCount === 0 || !canWrite}
            >
              <Trash2 className="h-4 w-4 mr-1 text-red-500" />
              Supprimer
            </Button>
          )}
          {toolbarRight}
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <div className="overflow-auto max-h-[68vh]">
          <Table className="min-w-max">
            <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row, rowIndex) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className="cursor-pointer"
                    onClick={(e) => handleSelect(e, row, rowIndex)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={allColumns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    Aucun résultat.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
            {" · "}
            {table.getFilteredRowModel().rows.length} {itemLabel}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
