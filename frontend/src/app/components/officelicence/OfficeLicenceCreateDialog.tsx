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
import { OfficeLicenceForm } from "./OfficeLicenceForm";
import { DocumentForm } from "../document/DocumentForm";
import { useCreateOfficeLicence } from "@/app/hooks/useOfficeLicence";
import { useCreateDocument } from "@/app/hooks/useDocument";
import type { Document as DocumentT } from "@/app/types";
import type { OcrExtractedData } from "@/app/services/document";
import {
  isDocumentAlreadyRegistered,
  ocrToDocumentDefaults,
} from "@/app/lib/ocrToDocument";

interface Props {
  documents: DocumentT[];
  disabled?: boolean;
}

export function OfficeLicenceCreateDialog({ documents, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [pendingOcr, setPendingOcr] = useState<OcrExtractedData | null>(null);
  const [createdLicenceId, setCreatedLicenceId] = useState<number | null>(null);

  const createLicence = useCreateOfficeLicence();
  const createDoc = useCreateDocument();

  const reset = () => {
    setPendingOcr(null);
    setCreatedLicenceId(null);
    setOpen(false);
  };

  const docDefaults = pendingOcr ? ocrToDocumentDefaults(pendingOcr) : null;
  const showDocStep = createdLicenceId != null && docDefaults != null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        else setOpen(true);
      }}
    >
      <DialogTrigger asChild>
        <Button disabled={disabled}>
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {showDocStep ? "Document détecté" : "Nouvelle licence Office"}
          </DialogTitle>
          <DialogDescription>
            {showDocStep
              ? "L'OCR a identifié un document non enregistré. Vérifiez et enregistrez-le."
              : "Saisissez les informations de la licence."}
          </DialogDescription>
        </DialogHeader>

        {showDocStep ? (
          <DocumentForm
            fixedOwner={{ office_licence_id: createdLicenceId }}
            defaultValues={docDefaults}
            isPending={createDoc.isPending}
            onSubmit={(items) => {
              createDoc.mutate(items[0], { onSuccess: reset });
            }}
          />
        ) : (
          <OfficeLicenceForm
            isPending={createLicence.isPending}
            onOcrExtracted={setPendingOcr}
            onSubmit={(data) => {
              createLicence.mutate(data, {
                onSuccess: (licence) => {
                  const willShow =
                    pendingOcr != null &&
                    ocrToDocumentDefaults(pendingOcr) != null &&
                    !isDocumentAlreadyRegistered(pendingOcr, documents);
                  if (willShow) setCreatedLicenceId(licence.id);
                  else reset();
                },
              });
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
