import { useState, useMemo } from "react";
import type {
  Document as DocumentT,
  DocumentType,
  Ecran,
  OfficeLicence,
  Ordinateur,
} from "@/app/types";
import { useDocumentColumns } from "@/app/hooks/useDocumentColumns";
import { useDeleteDocument } from "@/app/hooks/useDocument";
import { DocumentCreateDialog } from "./DocumentCreateDialog";
import { DocumentEditDialog } from "./DocumentEditDialog";
import { DataTable } from "../DataTable/DataTable";
import { useAuth } from "@/app/hooks/useAuth";

interface Props {
  data: DocumentT[];
  ordinateurs: Ordinateur[];
  ecrans: Ecran[];
  licences: OfficeLicence[];
}

type Filter = "all" | DocumentType;

const TYPE_OPTIONS: { value: Filter; label: string }[] = [
  { value: "all", label: "Tous les types" },
  { value: "devis", label: "Devis" },
  { value: "bon_de_commande", label: "Bons de commande" },
  { value: "facture", label: "Factures" },
];

export function DocumentTable({ data, ordinateurs, ecrans, licences }: Props) {
  const [editing, setEditing] = useState<DocumentT | null>(null);
  const [typeFilter, setTypeFilter] = useState<Filter>("all");
  const deleteDoc = useDeleteDocument();
  const canWrite = useAuth((s) => s.role) !== "read";

  const filteredData = useMemo(
    () => (typeFilter === "all" ? data : data.filter((d) => d.type === typeFilter)),
    [data, typeFilter]
  );

  const columns = useDocumentColumns();

  return (
    <>
      <DataTable
        data={filteredData}
        columns={columns}
        searchPlaceholder="Rechercher un document..."
        itemLabel="documents"
        onEdit={setEditing}
        onDelete={(rows) => {
          const msg =
            rows.length === 1
              ? `Supprimer le document ${rows[0].numero} ?`
              : `Supprimer ${rows.length} documents ?`;
          if (confirm(msg)) rows.forEach((r) => deleteDoc.mutate(r.id));
        }}
        toolbarLeft={
          <select
            className="border rounded-md px-3 py-2 text-sm"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as Filter)}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        }
        toolbarRight={
          <DocumentCreateDialog
            ordinateurs={ordinateurs}
            ecrans={ecrans}
            licences={licences}
            disabled={!canWrite}
          />
        }
      />
      {editing && (
        <DocumentEditDialog
          document={editing}
          ordinateurs={ordinateurs}
          ecrans={ecrans}
          licences={licences}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditing(null);
          }}
        />
      )}
    </>
  );
}
