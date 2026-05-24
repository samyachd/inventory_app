import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import type { Document, DocumentType, OfficeLicence } from "@/app/types";
import { SortableHeader } from "../components/DataTable/SortableHeader";
import { DocumentLink } from "../components/DocumentLink";
import { indexDocsByOwner } from "./useOrdinateurColumns";

interface Options {
  documents: Document[];
}

const fmt = {
  date: (v: string | null | undefined) =>
    v ? new Date(v).toLocaleDateString("fr-FR") : "—",
  str: (v: string | null | undefined) => v ?? "—",
};

export function useOfficeLicenceColumns({
  documents,
}: Options): ColumnDef<OfficeLicence>[] {
  const docsByLicence = useMemo(
    () => indexDocsByOwner(documents, "office_licence_ids"),
    [documents]
  );

  const docFor = (id: number, type: DocumentType) =>
    docsByLicence.get(id)?.get(type) ?? null;

  return [
    {
      accessorKey: "version",
      header: ({ column }) => (
        <SortableHeader column={column} label="Version" />
      ),
      cell: ({ row }) => fmt.str(row.original.version),
    },
    {
      accessorKey: "type_licence",
      header: ({ column }) => (
        <SortableHeader column={column} label="Type de licence" />
      ),
      cell: ({ row }) => fmt.str(row.original.type_licence),
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
        <SortableHeader column={column} label="Date d'achat" />
      ),
      cell: ({ row }) => fmt.date(row.original.date_achat),
    },
    {
      accessorKey: "clef",
      header: ({ column }) => <SortableHeader column={column} label="Clé" />,
      cell: ({ row }) => fmt.str(row.original.clef),
    },
    {
      accessorKey: "mail_activation",
      header: ({ column }) => (
        <SortableHeader column={column} label="Email activation" />
      ),
      cell: ({ row }) => fmt.str(row.original.mail_activation),
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
