import { useState } from "react";
import type { Agent, Document, Ecran } from "@/app/types";
import { useEcranColumns } from "@/app/hooks/useEcranColumns";
import { useDeleteEcran } from "@/app/hooks/useEcran";
import { EcranCreateDialog } from "./EcranCreateDialog";
import { EcranEditDialog } from "./EcranEditDialog";
import { DataTable } from "../DataTable/DataTable";

import { useAuth } from "@/app/hooks/useAuth";

interface Props {
  data: Ecran[];
  agents: Agent[];
  documents: Document[];
  hideSearch?: boolean;
}

export function EcranTable({ data, agents, documents, hideSearch }: Props) {
  const [editingEcran, setEditingEcran] = useState<Ecran | null>(null);
  const deleteEcran = useDeleteEcran();
  const canWrite = useAuth((s) => s.role) !== "read";

  const columns = useEcranColumns({ agents, documents });

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        searchPlaceholder="Rechercher un écran..."
        hideSearch={hideSearch}
        itemLabel="écrans"
        onEdit={setEditingEcran}
        onDelete={(rows) => {
          const msg =
            rows.length === 1
              ? `Supprimer l'écran ${rows[0].tag ?? rows[0].id} ?`
              : `Supprimer ${rows.length} écrans ?`;
          if (confirm(msg)) rows.forEach((r) => deleteEcran.mutate(r.id));
        }}
        toolbarRight={<EcranCreateDialog agents={agents} disabled={!canWrite} />}
      />
      {editingEcran && (
        <EcranEditDialog
          ecran={editingEcran}
          agents={agents}
          documents={documents}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingEcran(null);
          }}
        />
      )}
    </>
  );
}
