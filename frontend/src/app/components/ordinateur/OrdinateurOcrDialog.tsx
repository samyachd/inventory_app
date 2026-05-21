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
import { OrdinateurForm } from "./OrdinateurForm";
import { DocumentForm } from "../document/DocumentForm";
import { useCreateOrdinateur } from "@/app/hooks/useOrdinateur";
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

export function OrdinateurOcrDialog({ agents, documents }: Props) {
  const [open, setOpen] = useState(false);
  const [pendingOcr, setPendingOcr] = useState<OcrExtractedData | null>(null);
  const [createdOrdiId, setCreatedOrdiId] = useState<number | null>(null);

  const createOrdi = useCreateOrdinateur();
  const createDoc = useCreateDocument();

  const reset = () => {
    setPendingOcr(null);
    setCreatedOrdiId(null);
    setOpen(false);
  };

  const docDefaults = pendingOcr ? ocrToDocumentDefaults(pendingOcr) : null;
  const showDocStep = createdOrdiId != null && docDefaults != null;

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
            {showDocStep ? "Document détecté" : "Nouvel ordinateur (OCR)"}
          </DialogTitle>
          <DialogDescription>
            {showDocStep
              ? "L'OCR a identifié un document non enregistré. Vérifiez et enregistrez-le."
              : "Scannez un document pour pré-remplir les champs automatiquement."}
          </DialogDescription>
        </DialogHeader>

        {showDocStep ? (
          <DocumentForm
            fixedOwner={{ ordinateur_id: createdOrdiId }}
            defaultValues={docDefaults}
            isPending={createDoc.isPending}
            onSubmit={(items) => createDoc.mutate(items[0], { onSuccess: reset })}
          />
        ) : (
          <OrdinateurForm
            agents={agents}
            isPending={createOrdi.isPending}
            onOcrExtracted={setPendingOcr}
            onSubmit={(data) =>
              createOrdi.mutate(data, {
                onSuccess: (ordi) => {
                  const docDef =
                    pendingOcr && !isDocumentAlreadyRegistered(pendingOcr, documents)
                      ? ocrToDocumentDefaults(pendingOcr)
                      : null;
                  if (docDef) setCreatedOrdiId(ordi.id);
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
