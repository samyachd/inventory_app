import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { extractFromFile, type OcrExtractedData } from "@/app/services/document";

interface Props {
  onExtracted: (data: OcrExtractedData) => void;
}

const ACCEPT = "application/pdf,image/jpeg,image/png";

export function OcrImportButton({ onExtracted }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);

  const handleFile = async (file: File) => {
    setPending(true);
    try {
      const result = await extractFromFile(file);
      const first = result.donnees[0];
      if (!first) {
        toast.warning("Aucun équipement détecté dans le document");
        return;
      }
      onExtracted(first);
      const filled = Object.values(first).filter((v) => v != null).length;
      const extra = result.donnees.length - 1;
      toast.success("Document analysé", {
        description:
          `${filled} champ${filled > 1 ? "s" : ""} extrait${filled > 1 ? "s" : ""}. Vérifiez avant d'enregistrer.` +
          (extra > 0 ? ` (${extra} équipement${extra > 1 ? "s" : ""} supplémentaire${extra > 1 ? "s" : ""} ignoré${extra > 1 ? "s" : ""} — utilisez l'import en lot pour tout traiter.)` : ""),
      });
    } catch (e) {
      toast.error("Échec de l'analyse OCR", {
        description: e instanceof Error ? e.message : "Erreur inconnue",
      });
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4 mr-2" />
        {pending ? "Analyse en cours..." : "Importer OCR"}
      </Button>
    </>
  );
}
