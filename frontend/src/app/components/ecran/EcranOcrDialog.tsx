import { useState } from "react";
import { ScanLine } from "lucide-react";
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
import { DocumentForm } from "../document/DocumentForm";
import { useCreateEcran } from "@/app/hooks/useEcran";
import { useCreateDocument } from "@/app/hooks/useDocument";
import type { Agent, Document as DocumentT } from "@/app/types";
import type { OcrExtractedData } from "@/app/services/document";
import {
  isDocumentAlreadyRegistered,
  ocrToDocumentDefaults,
} from "@/app/lib/ocrToDocument";

interface Props {
  agents: Agent[];
  documents: DocumentT[];
}

export function EcranOcrDialog({ agents, documents }: Props) {
  const [open, setOpen] = useState(false);
  const [pendingOcr, setPendingOcr] = useState<OcrExtractedData | null>(null);
  const [createdEcranId, setCreatedEcranId] = useState<number | null>(null);

  const createEcran = useCreateEcran();
  const createDoc = useCreateDocument();

  const reset = () => {
    setPendingOcr(null);
    setCreatedEcranId(null);
    setOpen(false);
  };

  const docDefaults = pendingOcr ? ocrToDocumentDefaults(pendingOcr) : null;
  const showDocStep = createdEcranId != null && docDefaults != null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); else setOpen(true); }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <ScanLine className="h-4 w-4 mr-2" />
          OCR
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {showDocStep ? "Document détecté" : "Nouvel écran (OCR)"}
          </DialogTitle>
          <DialogDescription>
            {showDocStep
              ? "L'OCR a identifié un document non enregistré. Vérifiez et enregistrez-le."
              : "Scannez un document pour pré-remplir les champs automatiquement."}
          </DialogDescription>
        </DialogHeader>

        {showDocStep ? (
          <DocumentForm
            fixedOwner={{ ecran_ids: createdEcranId != null ? [createdEcranId] : [] }}
            defaultValues={docDefaults}
            isPending={createDoc.isPending}
            onSubmit={(items) => createDoc.mutate(items[0], { onSuccess: reset })}
          />
        ) : (
          <EcranForm
            agents={agents}
            isPending={createEcran.isPending}
            onOcrExtracted={setPendingOcr}
            onSubmit={(data) =>
              createEcran.mutate(data, {
                onSuccess: (ecran) => {
                  const docDef =
                    pendingOcr && !isDocumentAlreadyRegistered(pendingOcr, documents)
                      ? ocrToDocumentDefaults(pendingOcr)
                      : null;
                  if (docDef) setCreatedEcranId(ecran.id);
                  else reset();
                },
              })
            }
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
