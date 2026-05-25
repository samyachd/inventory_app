import { useForm } from "react-hook-form";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import type { LicenceCreatePayload } from "@/app/services/officelicence";
import type { OcrExtractedData } from "@/app/services/document";
import { OcrImportButton } from "../OcrImportButton";

interface Props {
  onSubmit: (data: LicenceCreatePayload) => void;
  isPending?: boolean;
  defaultValues?: Partial<LicenceCreatePayload>;
  submitLabel?: string;
  onOcrExtracted?: (data: OcrExtractedData) => void;
}

export function OfficeLicenceForm({
  onSubmit,
  isPending,
  defaultValues,
  submitLabel = "Créer la licence",
  onOcrExtracted,
}: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LicenceCreatePayload>({
    defaultValues: {
      version: defaultValues?.version ?? "",
      type_licence: defaultValues?.type_licence ?? "",
      date_achat: defaultValues?.date_achat ?? "",
      fournisseur: defaultValues?.fournisseur ?? "",
      clef: defaultValues?.clef ?? "",
      mail_activation: defaultValues?.mail_activation ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="flex justify-end">
        <OcrImportButton
          onExtracted={(d) => {
            if (d.fournisseur) setValue("fournisseur", d.fournisseur);
            if (d.date_achat) setValue("date_achat", d.date_achat);
            onOcrExtracted?.(d);
          }}
        />
      </div>

      <div>
        <Label htmlFor="version">Version *</Label>
        <Input
          id="version"
          placeholder="Office 2021 Standard"
          {...register("version", { required: "La version est obligatoire" })}
        />
        {errors.version && (
          <p className="text-sm text-red-600 mt-1">{errors.version.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="type_licence">Type de licence</Label>
        <Input
          id="type_licence"
          placeholder="OEM"
          {...register("type_licence")}
        />
      </div>

      <div>
        <Label htmlFor="date_achat">Date d'achat</Label>
        <Input id="date_achat" type="date" {...register("date_achat")} />
      </div>

      <div>
        <Label htmlFor="fournisseur">Fournisseur</Label>
        <Input
          id="fournisseur"
          placeholder="Microsoft Direct"
          {...register("fournisseur")}
        />
      </div>

      <div>
        <Label htmlFor="clef">Clé d'activation *</Label>
        <Input
          id="clef"
          {...register("clef", { required: "La clé d'activation est obligatoire" })}
        />
        {errors.clef && (
          <p className="text-sm text-red-600 mt-1">{errors.clef.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="mail_activation">Email d'activation</Label>
        <Input
          id="mail_activation"
          type="email"
          {...register("mail_activation")}
        />
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
