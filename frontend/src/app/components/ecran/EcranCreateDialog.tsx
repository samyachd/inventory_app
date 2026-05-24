import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";
import { EcranForm } from "./EcranForm";
import { useCreateEcran } from "@/app/hooks/useEcran";
import type { Agent } from "@/app/types";

interface Props {
  agents: Agent[];
  disabled?: boolean;
}

export function EcranCreateDialog({ agents, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const createEcran = useCreateEcran();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouvel écran</DialogTitle>
          <DialogDescription>
            Saisissez les informations de l'écran.
          </DialogDescription>
        </DialogHeader>
        <EcranForm
          agents={agents}
          isPending={createEcran.isPending}
          onSubmit={(data) =>
            createEcran.mutate(data, { onSuccess: () => setOpen(false) })
          }
        />
      </DialogContent>
    </Dialog>
  );
}
