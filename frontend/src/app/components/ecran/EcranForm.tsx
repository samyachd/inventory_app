import { useForm } from "react-hook-form";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import type { Agent } from "@/app/types";
import type { EcranCreatePayload } from "@/app/services/ecran";
import type { OcrExtractedData } from "@/app/services/document";
import { OcrImportButton } from "../OcrImportButton";

const SEL = "w-full border rounded-md px-3 py-2 text-sm bg-background";

interface Props {
  agents: Agent[];
  onSubmit: (data: EcranCreatePayload) => void;
  isPending?: boolean;
  defaultValues?: Partial<EcranCreatePayload>;
  submitLabel?: string;
  onOcrExtracted?: (data: OcrExtractedData) => void;
}

export function EcranForm({
  agents,
  onSubmit,
  isPending,
  defaultValues,
  submitLabel = "Créer l'écran",
  onOcrExtracted,
}: Props) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<EcranCreatePayload>({
    defaultValues: {
      tag: defaultValues?.tag ?? "",
      marque: defaultValues?.marque ?? "",
      taille: defaultValues?.taille ?? null,
      service: defaultValues?.service ?? "",
      batiment: defaultValues?.batiment ?? "",
      fournisseur: defaultValues?.fournisseur ?? "",
      date_achat: defaultValues?.date_achat ?? "",
      fin_garantie: defaultValues?.fin_garantie ?? "",
      agent_id: defaultValues?.agent_id ?? null,
    },
  });

  const submit = (values: EcranCreatePayload) => {
    onSubmit({
      ...values,
      marque: values.marque || null,
      service: (values.service as string) || null,
      batiment: (values.batiment as string) || null,
      fournisseur: (values.fournisseur as string) || null,
      date_achat: (values.date_achat as string) || null,
      fin_garantie: (values.fin_garantie as string) || null,
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      {onOcrExtracted && (
        <div className="flex justify-end">
          <OcrImportButton
            onExtracted={(d) => {
              if (d.marque) setValue("marque", d.marque);
              if (d.date_achat) setValue("date_achat", d.date_achat);
              onOcrExtracted(d);
            }}
          />
        </div>
      )}

      <div className="overflow-y-auto max-h-[60vh] space-y-3 pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="tag">Tag *</Label>
            <Input id="tag" placeholder="SN5678" {...register("tag", { required: "Le tag est obligatoire" })} />
            {errors.tag && <p className="text-sm text-red-600 mt-1">{errors.tag.message}</p>}
          </div>
          <div>
            <Label htmlFor="marque">Marque</Label>
            <Input id="marque" placeholder="Dell" {...register("marque")} />
          </div>
        </div>

        <div>
          <Label htmlFor="taille">Taille (")</Label>
          <Input
            id="taille"
            type="number"
            step="0.1"
            min="0"
            placeholder="24"
            {...register("taille", {
              setValueAs: (v) => (v === "" || v == null) ? null : parseFloat(v),
            })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="service">Service</Label>
            <Input id="service" placeholder="État Civil" {...register("service")} />
          </div>
          <div>
            <Label htmlFor="batiment">Bâtiment</Label>
            <Input id="batiment" placeholder="Mairie" {...register("batiment")} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="fournisseur">Fournisseur</Label>
            <Input id="fournisseur" placeholder="Dell France" {...register("fournisseur")} />
          </div>
          <div>
            <Label htmlFor="agent_id">Agent/Classe</Label>
            <select
              id="agent_id"
              className={SEL}
              {...register("agent_id", {
                setValueAs: (v) => (v === "" ? null : Number(v)),
              })}
            >
              <option value="">— Aucun —</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.nom}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="date_achat">Date achat</Label>
            <Input id="date_achat" type="date" {...register("date_achat")} />
          </div>
          <div>
            <Label htmlFor="fin_garantie">Fin garantie</Label>
            <Input id="fin_garantie" type="date" {...register("fin_garantie")} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
