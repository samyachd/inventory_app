import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { OrdinateurForm } from "./OrdinateurForm";
import { DocumentForm } from "../document/DocumentForm";
import { useUpdateOrdinateur } from "@/app/hooks/useOrdinateur";
import { useCreateDocument } from "@/app/hooks/useDocument";
import type { Agent, Document as DocumentT, Ordinateur } from "@/app/types";
import type { OcrExtractedData } from "@/app/services/document";
import {
  isDocumentAlreadyRegistered,
  ocrToDocumentDefaults,
} from "@/app/lib/ocrToDocument";

interface Props {
  ordinateur: Ordinateur;
  agents: Agent[];
  documents: DocumentT[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrdinateurEditDialog({
  ordinateur,
  agents,
  documents,
  open,
  onOpenChange,
}: Props) {
  const [pendingOcr, setPendingOcr] = useState<OcrExtractedData | null>(null);
  const [equipmentSaved, setEquipmentSaved] = useState(false);

  const updateOrdi = useUpdateOrdinateur();
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
              : `Modifier ${ordinateur.nom_reseau}`}
          </DialogTitle>
          <DialogDescription>
            {showDocStep
              ? "L'OCR a identifié un document non enregistré. Vérifiez et enregistrez-le."
              : "Modifiez les informations de l'ordinateur. Les champs non modifiés conservent leur valeur actuelle."}
          </DialogDescription>
        </DialogHeader>

        {showDocStep ? (
          <DocumentForm
            fixedOwner={{ ordinateur_id: ordinateur.id }}
            defaultValues={docDefaults}
            isPending={createDoc.isPending}
            onSubmit={(items) => {
              createDoc.mutate(items[0], { onSuccess: close });
            }}
          />
        ) : (
          <OrdinateurForm
            agents={agents}
            isPending={updateOrdi.isPending}
            submitLabel="Enregistrer les modifications"
            onOcrExtracted={setPendingOcr}
            defaultValues={{
              tag: ordinateur.tag,
              nom_reseau: ordinateur.nom_reseau,
              marque: ordinateur.marque,
              type_equipement: ordinateur.type_equipement,
              os: ordinateur.os,
              ram: ordinateur.ram,
              service: ordinateur.service,
              batiment: ordinateur.batiment,
              fournisseur: ordinateur.fournisseur,
              date_achat: ordinateur.date_achat,
              fin_garantie: ordinateur.fin_garantie,
              ip_address: ordinateur.ip_address,
              mac_ethernet: ordinateur.mac_ethernet,
              mac_wifi: ordinateur.mac_wifi,
              clef_wifi: ordinateur.clef_wifi,
              lecteur_cd: ordinateur.lecteur_cd,
              casque: ordinateur.casque,
              absolute_dell: ordinateur.absolute_dell,
              watt: ordinateur.watt,
              agent_id: ordinateur.agent_id,
            }}
            onSubmit={(data) => {
              updateOrdi.mutate(
                { id: ordinateur.id, data },
                {
                  onSuccess: () => {
                    const willShowDocStep =
                      pendingOcr != null &&
                      ocrToDocumentDefaults(pendingOcr) != null &&
                      !isDocumentAlreadyRegistered(pendingOcr, documents);
                    if (willShowDocStep) setEquipmentSaved(true);
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
