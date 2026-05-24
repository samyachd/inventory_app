import { useState } from "react";
import type { Agent, Document, OfficeLicence, Ordinateur } from "@/app/types";
import { useOrdinateurColumns } from "@/app/hooks/useOrdinateurColumns";
import { useDeleteOrdinateur } from "@/app/hooks/useOrdinateur";
import { OrdinateurCreateDialog } from "./OrdinateurCreateDialog";
import { OrdinateurEditDialog } from "./OrdinateurEditDialog";
import { DataTable } from "../DataTable/DataTable";
import { QrDownloadButton } from "../QrDownloadButton";
import { useAuth } from "@/app/hooks/useAuth";

interface Props {
  data: Ordinateur[];
  agents: Agent[];
  documents: Document[];
  licences: OfficeLicence[];
  hideSearch?: boolean;
}

export function OrdinateurTable({ data, agents, documents, licences, hideSearch }: Props) {
  const [editingOrdinateur, setEditingOrdinateur] = useState<Ordinateur | null>(null);
  const deleteOrdinateur = useDeleteOrdinateur();
  const canWrite = useAuth((s) => s.role) !== "read";

  const columns = useOrdinateurColumns({ agents, documents, licences });

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        searchPlaceholder="Rechercher un ordinateur..."
        hideSearch={hideSearch}
        itemLabel="ordinateurs"
        onEdit={setEditingOrdinateur}
        onDelete={(rows) => {
          const msg =
            rows.length === 1
              ? `Supprimer l'ordinateur ${rows[0].tag ?? rows[0].id} ?`
              : `Supprimer ${rows.length} ordinateurs ?`;
          if (confirm(msg)) rows.forEach((r) => deleteOrdinateur.mutate(r.id));
        }}
        toolbarRight={
          <div className="flex items-center gap-2">
            <QrDownloadButton
              endpoint="/qrcode/ordinateur/all"
              filename="qrcodes-ordinateurs.zip"
              label="Télécharger tous les QR"
            />
            <OrdinateurCreateDialog agents={agents} disabled={!canWrite} />
          </div>
        }
      />
      {editingOrdinateur && (
        <OrdinateurEditDialog
          ordinateur={editingOrdinateur}
          agents={agents}
          documents={documents}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingOrdinateur(null);
          }}
        />
      )}
    </>
  );
}
