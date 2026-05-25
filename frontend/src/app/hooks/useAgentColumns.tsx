import { ColumnDef } from "@tanstack/react-table";
import type { Agent } from "@/app/types";
import { SortableHeader } from "../components/DataTable/SortableHeader";

interface Options {
  onView?: (agent: Agent) => void;
}

const bool = (v: boolean | null | undefined) =>
  v == null ? "—" : v ? "Oui" : "Non";

export function useAgentColumns({ onView }: Options): ColumnDef<Agent>[] {
  return [
    {
      accessorKey: "nom",
      header: ({ column }) => <SortableHeader column={column} label="Nom" />,
      cell: ({ row }) =>
        onView ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onView(row.original);
            }}
            className="text-blue-600 hover:underline font-medium text-left"
          >
            {row.original.nom}
          </button>
        ) : (
          row.original.nom
        ),
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => row.original.email ?? "—",
    },
    {
      accessorKey: "telephone",
      header: "Téléphone",
      cell: ({ row }) => row.original.telephone ?? "—",
    },
    {
      accessorKey: "clef_wifi",
      header: "Clef WiFi",
      cell: ({ row }) => bool(row.original.clef_wifi),
    },
    {
      accessorKey: "casque",
      header: "Casque",
      cell: ({ row }) => bool(row.original.casque),
    },
  ];
}
