import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { AgentForm } from "./AgentForm";
import { useUpdateAgent } from "@/app/hooks/useAgent";
import type { Agent } from "@/app/types";

interface Props {
  agent: Agent;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentEditDialog({ agent, open, onOpenChange }: Props) {
  const updateMutation = useUpdateAgent();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Modifier {agent.nom}
          </DialogTitle>
          <DialogDescription>
            Modifiez les informations de l'agent.
          </DialogDescription>
        </DialogHeader>
        <AgentForm
          isPending={updateMutation.isPending}
          submitLabel="Enregistrer les modifications"
          defaultValues={{
            nom: agent.nom,
            email: agent.email,
            telephone: agent.telephone,
            clef_wifi: agent.clef_wifi,
            casque: agent.casque,
          }}
          onSubmit={(data) => {
            updateMutation.mutate(
              { id: agent.id, data },
              {
                onSuccess: () => {
                  onOpenChange(false);
                },
              }
            );
          }}
        />
      </DialogContent>
    </Dialog>
  );
}