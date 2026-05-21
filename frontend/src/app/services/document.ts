import api from "./api";
import type { Document, DocumentType } from "@/app/types";

export interface DocumentCreatePayload {
  type: DocumentType;
  nom: string;
  numero: string;
  path: string;
  date_document: string;
  montant_ttc?: number | null;
  montant_ht?: number | null;
  ordinateur_id?: number | null;
  ecran_id?: number | null;
  office_licence_id?: number | null;
}

export type DocumentUpdatePayload = Partial<Omit<DocumentCreatePayload, "type">>;

export async function createDocument(
  data: DocumentCreatePayload
): Promise<Document> {
  const response = await api.post<Document>("/documents/", data);
  return response.data;
}

export async function deleteDocument(id: number): Promise<void> {
  await api.delete(`/documents/${id}`);
}

export async function updateDocument(
  id: number,
  data: DocumentUpdatePayload
): Promise<Document> {
  const response = await api.put<Document>(`/documents/${id}/`, data);
  return response.data;
}

// ────────── OCR ──────────

export interface OcrExtractedData {
  type_document?: DocumentType | null;
  fournisseur?: string | null;
  marque?: string | null;
  numero_document?: string | null;
  numero_de_commande?: string | null;
  tag?: string | null;
  date_document?: string | null;
  date_achat?: string | null;
  fin_garantie?: string | null;
  montant_ttc?: number | null;
  montant_ht?: number | null;
  type_equipement?: string | null;
}

export interface OcrMetriques {
  taux_completude: number;
  nb_champs_extraits: number;
  nb_champs_vides: number;
  nb_pages: number;
  duree_ocr_ms: number;
  duree_extraction_ms: number;
}

export interface OcrResponse {
  donnees: OcrExtractedData[];
  metriques: OcrMetriques;
}

export async function extractFromFile(file: File): Promise<OcrResponse> {
  const form = new FormData();
  form.append("file", file);
  const response = await api.post<OcrResponse>("/models/extract", form);
  return response.data;
}
