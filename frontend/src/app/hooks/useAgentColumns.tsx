import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import type { Agent, Ecran, Ordinateur } from "@/app/types";
import { SortableHeader } from "../components/DataTable/SortableHeader";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../components/ui/hover-card";

interface Options {
  ordinateurs: Ordinateur[];
  ecrans: Ecran[];
}

const bool = (v: boolean | null | undefined) =>
  v == null ? "—" : v ? "Oui" : "Non";

const PREVIEW_COUNT = 3;

function tagOf(item: { tag: string | null; id: number }): string {
  return item.tag ?? `#${item.id}`;
}

function TagListCell({
  items,
}: {
  items: { tag: string | null; id: number }[];
}) {
  if (items.length === 0) return <>—</>;
  const preview = items.slice(0, PREVIEW_COUNT).map(tagOf).join(", ");
  const extra = items.length - PREVIEW_COUNT;
  if (extra <= 0) return <>{preview}</>;
  return (
    <span className="inline-flex items-baseline gap-1">
      <span>{preview}</span>
      <HoverCard openDelay={120} closeDelay={80}>
        <HoverCardTrigger asChild>
          <button
            type="button"
            className="text-xs px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-default"
          >
            +{extra}
          </button>
        </HoverCardTrigger>
        <HoverCardContent
          align="start"
          className="w-auto max-w-xs p-2 text-xs"
        >
          <div className="font-medium mb-1 text-muted-foreground">
            {items.length} au total
          </div>
          <div className="flex flex-wrap gap-1">
            {items.map((i) => (
              <span
                key={i.id}
                className="px-1.5 py-0.5 rounded bg-muted text-foreground"
              >
                {tagOf(i)}
              </span>
            ))}
          </div>
        </HoverCardContent>
      </HoverCard>
    </span>
  );
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
      cell: ({ row }) => (
        <TagListCell items={ordsByAgent.get(row.original.id) ?? []} />
      ),
    },
    {
      id: "ecrans",
      header: "Écrans",
      cell: ({ row }) => (
        <TagListCell items={ecransByAgent.get(row.original.id) ?? []} />
      ),
    },
  ];
}
