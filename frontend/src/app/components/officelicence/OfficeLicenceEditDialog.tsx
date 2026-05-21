import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { OfficeLicenceForm } from "./OfficeLicenceForm";
import { DocumentForm } from "../document/DocumentForm";
import { useUpdateOfficeLicence } from "@/app/hooks/useOfficeLicence";
import { useCreateDocument } from "@/app/hooks/useDocument";
import type { Document as DocumentT, OfficeLicence } from "@/app/types";
import type { OcrExtractedData } from "@/app/services/document";
import {
  isDocumentAlreadyRegistered,
  ocrToDocumentDefaults,
} from "@/app/lib/ocrToDocument";

interface Props {
  licence: OfficeLicence;
  documents: DocumentT[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OfficeLicenceEditDialog({
  licence,
  documents,
  open,
  onOpenChange,
}: Props) {
  const [pendingOcr, setPendingOcr] = useState<OcrExtractedData | null>(null);
  const [equipmentSaved, setEquipmentSaved] = useState(false);

  const updateLicence = useUpdateOfficeLicence();
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
            {showDocStep ? "Document détecté" : `Modifier ${licence.version}`}
          </DialogTitle>
          <DialogDescription>
            {showDocStep
              ? "L'OCR a identifié un document non enregistré. Vérifiez et enregistrez-le."
              : "Modifiez les informations de la licence Office."}
          </DialogDescription>
        </DialogHeader>

        {showDocStep ? (
          <DocumentForm
            fixedOwner={{ office_licence_id: licence.id }}
            defaultValues={docDefaults}
            isPending={createDoc.isPending}
            onSubmit={(items) => {
              createDoc.mutate(items[0], { onSuccess: close });
            }}
          />
        ) : (
          <OfficeLicenceForm
            isPending={updateLicence.isPending}
            submitLabel="Enregistrer les modifications"
            onOcrExtracted={setPendingOcr}
            defaultValues={{
              version: licence.version,
              type_licence: licence.type_licence,
              date_achat: licence.date_achat,
              fournisseur: licence.fournisseur,
              clef: licence.clef,
              mail_activation: licence.mail_activation,
            }}
            onSubmit={(data) => {
              updateLicence.mutate(
                { id: licence.id, data },
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
