import { useState, useCallback } from "react";
import { Upload, Plus, Trash2, Check, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { extractFromFile, type OcrExtractedData } from "@/app/services/document";
import { createOrdinateur } from "@/app/services/ordinateur";
import { createEcran } from "@/app/services/ecran";
import { useInventaire } from "@/app/hooks/useInventaire";

// ─── Draft types (all fields are strings for controlled inputs) ───────────────

type OrdDraft = {
  _id: string;
  tag: string;
  marque: string;
  type_equipement: string;
  os: string;
  ram: string;
  fournisseur: string;
  date_achat: string;
  fin_garantie: string;
  proprietaire: string;
  service: string;
  batiment: string;
  nom_reseau: string;
  ip_address: string;
  mac_ethernet: string;
  mac_wifi: string;
  tag_chargeur: string;
  watt: string;
  lecteur_cd: boolean | null;
  absolute_dell: boolean | null;
  agent_id: string;
};

type EcrDraft = {
  _id: string;
  tag: string;
  marque: string;
  taille: string;
  fournisseur: string;
  date_achat: string;
  fin_garantie: string;
  proprietaire: string;
  service: string;
  batiment: string;
  agent_id: string;
};

const uid = () => Math.random().toString(36).slice(2);

const emptyOrd = (): OrdDraft => ({
  _id: uid(), tag: "", marque: "", type_equipement: "PC FIXE",
  os: "", ram: "", fournisseur: "", date_achat: "", fin_garantie: "",
  proprietaire: "", service: "", batiment: "", nom_reseau: "",
  ip_address: "", mac_ethernet: "", mac_wifi: "", tag_chargeur: "",
  watt: "", lecteur_cd: null, absolute_dell: null, agent_id: "",
});

const emptyEcr = (): EcrDraft => ({
  _id: uid(), tag: "", marque: "", taille: "", fournisseur: "",
  date_achat: "", fin_garantie: "", proprietaire: "", service: "",
  batiment: "", agent_id: "",
});

function ocrToRows(items: OcrExtractedData[]): { ords: OrdDraft[]; ecrs: EcrDraft[] } {
  const ords: OrdDraft[] = [];
  const ecrs: EcrDraft[] = [];

  for (const ocr of items) {
    const common = {
      tag: ocr.tag ?? "",
      marque: ocr.marque ?? "",
      fournisseur: ocr.fournisseur ?? "",
      date_achat: ocr.date_achat ?? "",
      fin_garantie: ocr.fin_garantie ?? "",
      proprietaire: ocr.proprietaire ?? "",
      service: ocr.service ?? "",
      batiment: ocr.batiment ?? "",
    };
    if (ocr.type_equipement === "ECRAN") {
      ecrs.push({
        ...emptyEcr(), ...common,
        taille: ocr.taille != null ? String(ocr.taille) : "",
      });
    } else {
      ords.push({
        ...emptyOrd(), ...common,
        type_equipement: ocr.type_equipement ?? "PC FIXE",
        ram: ocr.ram ?? "",
        os: ocr.os ?? "",
        nom_reseau: ocr.nom_reseau ?? "",
        ip_address: ocr.ip_address ?? "",
        mac_ethernet: ocr.mac_ethernet ?? "",
        mac_wifi: ocr.mac_wifi ?? "",
        tag_chargeur: ocr.tag_chargeur ?? "",
        watt: ocr.watt != null ? String(ocr.watt) : "",
        lecteur_cd: ocr.lecteur_cd ?? null,
        absolute_dell: ocr.absolute_dell ?? null,
      });
    }
  }

  return { ords, ecrs };
}

// ─── Cell helpers ─────────────────────────────────────────────────────────────

function TCell({ children }: { children: React.ReactNode }) {
  return <td className="px-2 py-1 border-b">{children}</td>;
}

function TInput({
  value, onChange, placeholder, required, type = "text",
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; type?: string;
}) {
  return (
    <Input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className={`h-7 text-xs min-w-[90px] ${required && !value ? "border-red-400" : ""}`}
    />
  );
}

function TSelect({
  value, onChange, children,
}: {
  value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 text-xs border rounded px-1 min-w-[110px] bg-white"
    >
      {children}
    </select>
  );
}

// ─── Ordinateur table ─────────────────────────────────────────────────────────

const ORD_TYPES = ["PC FIXE", "PC PORTABLE", "AUTRE"];

function OrdTable({
  rows, agents, onChange, onDelete,
}: {
  rows: OrdDraft[];
  agents: { id: number; nom: string }[];
  onChange: (id: string, field: keyof OrdDraft, val: string) => void;
  onDelete: (id: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h3 className="font-semibold text-sm mb-2">
        Ordinateurs <span className="text-muted-foreground font-normal">({rows.length})</span>
      </h3>
      <div className="overflow-x-auto rounded border">
        <table className="text-xs w-full">
          <thead className="bg-gray-50 text-muted-foreground">
            <tr>
              {["Tag", "Marque", "Type", "OS", "RAM", "IP", "Fournisseur", "Date achat", "Fin garantie", "Service", "Bâtiment", "Agent", ""].map((h) => (
                <th key={h} className="px-2 py-2 text-left font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="hover:bg-gray-50">
                <TCell><TInput value={r.tag} onChange={(v) => onChange(r._id, "tag", v)} placeholder="PC-001" /></TCell>
                <TCell><TInput value={r.marque} onChange={(v) => onChange(r._id, "marque", v)} placeholder="Dell" /></TCell>
                <TCell>
                  <TSelect value={r.type_equipement} onChange={(v) => onChange(r._id, "type_equipement", v)}>
                    {ORD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </TSelect>
                </TCell>
                <TCell><TInput value={r.os} onChange={(v) => onChange(r._id, "os", v)} placeholder="Windows 11" /></TCell>
                <TCell><TInput value={r.ram} onChange={(v) => onChange(r._id, "ram", v)} placeholder="8 Go" /></TCell>
                <TCell><TInput value={r.ip_address} onChange={(v) => onChange(r._id, "ip_address", v)} placeholder="192.168.1.1" /></TCell>
                <TCell><TInput value={r.fournisseur} onChange={(v) => onChange(r._id, "fournisseur", v)} placeholder="Fournisseur" /></TCell>
                <TCell><TInput type="date" value={r.date_achat} onChange={(v) => onChange(r._id, "date_achat", v)} /></TCell>
                <TCell><TInput type="date" value={r.fin_garantie} onChange={(v) => onChange(r._id, "fin_garantie", v)} /></TCell>
                <TCell><TInput value={r.service} onChange={(v) => onChange(r._id, "service", v)} placeholder="Service" /></TCell>
                <TCell><TInput value={r.batiment} onChange={(v) => onChange(r._id, "batiment", v)} placeholder="Bâtiment" /></TCell>
                <TCell>
                  <TSelect value={r.agent_id} onChange={(v) => onChange(r._id, "agent_id", v)}>
                    <option value="">—</option>
                    {agents.map((a) => <option key={a.id} value={String(a.id)}>{a.nom}</option>)}
                  </TSelect>
                </TCell>
                <TCell>
                  <button onClick={() => onDelete(r._id)} className="text-gray-400 hover:text-red-500 p-0.5">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </TCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Écran table ──────────────────────────────────────────────────────────────

function EcrTable({
  rows, agents, onChange, onDelete,
}: {
  rows: EcrDraft[];
  agents: { id: number; nom: string }[];
  onChange: (id: string, field: keyof EcrDraft, val: string) => void;
  onDelete: (id: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <h3 className="font-semibold text-sm mb-2">
        Écrans <span className="text-muted-foreground font-normal">({rows.length})</span>
      </h3>
      <div className="overflow-x-auto rounded border">
        <table className="text-xs w-full">
          <thead className="bg-gray-50 text-muted-foreground">
            <tr>
              {["Tag", "Marque", "Taille (po)", "Fournisseur", "Date achat", "Fin garantie", "Service", "Bâtiment", "Agent", ""].map((h) => (
                <th key={h} className="px-2 py-2 text-left font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className="hover:bg-gray-50">
                <TCell><TInput value={r.tag} onChange={(v) => onChange(r._id, "tag", v)} placeholder="SCR-001" /></TCell>
                <TCell><TInput value={r.marque} onChange={(v) => onChange(r._id, "marque", v)} placeholder="LG" /></TCell>
                <TCell><TInput type="number" value={r.taille} onChange={(v) => onChange(r._id, "taille", v)} placeholder="24" /></TCell>
                <TCell><TInput value={r.fournisseur} onChange={(v) => onChange(r._id, "fournisseur", v)} placeholder="Fournisseur" /></TCell>
                <TCell><TInput type="date" value={r.date_achat} onChange={(v) => onChange(r._id, "date_achat", v)} /></TCell>
                <TCell><TInput type="date" value={r.fin_garantie} onChange={(v) => onChange(r._id, "fin_garantie", v)} /></TCell>
                <TCell><TInput value={r.service} onChange={(v) => onChange(r._id, "service", v)} placeholder="Service" /></TCell>
                <TCell><TInput value={r.batiment} onChange={(v) => onChange(r._id, "batiment", v)} placeholder="Bâtiment" /></TCell>
                <TCell>
                  <TSelect value={r.agent_id} onChange={(v) => onChange(r._id, "agent_id", v)}>
                    <option value="">—</option>
                    {agents.map((a) => <option key={a.id} value={String(a.id)}>{a.nom}</option>)}
                  </TSelect>
                </TCell>
                <TCell>
                  <button onClick={() => onDelete(r._id)} className="text-gray-400 hover:text-red-500 p-0.5">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </TCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const LOW_CONFIDENCE_THRESHOLD = 0.3;

type Phase = "upload" | "uploading" | "review" | "low_confidence" | "error";

export function Ocr() {
  const [phase, setPhase] = useState<Phase>("upload");
  const [dragging, setDragging] = useState(false);
  const [ords, setOrds] = useState<OrdDraft[]>([]);
  const [ecrs, setEcrs] = useState<EcrDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [completude, setCompletude] = useState<number>(0);

  const queryClient = useQueryClient();
  const { data: inv } = useInventaire();
  const agents = inv?.agents ?? [];

  const reset = () => {
    setOrds([]);
    setEcrs([]);
    setErrorMessage("");
    setCompletude(0);
    setPhase("upload");
  };

  const handleFile = async (file: File) => {
    setPhase("uploading");
    try {
      const response = await extractFromFile(file);
      const { metriques, donnees } = response;
      const { ords: o, ecrs: e } = ocrToRows(donnees);

      if (donnees.length === 0) {
        setErrorMessage("Le document ne contient aucun équipement identifiable.");
        setPhase("low_confidence");
        return;
      }

      if (metriques.taux_completude < LOW_CONFIDENCE_THRESHOLD) {
        setOrds(o);
        setEcrs(e);
        setCompletude(metriques.taux_completude);
        setPhase("low_confidence");
        return;
      }

      setOrds(o);
      setEcrs(e);
      setPhase("review");
      const total = o.length + e.length;
      toast.success("Document analysé", {
        description: `${total} ligne${total > 1 ? "s" : ""} générée${total > 1 ? "s" : ""}. Vérifiez avant de confirmer.`,
      });
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Erreur inconnue");
      setPhase("error");
    }
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, []);

  const changeOrd = (id: string, field: keyof OrdDraft, val: string) =>
    setOrds((prev) => prev.map((r) => r._id === id ? { ...r, [field]: val } : r));

  const changeEcr = (id: string, field: keyof EcrDraft, val: string) =>
    setEcrs((prev) => prev.map((r) => r._id === id ? { ...r, [field]: val } : r));

  const handleConfirm = async () => {
    setSubmitting(true);
    let errors = 0;

    for (const r of ords) {
      try {
        await createOrdinateur({
          tag: r.tag || null,
          marque: r.marque || null,
          type_equipement: r.type_equipement || null,
          os: r.os || null,
          ram: r.ram || null,
          fournisseur: r.fournisseur || null,
          date_achat: r.date_achat || null,
          fin_garantie: r.fin_garantie || null,
          proprietaire: r.proprietaire || null,
          service: r.service || null,
          batiment: r.batiment || null,
          nom_reseau: r.nom_reseau || null,
          ip_address: r.ip_address || null,
          mac_ethernet: r.mac_ethernet || null,
          mac_wifi: r.mac_wifi || null,
          tag_chargeur: r.tag_chargeur || null,
          watt: r.watt ? Number(r.watt) : null,
          lecteur_cd: r.lecteur_cd,
          absolute_dell: r.absolute_dell,
          agent_id: r.agent_id ? Number(r.agent_id) : null,
        });
      } catch {
        errors++;
      }
    }

    for (const r of ecrs) {
      try {
        await createEcran({
          tag: r.tag || null,
          marque: r.marque || null,
          taille: r.taille ? Number(r.taille) : null,
          fournisseur: r.fournisseur || null,
          date_achat: r.date_achat || null,
          fin_garantie: r.fin_garantie || null,
          proprietaire: r.proprietaire || null,
          service: r.service || null,
          batiment: r.batiment || null,
          agent_id: r.agent_id ? Number(r.agent_id) : null,
        });
      } catch {
        errors++;
      }
    }

    setSubmitting(false);
    const total = ords.length + ecrs.length;

    if (errors === 0) {
      toast.success(`${total} équipement${total > 1 ? "s" : ""} créé${total > 1 ? "s" : ""}`);
      queryClient.invalidateQueries({ queryKey: ["inventaire"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
      reset();
    } else {
      toast.error(`${errors} erreur${errors > 1 ? "s" : ""} sur ${total} lignes`);
      queryClient.invalidateQueries({ queryKey: ["inventaire"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    }
  };

  // ── Error phase ───────────────────────────────────────────────────────────────

  if (phase === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] gap-6">
        <XCircle className="w-16 h-16 text-red-400" />
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Échec de l'analyse</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">{errorMessage}</p>
        </div>
        <Button onClick={reset}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Réessayer
        </Button>
      </div>
    );
  }

  // ── Low-confidence phase ──────────────────────────────────────────────────────

  if (phase === "low_confidence") {
    const total = ords.length + ecrs.length;
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] gap-6">
        <AlertTriangle className="w-16 h-16 text-amber-400" />
        <div className="text-center">
          <h2 className="text-xl font-semibold text-amber-600">Résultats peu fiables</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {total === 0
              ? "Aucun équipement identifiable dans ce document. Vérifiez que le fichier est lisible et contient bien un devis, bon de commande ou facture."
              : `${total} équipement${total > 1 ? "s" : ""} trouvé${total > 1 ? "s" : ""} mais seulement ${Math.round(completude * 100)} % des champs ont pu être remplis. Le document est peut-être illisible ou hors-sujet.`}
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={reset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
          {total > 0 && (
            <Button variant="outline" onClick={() => setPhase("review")}>
              Continuer quand même
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Upload zone ───────────────────────────────────────────────────────────────

  if (phase !== "review") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Analyse OCR</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Déposez un document pour extraire automatiquement les informations
          </p>
        </div>

        <div
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDragEnd={() => setDragging(false)}
          onClick={() => phase === "upload" && document.getElementById("ocr-input")?.click()}
          className={[
            "w-full max-w-lg h-60 rounded-2xl border-2 border-dashed",
            "flex flex-col items-center justify-center gap-3 select-none transition-colors",
            phase === "uploading"
              ? "cursor-default opacity-60 border-gray-300 bg-gray-50"
              : dragging
              ? "cursor-copy border-blue-400 bg-blue-50"
              : "cursor-pointer border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50",
          ].join(" ")}
        >
          <input
            id="ocr-input"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
              e.target.value = "";
            }}
          />
          {phase === "uploading" ? (
            <>
              <div className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
              <p className="text-sm text-muted-foreground">Analyse en cours…</p>
            </>
          ) : (
            <>
              <Upload className="w-12 h-12 text-gray-300" />
              <div className="text-center space-y-1">
                <p className="font-medium text-gray-700">Glissez un fichier ici</p>
                <p className="text-sm text-muted-foreground">ou cliquez pour sélectionner</p>
                <p className="text-xs text-muted-foreground">PDF · JPEG · PNG</p>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Review phase ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vérification des données</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Vérifiez et complétez les informations extraites avant de confirmer.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={reset}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || (ords.length + ecrs.length === 0)}>
            <Check className="w-4 h-4 mr-2" />
            {submitting ? "Enregistrement…" : `Confirmer (${ords.length + ecrs.length})`}
          </Button>
        </div>
      </div>

      <OrdTable rows={ords} agents={agents} onChange={changeOrd} onDelete={(id) => setOrds((p) => p.filter((r) => r._id !== id))} />
      <EcrTable rows={ecrs} agents={agents} onChange={changeEcr} onDelete={(id) => setEcrs((p) => p.filter((r) => r._id !== id))} />

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setOrds((p) => [...p, emptyOrd()])}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter un ordinateur
        </Button>
        <Button variant="outline" size="sm" onClick={() => setEcrs((p) => [...p, emptyEcr()])}>
          <Plus className="w-4 h-4 mr-1" /> Ajouter un écran
        </Button>
      </div>
    </div>
  );
}
