import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { DocumentForm } from "./DocumentForm";
import { useUpdateDocument } from "@/app/hooks/useDocument";
import type { Document, Ecran, OfficeLicence, Ordinateur } from "@/app/types";

interface Props {
  document: Document;
  ordinateurs: Ordinateur[];
  ecrans: Ecran[];
  licences: OfficeLicence[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentEditDialog({
  document,
  ordinateurs,
  ecrans,
  licences,
  open,
  onOpenChange,
}: Props) {
  const updateMutation = useUpdateDocument();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Modifier {document.numero}</DialogTitle>
          <DialogDescription>
            Modifiez les informations du document.
          </DialogDescription>
        </DialogHeader>
        <DocumentForm
          ordinateurs={ordinateurs}
          ecrans={ecrans}
          licences={licences}
          isPending={updateMutation.isPending}
          submitLabel="Enregistrer les modifications"
          defaultValues={{
            type: document.type,
            nom: document.nom,
            numero: document.numero,
            path: document.path,
            date_document: document.date_document,
            montant_ttc: document.montant_ttc,
            montant_ht: document.montant_ht,
            ordinateur_id: document.ordinateur_id,
            ecran_id: document.ecran_id,
            office_licence_id: document.office_licence_id,
          }}
          onSubmit={(items) => {
            updateMutation.mutate(
              { id: document.id, data: items[0] },
              { onSuccess: () => onOpenChange(false) }
            );
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
