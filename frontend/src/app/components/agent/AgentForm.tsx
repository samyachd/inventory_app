import { useForm } from "react-hook-form";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import type { AgentPayload } from "@/app/services/agent";

type BoolStr = "" | "true" | "false";
type FormValues = Omit<AgentPayload, "clef_wifi" | "casque"> & {
  clef_wifi: BoolStr;
  casque: BoolStr;
};

const SEL = "w-full border rounded-md px-3 py-2 text-sm bg-background";
const boolToStr = (v: boolean | null | undefined): BoolStr =>
  v == null ? "" : v ? "true" : "false";
const strToBool = (v: BoolStr): boolean | null =>
  v === "" ? null : v === "true";

interface Props {
  onSubmit: (data: AgentPayload) => void;
  isPending?: boolean;
  defaultValues?: Partial<AgentPayload>;
  submitLabel?: string;
}

export function AgentForm({
  onSubmit,
  isPending,
  defaultValues,
  submitLabel = "Créer l'agent",
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      nom: defaultValues?.nom ?? "",
      email: defaultValues?.email ?? "",
      telephone: defaultValues?.telephone ?? "",
      clef_wifi: boolToStr(defaultValues?.clef_wifi),
      casque: boolToStr(defaultValues?.casque),
    },
  });

  const submit = (values: FormValues) => {
    onSubmit({
      ...values,
      email: values.email || null,
      telephone: values.telephone || null,
      clef_wifi: strToBool(values.clef_wifi),
      casque: strToBool(values.casque),
    });
  };

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4">
      <div>
        <Label htmlFor="nom">Nom *</Label>
        <Input
          id="nom"
          placeholder="Jean Dupont"
          {...register("nom", { required: "Le nom est obligatoire" })}
        />
        {errors.nom && (
          <p className="text-sm text-red-600 mt-1">{errors.nom.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="jean.dupont@mairie.fr"
          {...register("email", {
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Format d'email invalide",
            },
          })}
        />
        {errors.email && (
          <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="telephone">Téléphone</Label>
        <Input
          id="telephone"
          type="tel"
          placeholder="01 23 45 67 89"
          {...register("telephone")}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="clef_wifi">Clef WiFi</Label>
          <select id="clef_wifi" className={SEL} {...register("clef_wifi")}>
            <option value="">—</option>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
        </div>
        <div>
          <Label htmlFor="casque">Casque</Label>
          <select id="casque" className={SEL} {...register("casque")}>
            <option value="">—</option>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Enregistrement..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}