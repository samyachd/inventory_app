import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import type { Agent, Ecran, Ordinateur } from "@/app/types";
import { SortableHeader } from "../components/DataTable/SortableHeader";

interface Options {
  ordinateurs: Ordinateur[];
  ecrans: Ecran[];
}

const bool = (v: boolean | null | undefined) =>
  v == null ? "—" : v ? "Oui" : "Non";

function tagList(items: { tag: string | null; id: number }[]): string {
  if (items.length === 0) return "—";
  return items.map((i) => i.tag ?? `#${i.id}`).join(", ");
}

export function useAgentColumns({ ordinateurs, ecrans }: Options): ColumnDef<Agent>[] {
  const ordsByAgent = useMemo(() => {
    const map = new Map<number, Ordinateur[]>();
    for (const o of ordinateurs) {
      if (o.agent_id == null) continue;
      const list = map.get(o.agent_id) ?? [];
      list.push(o);
      map.set(o.agent_id, list);
    }
    return map;
  }, [ordinateurs]);

  const ecransByAgent = useMemo(() => {
    const map = new Map<number, Ecran[]>();
    for (const e of ecrans) {
      if (e.agent_id == null) continue;
      const list = map.get(e.agent_id) ?? [];
      list.push(e);
      map.set(e.agent_id, list);
    }
    return map;
  }, [ecrans]);

  return [
    {
      accessorKey: "nom",
      header: ({ column }) => <SortableHeader column={column} label="Nom" />,
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
    {
      id: "ordinateurs",
      header: "Ordinateurs",
      cell: ({ row }) =>
        tagList(ordsByAgent.get(row.original.id) ?? []),
    },
    {
      id: "ecrans",
      header: "Écrans",
      cell: ({ row }) =>
        tagList(ecransByAgent.get(row.original.id) ?? []),
    },
  ];
}
