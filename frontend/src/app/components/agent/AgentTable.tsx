import { useState } from "react";
import type { Agent, Ecran, OfficeLicence, Ordinateur } from "@/app/types";
import { useAgentColumns } from "@/app/hooks/useAgentColumns";
import { useDeleteAgent } from "@/app/hooks/useAgent";
import { AgentCreateDialog } from "./AgentCreateDialog";
import { AgentEditDialog } from "./AgentEditDialog";
import { AgentMaterialDialog } from "./AgentMaterialDialog";
import { DataTable } from "../DataTable/DataTable";
import { useAuth } from "@/app/hooks/useAuth";

interface Props {
  data: Agent[];
  ordinateurs: Ordinateur[];
  ecrans: Ecran[];
  licences: OfficeLicence[];
}

export function AgentTable({ data, ordinateurs, ecrans, licences }: Props) {
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [viewingAgent, setViewingAgent] = useState<Agent | null>(null);
  const deleteAgent = useDeleteAgent();
  const canWrite = useAuth((s) => s.role) !== "read";

  const columns = useAgentColumns({ onView: setViewingAgent });

  return (
    <>
      <DataTable
        data={data}
        columns={columns}
        searchPlaceholder="Rechercher un agent..."
        itemLabel="agents"
        onEdit={setEditingAgent}
        onDelete={(rows) => {
          const msg =
            rows.length === 1
              ? `Supprimer l'agent ${rows[0].nom} ?`
              : `Supprimer ${rows.length} agents ?`;
          if (confirm(msg)) rows.forEach((r) => deleteAgent.mutate(r.id));
        }}
        toolbarRight={<AgentCreateDialog disabled={!canWrite} />}
      />
      {editingAgent && (
        <AgentEditDialog
          agent={editingAgent}
          open={true}
          onOpenChange={(open) => {
            if (!open) setEditingAgent(null);
          }}
        />
      )}
      <AgentMaterialDialog
        agent={viewingAgent}
        ordinateurs={ordinateurs}
        ecrans={ecrans}
        licences={licences}
        onOpenChange={(open) => {
          if (!open) setViewingAgent(null);
        }}
      />
    </>
  );
}
