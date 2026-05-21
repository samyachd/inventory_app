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
import { DocumentForm } from "./DocumentForm";
import { useCreateDocument } from "@/app/hooks/useDocument";
import type { Ecran, OfficeLicence, Ordinateur } from "@/app/types";

interface Props {
  ordinateurs: Ordinateur[];
  ecrans: Ecran[];
  licences: OfficeLicence[];
  disabled?: boolean;
}

export function DocumentCreateDialog({ ordinateurs, ecrans, licences, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const createMutation = useCreateDocument();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau document
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau document</DialogTitle>
          <DialogDescription>
            Renseignez les informations du document et sélectionnez les
            équipements à lier. Un document sera créé pour chaque équipement
            sélectionné.
          </DialogDescription>
        </DialogHeader>
        <DocumentForm
          ordinateurs={ordinateurs}
          ecrans={ecrans}
          licences={licences}
          multiSelect={true}
          isPending={isPending}
          onSubmit={async (items) => {
            setIsPending(true);
            try {
              for (const item of items) {
                await createMutation.mutateAsync(item);
              }
              setOpen(false);
            } finally {
              setIsPending(false);
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
