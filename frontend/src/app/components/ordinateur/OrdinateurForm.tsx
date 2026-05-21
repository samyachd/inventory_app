import { useForm } from "react-hook-form";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import type { Agent } from "@/app/types";
import type { OrdinateurCreatePayload } from "@/app/services/ordinateur";
import type { OcrExtractedData } from "@/app/services/document";
import { OcrImportButton } from "../OcrImportButton";

const SEL = "w-full border rounded-md px-3 py-2 text-sm bg-background";

type BoolStr = "" | "true" | "false";
type FormValues = Omit<OrdinateurCreatePayload, "lecteur_cd" | "absolute_dell"> & {
  lecteur_cd: BoolStr;
  absolute_dell: BoolStr;
};

const boolToStr = (v: boolean | null | undefined): BoolStr =>
  v == null ? "" : v ? "true" : "false";
const strToBool = (v: BoolStr): boolean | null =>
  v === "" ? null : v === "true";

interface Props {
  agents: Agent[];
  onSubmit: (data: OrdinateurCreatePayload) => void;
  isPending?: boolean;
  defaultValues?: Partial<OrdinateurCreatePayload>;
  submitLabel?: string;
  onOcrExtracted?: (data: OcrExtractedData) => void;
}

export function OrdinateurForm({
  agents,
  onSubmit,
  isPending,
  defaultValues,
  submitLabel = "Créer l'ordinateur",
  onOcrExtracted,
}: Props) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      tag: defaultValues?.tag ?? "",
      nom_reseau: defaultValues?.nom_reseau ?? "",
      marque: defaultValues?.marque ?? "",
      type_equipement: defaultValues?.type_equipement ?? "",
      os: defaultValues?.os ?? "",
      ram: defaultValues?.ram ?? "",
      service: defaultValues?.service ?? "",
      batiment: defaultValues?.batiment ?? "",
      fournisseur: defaultValues?.fournisseur ?? "",
      date_achat: defaultValues?.date_achat ?? "",
      fin_garantie: defaultValues?.fin_garantie ?? "",
      ip_address: defaultValues?.ip_address ?? "",
      mac_ethernet: defaultValues?.mac_ethernet ?? "",
      mac_wifi: defaultValues?.mac_wifi ?? "",
      lecteur_cd: boolToStr(defaultValues?.lecteur_cd),
      absolute_dell: boolToStr(defaultValues?.absolute_dell),
      watt: defaultValues?.watt ?? null,
      agent_id: defaultValues?.agent_id ?? null,
    },
  });

  const submit = (values: FormValues) => {
    onSubmit({
      ...values,
      nom_reseau: values.nom_reseau || null,
      marque: values.marque || null,
      type_equipement: values.type_equipement || null,
      os: values.os || null,
      ram: values.ram || null,
      service: values.service || null,
      batiment: values.batiment || null,
      fournisseur: values.fournisseur || null,
      date_achat: values.date_achat || null,
      fin_garantie: values.fin_garantie || null,
      ip_address: values.ip_address || null,
      mac_ethernet: values.mac_ethernet || null,
      mac_wifi: values.mac_wifi || null,
      lecteur_cd: strToBool(values.lecteur_cd),
      absolute_dell: strToBool(values.absolute_dell),
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
              if (d.tag) setValue("tag", d.tag);
              onOcrExtracted(d);
            }}
          />
        </div>
      )}

      <div className="overflow-y-auto max-h-[60vh] space-y-3 pr-1">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="tag">Tag *</Label>
            <Input id="tag" placeholder="SN1234" {...register("tag", { required: "Le tag est obligatoire" })} />
            {errors.tag && <p className="text-sm text-red-600 mt-1">{errors.tag.message}</p>}
          </div>
          <div>
            <Label htmlFor="nom_reseau">Nom réseau</Label>
            <Input id="nom_reseau" placeholder="ORD-006" {...register("nom_reseau")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="marque">Marque</Label>
            <Input id="marque" placeholder="Dell" {...register("marque")} />
          </div>
          <div>
            <Label htmlFor="type_equipement">Type</Label>
            <select id="type_equipement" className={SEL} {...register("type_equipement")}>
              <option value="">—</option>
              <option value="PC FIXE">PC FIXE</option>
              <option value="PC PORTABLE">PC PORTABLE</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="os">OS</Label>
            <Input id="os" placeholder="Windows 11 Pro" {...register("os")} />
          </div>
          <div>
            <Label htmlFor="ram">RAM</Label>
            <Input id="ram" placeholder="16 Go" {...register("ram")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="service">Service</Label>
            <Input id="service" placeholder="État Civil" {...register("service")} />
          </div>
          <div>
            <Label htmlFor="batiment">Bâtiment</Label>
            <Input id="batiment" placeholder="Mairie" {...register("batiment")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ip_address">IP</Label>
            <Input id="ip_address" placeholder="192.168.1.1" {...register("ip_address")} />
          </div>
          <div>
            <Label htmlFor="watt">Watt</Label>
            <Input
              id="watt"
              type="number"
              min="0"
              placeholder="65"
              {...register("watt", {
                setValueAs: (v) => (v === "" || v == null) ? null : Number(v),
              })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="mac_ethernet">MAC Ethernet</Label>
            <Input id="mac_ethernet" placeholder="aa:bb:cc:dd:ee:ff" {...register("mac_ethernet")} />
          </div>
          <div>
            <Label htmlFor="mac_wifi">MAC WiFi</Label>
            <Input id="mac_wifi" placeholder="aa:bb:cc:dd:ee:ff" {...register("mac_wifi")} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="lecteur_cd">Lecteur CD</Label>
            <select id="lecteur_cd" className={SEL} {...register("lecteur_cd")}>
              <option value="">—</option>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>
          </div>
          <div>
            <Label htmlFor="absolute_dell">Absolute Dell</Label>
            <select id="absolute_dell" className={SEL} {...register("absolute_dell")}>
              <option value="">—</option>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
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

        <div className="grid grid-cols-2 gap-3">
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
