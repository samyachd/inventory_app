import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import type { Agent, Document, DocumentType, Ecran } from "@/app/types";
import { SortableHeader } from "../components/DataTable/SortableHeader";
import { DocumentLink } from "../components/DocumentLink";
import { indexDocsByOwner } from "./useOrdinateurColumns";

interface Options {
  agents: Agent[];
  documents: Document[];
}

const fmt = {
  date: (v: string | null | undefined) =>
    v ? new Date(v).toLocaleDateString("fr-FR") : "—",
  str: (v: string | null | undefined) => v ?? "—",
  num: (v: number | null | undefined) => (v != null ? String(v) : "—"),
};

export function useEcranColumns({
  agents,
  documents,
}: Options): ColumnDef<Ecran>[] {
  const agentById = useMemo(
    () => new Map(agents.map((a) => [a.id, a])),
    [agents]
  );

  const docsByEcran = useMemo(
    () => indexDocsByOwner(documents, "ecran_ids"),
    [documents]
  );

  const docFor = (id: number, type: DocumentType) =>
    docsByEcran.get(id)?.get(type) ?? null;

  return [
    {
      accessorKey: "tag",
      header: ({ column }) => <SortableHeader column={column} label="Tag" />,
      cell: ({ row }) => fmt.str(row.original.tag),
    },
    {
      accessorKey: "marque",
      header: ({ column }) => <SortableHeader column={column} label="Marque" />,
      cell: ({ row }) => fmt.str(row.original.marque),
    },
    {
      accessorKey: "taille",
      header: ({ column }) => (
        <SortableHeader column={column} label='Taille (")' />
      ),
      cell: ({ row }) => fmt.num(row.original.taille),
    },
    {
      accessorKey: "service",
      header: ({ column }) => (
        <SortableHeader column={column} label="Service" />
      ),
      cell: ({ row }) => fmt.str(row.original.service),
    },
    {
      accessorKey: "batiment",
      header: ({ column }) => (
        <SortableHeader column={column} label="Bâtiment" />
      ),
      cell: ({ row }) => fmt.str(row.original.batiment),
    },
    {
      accessorKey: "proprietaire",
      header: ({ column }) => (
        <SortableHeader column={column} label="Propriétaire" />
      ),
      cell: ({ row }) => fmt.str(row.original.proprietaire),
    },
    {
      id: "agent",
      header: "Agent/Classe",
      cell: ({ row }) => {
        const a = row.original.agent_id
          ? agentById.get(row.original.agent_id)
          : null;
        return a ? a.nom : "—";
      },
    },
    {
      accessorKey: "fournisseur",
      header: ({ column }) => (
        <SortableHeader column={column} label="Fournisseur" />
      ),
      cell: ({ row }) => fmt.str(row.original.fournisseur),
    },
    {
      accessorKey: "date_achat",
      header: ({ column }) => (
        <SortableHeader column={column} label="Date achat" />
      ),
      cell: ({ row }) => fmt.date(row.original.date_achat),
    },
    {
      accessorKey: "fin_garantie",
      header: ({ column }) => (
        <SortableHeader column={column} label="Fin garantie" />
      ),
      cell: ({ row }) => fmt.date(row.original.fin_garantie),
    },
    {
      id: "devis",
      header: "Devis",
      cell: ({ row }) => (
        <DocumentLink doc={docFor(row.original.id, "devis")} />
      ),
    },
    {
      id: "bon_de_commande",
      header: "BC",
      cell: ({ row }) => (
        <DocumentLink doc={docFor(row.original.id, "bon_de_commande")} />
      ),
    },
    {
      id: "facture",
      header: "Facture",
      cell: ({ row }) => (
        <DocumentLink doc={docFor(row.original.id, "facture")} />
      ),
    },
  ];
}
