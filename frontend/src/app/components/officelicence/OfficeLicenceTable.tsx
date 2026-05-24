import { useState } from "react";
import type { Document, OfficeLicence } from "@/app/types";
import { useOfficeLicenceColumns } from "@/app/hooks/useOfficeLicenceColumns";
import { useDeleteOfficeLicence } from "@/app/hooks/useOfficeLicence";
import { OfficeLicenceCreateDialog } from "./OfficeLicenceCreateDialog";
import { OfficeLicenceEditDialog } from "./OfficeLicenceEditDialog";
import { DataTable } from "../DataTable/DataTable";
import { useAuth } from "@/app/hooks/useAuth";

interface Props {
  data: OfficeLicence[];
  documents: Document[];
  hideSearch?: boolean;
}

export function OfficeLicenceTable({ data, documents, hideSearch }: Props) {
  const [editingLicence, setEditingLicence] = useState<OfficeLicence | null>(null);
  const deleteLicence = useDeleteOfficeLicence();
  const canWrite = useAuth((s) => s.role) !== "read";

  const columns = useOfficeLicenceColumns({ documents });

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        searchPlaceholder="Rechercher une licence..."
        hideSearch={hideSearch}
        itemLabel="licences"
        onEdit={setEditingLicence}
        onDelete={(rows) => {
          const msg =
            rows.length === 1
              ? `Supprimer la licence ${rows[0].version ?? rows[0].id} ?`
              : `Supprimer ${rows.length} licences ?`;
          if (confirm(msg)) rows.forEach((r) => deleteLicence.mutate(r.id));
        }}
        toolbarRight={<OfficeLicenceCreateDialog documents={documents} disabled={!canWrite} />}
      />
      {editingLicence && (
        <OfficeLicenceEditDialog
          licence={editingLicence}
          documents={documents}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingLicence(null);
          }}
        />
      )}
    </>
  );
}
