import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import type {
  DocumentType,
  Ecran,
  OfficeLicence,
  Ordinateur,
} from "@/app/types";
import type { DocumentCreatePayload } from "@/app/services/document";

interface OwnerLink {
  ordinateur_ids?: number[];
  ecran_ids?: number[];
  office_licence_ids?: number[];
}

interface FormValues {
  type: DocumentType;
  nom: string;
  numero: string;
  path: string;
  date_document: string;
  montant_ttc: number | null;
  montant_ht: number | null;
}

interface Props {
  onSubmit: (items: DocumentCreatePayload[]) => void;
  isPending?: boolean;
  defaultValues?: Partial<DocumentCreatePayload>;
  fixedOwner?: OwnerLink;
  ordinateurs?: Ordinateur[];
  ecrans?: Ecran[];
  licences?: OfficeLicence[];
  submitLabel?: string;
}

const TYPE_OPTIONS: { value: DocumentType; label: string }[] = [
  { value: "devis", label: "Devis" },
  { value: "bon_de_commande", label: "Bon de commande" },
  { value: "facture", label: "Facture" },
];

function CheckList<T extends { id: number }>({
  items,
  selected,
  onToggle,
  label,
}: {
  items: T[];
  selected: number[];
  onToggle: (id: number, checked: boolean) => void;
  label: (item: T) => string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
      {items.map((item) => (
        <label
          key={item.id}
          className="flex items-center gap-2 text-sm cursor-pointer select-none"
        >
          <input
            type="checkbox"
            className="accent-primary"
            checked={selected.includes(item.id)}
            onChange={(e) => onToggle(item.id, e.target.checked)}
          />
          {label(item)}
        </label>
      ))}
    </div>
  );
}

export function DocumentForm({
  onSubmit,
  isPending,
  defaultValues,
  fixedOwner,
  ordinateurs,
  ecrans,
  licences,
  submitLabel = "Enregistrer le document",
}: Props) {
  const [selectedOrds, setSelectedOrds] = useState<number[]>(
    defaultValues?.ordinateur_ids ?? []
  );
  const [selectedEcrans, setSelectedEcrans] = useState<number[]>(
    defaultValues?.ecran_ids ?? []
  );
  const [selectedLicences, setSelectedLicences] = useState<number[]>(
    defaultValues?.office_licence_ids ?? []
  );

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<number[]>>
  ) => (id: number, checked: boolean) => {
    setter((prev) =>
      checked ? [...prev, id] : prev.filter((x) => x !== id)
    );
  };

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      type: defaultValues?.type ?? "facture",
      nom: defaultValues?.nom ?? "",
      numero: defaultValues?.numero ?? "",
      path: defaultValues?.path ?? "",
      date_document:
        defaultValues?.date_document ?? new Date().toISOString().split("T")[0],
      montant_ttc: defaultValues?.montant_ttc ?? null,
      montant_ht: defaultValues?.montant_ht ?? null,
    },
  });

  const type = watch("type");
  const isFacture = type === "facture";

  function buildItem(values: FormValues): DocumentCreatePayload {
    const base: DocumentCreatePayload = {
      type: values.type,
      nom: values.nom,
      numero: values.numero,
      path: values.path,
      date_document: values.date_document,
      montant_ttc: isFacture ? values.montant_ttc : null,
      montant_ht: isFacture ? values.montant_ht : null,
      ordinateur_ids: selectedOrds,
      ecran_ids: selectedEcrans,
      office_licence_ids: selectedLicences,
    };

    if (fixedOwner) {
      return {
        ...base,
        ordinateur_ids: fixedOwner.ordinateur_ids ?? base.ordinateur_ids,
        ecran_ids: fixedOwner.ecran_ids ?? base.ecran_ids,
        office_licence_ids:
          fixedOwner.office_licence_ids ?? base.office_licence_ids,
      };
    }
    return base;
  }

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit([buildItem(values)]))}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="type">Type *</Label>
        <select
          id="type"
          className="w-full border rounded-md px-3 py-2 text-sm"
          {...register("type", { required: true })}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="numero">Numéro *</Label>
        <Input
          id="numero"
          placeholder="2024-0123"
          {...register("numero", { required: "Le numéro est obligatoire" })}
        />
        {errors.numero && (
          <p className="text-sm text-red-600 mt-1">{errors.numero.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="nom">Nom *</Label>
        <Input
          id="nom"
          placeholder="Facture Dell mars 2024"
          {...register("nom", { required: "Le nom est obligatoire" })}
        />
        {errors.nom && (
          <p className="text-sm text-red-600 mt-1">{errors.nom.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="path">Chemin réseau *</Label>
        <Input
          id="path"
          placeholder={"X:\\8-ADMINISTRATION GENERALE\\..."}
          {...register("path", { required: "Le chemin est obligatoire" })}
        />
        {errors.path && (
          <p className="text-sm text-red-600 mt-1">{errors.path.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="date_document">Date du document *</Label>
        <Input
          id="date_document"
          type="date"
          {...register("date_document", { required: "La date est obligatoire" })}
        />
      </div>

      {!fixedOwner && (
        <div className="space-y-3">
          <Label>Équipements liés</Label>
          <p className="text-xs text-muted-foreground -mt-1">
            Sélectionnez les équipements concernés. Le document peut être lié à
            plusieurs ordinateurs, écrans et licences à la fois.
          </p>

          {(ordinateurs?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Ordinateurs ({selectedOrds.length} sélectionné
                {selectedOrds.length > 1 ? "s" : ""})
              </p>
              <CheckList
                items={ordinateurs!}
                selected={selectedOrds}
                onToggle={toggle(setSelectedOrds)}
                label={(o) => o.nom_reseau ?? o.tag ?? `#${o.id}`}
              />
            </div>
          )}

          {(ecrans?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Écrans ({selectedEcrans.length} sélectionné
                {selectedEcrans.length > 1 ? "s" : ""})
              </p>
              <CheckList
                items={ecrans!}
                selected={selectedEcrans}
                onToggle={toggle(setSelectedEcrans)}
                label={(e) => e.tag ?? `#${e.id}`}
              />
            </div>
          )}

          {(licences?.length ?? 0) > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">
                Licences ({selectedLicences.length} sélectionné
                {selectedLicences.length > 1 ? "s" : ""})
              </p>
              <CheckList
                items={licences!}
                selected={selectedLicences}
                onToggle={toggle(setSelectedLicences)}
                label={(l) => l.version ?? `#${l.id}`}
              />
            </div>
          )}
        </div>
      )}

      {isFacture && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="montant_ht">Montant HT</Label>
            <Input
              id="montant_ht"
              type="number"
              step="0.01"
              {...register("montant_ht", {
                setValueAs: (v) => (v === "" ? null : Number(v)),
              })}
            />
          </div>
          <div>
            <Label htmlFor="montant_ttc">Montant TTC</Label>
            <Input
              id="montant_ttc"
              type="number"
              step="0.01"
              {...register("montant_ttc", {
                setValueAs: (v) => (v === "" ? null : Number(v)),
              })}
            />
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
