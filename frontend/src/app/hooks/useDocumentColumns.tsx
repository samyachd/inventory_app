import { ColumnDef } from "@tanstack/react-table";
import type { Document, DocumentType } from "@/app/types";
import { SortableHeader } from "../components/DataTable/SortableHeader";
import { DocumentLink } from "../components/DocumentLink";

const TYPE_LABEL: Record<DocumentType, string> = {
  devis: "Devis",
  bon_de_commande: "Bon de cmd",
  facture: "Facture",
};

const fmt = {
  date: (v: string | null | undefined) =>
    v ? new Date(v).toLocaleDateString("fr-FR") : "—",
};

export function useDocumentColumns(): ColumnDef<Document>[] {
  return [
    {
      accessorKey: "type",
      header: ({ column }) => <SortableHeader column={column} label="Type" />,
      cell: ({ row }) => TYPE_LABEL[row.original.type],
    },
    {
      accessorKey: "numero",
      header: ({ column }) => (
        <SortableHeader column={column} label="Numéro" />
      ),
      cell: ({ row }) => <DocumentLink doc={row.original} />,
    },
    {
      accessorKey: "nom",
      header: ({ column }) => <SortableHeader column={column} label="Nom" />,
    },
    {
      accessorKey: "date_document",
      header: ({ column }) => <SortableHeader column={column} label="Date" />,
      cell: ({ row }) => fmt.date(row.original.date_document),
    },
    {
      accessorKey: "montant_ht",
      header: ({ column }) => (
        <SortableHeader column={column} label="Montant HT" />
      ),
      cell: ({ row }) =>
        row.original.montant_ht != null
          ? `${row.original.montant_ht.toFixed(2)} €`
          : "—",
    },
    {
      accessorKey: "montant_ttc",
      header: ({ column }) => (
        <SortableHeader column={column} label="Montant TTC" />
      ),
      cell: ({ row }) =>
        row.original.montant_ttc != null
          ? `${row.original.montant_ttc.toFixed(2)} €`
          : "—",
    },
  ];
}
