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
  ordinateur_ids?: number[];
  ecran_ids?: number[];
  office_licence_ids?: number[];
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
  // Document
  type_document?: DocumentType | null;
  numero_document?: string | null;
  numero_de_commande?: string | null;
  date_document?: string | null;
  montant_ttc?: number | null;
  montant_ht?: number | null;
  // Common equipment
  type_equipement?: string | null;
  marque?: string | null;
  tag?: string | null;
  fournisseur?: string | null;
  date_achat?: string | null;
  fin_garantie?: string | null;
  proprietaire?: string | null;
  service?: string | null;
  batiment?: string | null;
  // Ordinateur-specific
  ram?: string | null;
  os?: string | null;
  nom_reseau?: string | null;
  ip_address?: string | null;
  mac_ethernet?: string | null;
  mac_wifi?: string | null;
  tag_chargeur?: string | null;
  watt?: number | null;
  clef_wifi?: boolean | null;
  lecteur_cd?: boolean | null;
  casque?: boolean | null;
  absolute_dell?: boolean | null;
  // Ecran-specific
  taille?: number | null;
  slot?: number | null;
  // Licence-specific
  type_licence?: string | null;
  version_logiciel?: string | null;
  clef_licence?: string | null;
  mail_activation?: string | null;
}

export interface OcrMetriques {
  taux_completude: number;
  nb_champs_extraits: number;
  nb_champs_vides: number;
  nb_pages: number;
  duree_ocr_ms: number;
  duree_extraction_ms: number;
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
