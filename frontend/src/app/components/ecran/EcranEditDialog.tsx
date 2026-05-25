import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { EcranForm } from "./EcranForm";
import { DocumentForm } from "../document/DocumentForm";
import { useUpdateEcran } from "@/app/hooks/useEcran";
import { useCreateDocument } from "@/app/hooks/useDocument";
import type { Agent, Document as DocumentT, Ecran } from "@/app/types";
import type { OcrExtractedData } from "@/app/services/document";
import {
  isDocumentAlreadyRegistered,
  ocrToDocumentDefaults,
} from "@/app/lib/ocrToDocument";

interface Props {
  ecran: Ecran;
  agents: Agent[];
  documents: DocumentT[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EcranEditDialog({
  ecran,
  agents,
  documents,
  open,
  onOpenChange,
}: Props) {
  const [pendingOcr, setPendingOcr] = useState<OcrExtractedData | null>(null);
  const [equipmentSaved, setEquipmentSaved] = useState(false);

  const updateEcran = useUpdateEcran();
  const createDoc = useCreateDocument();

  const close = () => {
    setPendingOcr(null);
    setEquipmentSaved(false);
    onOpenChange(false);
  };

  const docDefaults = pendingOcr ? ocrToDocumentDefaults(pendingOcr) : null;
  const showDocStep =
    equipmentSaved &&
    docDefaults != null &&
    pendingOcr != null &&
    !isDocumentAlreadyRegistered(pendingOcr, documents);

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : close())}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {showDocStep
              ? "Document détecté"
              : `Modifier ${ecran.tag ?? `écran #${ecran.id}`}`}
          </DialogTitle>
          <DialogDescription>
            {showDocStep
              ? "L'OCR a identifié un document non enregistré. Vérifiez et enregistrez-le."
              : "Modifiez les informations de l'écran."}
          </DialogDescription>
        </DialogHeader>

        {showDocStep ? (
          <DocumentForm
            fixedOwner={{ ecran_ids: [ecran.id] }}
            defaultValues={docDefaults}
            isPending={createDoc.isPending}
            onSubmit={(items) => {
              createDoc.mutate(items[0], { onSuccess: close });
            }}
          />
        ) : (
          <EcranForm
            agents={agents}
            isPending={updateEcran.isPending}
            submitLabel="Enregistrer les modifications"
            onOcrExtracted={setPendingOcr}
            defaultValues={{
              tag: ecran.tag,
              marque: ecran.marque,
              taille: ecran.taille,
              service: ecran.service,
              batiment: ecran.batiment,
              fournisseur: ecran.fournisseur,
              date_achat: ecran.date_achat,
              fin_garantie: ecran.fin_garantie,
              agent_id: ecran.agent_id,
            }}
            onSubmit={(data) => {
              updateEcran.mutate(
                { id: ecran.id, data },
                {
                  onSuccess: () => {
                    const willShow =
                      pendingOcr != null &&
                      ocrToDocumentDefaults(pendingOcr) != null &&
                      !isDocumentAlreadyRegistered(pendingOcr, documents);
                    if (willShow) setEquipmentSaved(true);
                    else close();
                  },
                }
              );
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
