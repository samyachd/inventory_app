import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import type { Agent, Document, DocumentType, OfficeLicence, Ordinateur } from "@/app/types";
import { SortableHeader } from "../components/DataTable/SortableHeader";
import { DocumentLink } from "../components/DocumentLink";
import { QrDownloadButton } from "../components/QrDownloadButton";

interface Options {
  agents: Agent[];
  documents: Document[];
  licences: OfficeLicence[];
}

type DocsByOwner = Map<number, Map<DocumentType, Document>>;

function indexDocsByOwner(
  documents: Document[],
  ownerKey: "ordinateur_id" | "ecran_id" | "office_licence_id"
): DocsByOwner {
  const map: DocsByOwner = new Map();
  for (const doc of documents) {
    const ownerId = doc[ownerKey];
    if (ownerId == null) continue;
    let inner = map.get(ownerId);
    if (!inner) {
      inner = new Map();
      map.set(ownerId, inner);
    }
    const existing = inner.get(doc.type);
    if (!existing || doc.date_document > existing.date_document) {
      inner.set(doc.type, doc);
    }
  }
  return map;
}

export { indexDocsByOwner };

const fmt = {
  date: (v: string | null | undefined) =>
    v ? new Date(v).toLocaleDateString("fr-FR") : "—",
  bool: (v: boolean | null | undefined) =>
    v == null ? "—" : v ? "Oui" : "Non",
  str: (v: string | null | undefined) => v ?? "—",
};

export function useOrdinateurColumns({
  agents,
  documents,
  licences,
}: Options): ColumnDef<Ordinateur>[] {
  const agentById = useMemo(
    () => new Map(agents.map((a) => [a.id, a])),
    [agents]
  );

  const licenceById = useMemo(
    () => new Map(licences.map((l) => [l.id, l])),
    [licences]
  );

  const docsByOrdinateur = useMemo(
    () => indexDocsByOwner(documents, "ordinateur_id"),
    [documents]
  );

  const docFor = (id: number, type: DocumentType) =>
    docsByOrdinateur.get(id)?.get(type) ?? null;

  return [
    {
      accessorKey: "tag",
      header: ({ column }) => <SortableHeader column={column} label="Tag" />,
      cell: ({ row }) => fmt.str(row.original.tag),
    },
    {
      accessorKey: "nom_reseau",
      header: ({ column }) => (
        <SortableHeader column={column} label="Nom réseau" />
      ),
      cell: ({ row }) => fmt.str(row.original.nom_reseau),
    },
    {
      accessorKey: "marque",
      header: ({ column }) => <SortableHeader column={column} label="Marque" />,
      cell: ({ row }) => fmt.str(row.original.marque),
    },
    {
      accessorKey: "type_equipement",
      header: ({ column }) => <SortableHeader column={column} label="Type" />,
      cell: ({ row }) => fmt.str(row.original.type_equipement),
    },
    {
      accessorKey: "os",
      header: ({ column }) => <SortableHeader column={column} label="OS" />,
      cell: ({ row }) => fmt.str(row.original.os),
    },
    {
      accessorKey: "ram",
      header: ({ column }) => <SortableHeader column={column} label="RAM" />,
      cell: ({ row }) => fmt.str(row.original.ram),
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
      accessorKey: "ip_address",
      header: ({ column }) => <SortableHeader column={column} label="IP" />,
      cell: ({ row }) => fmt.str(row.original.ip_address),
    },
    {
      accessorKey: "mac_ethernet",
      header: ({ column }) => (
        <SortableHeader column={column} label="MAC Ethernet" />
      ),
      cell: ({ row }) => fmt.str(row.original.mac_ethernet),
    },
    {
      accessorKey: "mac_wifi",
      header: ({ column }) => (
        <SortableHeader column={column} label="MAC WiFi" />
      ),
      cell: ({ row }) => fmt.str(row.original.mac_wifi),
    },
    {
      accessorKey: "lecteur_cd",
      header: ({ column }) => (
        <SortableHeader column={column} label="Lecteur CD" />
      ),
      cell: ({ row }) => fmt.bool(row.original.lecteur_cd),
    },
    {
      accessorKey: "absolute_dell",
      header: ({ column }) => (
        <SortableHeader column={column} label="Absolute Dell" />
      ),
      cell: ({ row }) => fmt.bool(row.original.absolute_dell),
    },
    {
      accessorKey: "watt",
      header: ({ column }) => <SortableHeader column={column} label="Watt" />,
      cell: ({ row }) =>
        row.original.watt != null ? `${row.original.watt} W` : "—",
    },
    {
      accessorKey: "fournisseur",
      header: ({ column }) => (
        <SortableHeader column={column} label="Fournisseur" />
      ),
      cell: ({ row }) => fmt.str(row.original.fournisseur),
    },
    {
      accessorKey: "tag_chargeur",
      header: ({ column }) => (
        <SortableHeader column={column} label="Tag chargeur" />
      ),
      cell: ({ row }) => fmt.str(row.original.tag_chargeur),
    },
    {
      id: "licence",
      header: "Licence Office",
      cell: ({ row }) => {
        const l = row.original.officelicence_id
          ? licenceById.get(row.original.officelicence_id)
          : null;
        return l ? (l.version ?? `#${l.id}`) : "—";
      },
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
    {
      id: "qrcode",
      header: "QR",
      cell: ({ row }) => (
        <QrDownloadButton
          endpoint={`/qrcode/ordinateur/${row.original.id}`}
          filename={`qr-ord-${row.original.tag ?? row.original.id}.png`}
        />
      ),
    },
  ];
}
