import { useState } from "react";
import type { Agent, Ecran, Ordinateur } from "@/app/types";
import { useAgentColumns } from "@/app/hooks/useAgentColumns";
import { useDeleteAgent } from "@/app/hooks/useAgent";
import { AgentCreateDialog } from "./AgentCreateDialog";
import { AgentEditDialog } from "./AgentEditDialog";
import { DataTable } from "../DataTable/DataTable";
import { useAuth } from "@/app/hooks/useAuth";

interface Props {
  data: Agent[];
  ordinateurs: Ordinateur[];
  ecrans: Ecran[];
}

export function AgentTable({ data, ordinateurs, ecrans }: Props) {
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const deleteAgent = useDeleteAgent();
  const canWrite = useAuth((s) => s.role) !== "read";

  const columns = useAgentColumns({ ordinateurs, ecrans });

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
    </>
  );
}
