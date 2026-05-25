import type { Document, DocumentType } from "@/app/types";
import type {
  DocumentCreatePayload,
  OcrExtractedData,
} from "@/app/services/document";

function pickNumero(ocr: OcrExtractedData): string | null {
  const n = ocr.numero_document ?? ocr.numero_de_commande;
  return n && n.trim() ? n.trim() : null;
}

function pickType(ocr: OcrExtractedData): DocumentType | null {
  return ocr.type_document ?? null;
}

function buildNom(ocr: OcrExtractedData, type: DocumentType, numero: string): string {
  const label = type === "bon_de_commande" ? "BC" : type === "devis" ? "Devis" : "Facture";
  const fournisseur = ocr.fournisseur?.trim();
  return fournisseur ? `${label} ${numero} — ${fournisseur}` : `${label} ${numero}`;
}

export function ocrToDocumentDefaults(
  ocr: OcrExtractedData
): Partial<DocumentCreatePayload> | null {
  const type = pickType(ocr);
  const numero = pickNumero(ocr);
  if (!type || !numero) return null;

  return {
    type,
    nom: buildNom(ocr, type, numero),
    numero,
    date_document: ocr.date_document ?? undefined,
    montant_ttc: ocr.montant_ttc ?? null,
    montant_ht: ocr.montant_ht ?? null,
  };
}

export function isDocumentAlreadyRegistered(
  ocr: OcrExtractedData,
  documents: Document[]
): boolean {
  const type = pickType(ocr);
  const numero = pickNumero(ocr);
  if (!type || !numero) return false;
  const target = numero.toLowerCase();
  return documents.some(
    (d) => d.type === type && d.numero.trim().toLowerCase() === target
  );
}
