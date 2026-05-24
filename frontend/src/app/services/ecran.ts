import api from "./api";
import type { Ecran } from "@/app/types";

export interface EcranCreatePayload {
  tag: string | null;
  marque: string | null;
  taille: number | null;
  proprietaire: string | null;
  service: string | null;
  batiment: string | null;
  fournisseur: string | null;
  date_achat: string | null;
  fin_garantie: string | null;
  agent_id: number | null;
}

export type EcranUpdatePayload = EcranCreatePayload;

export async function createEcran(data: EcranCreatePayload): Promise<Ecran> {
  const response = await api.post<Ecran>("/ecrans/", data);
  return response.data;
}

export async function deleteEcran(id: number): Promise<void> {
  await api.delete(`/ecrans/${id}`);
}

export async function updateEcran(
  id: number,
  data: EcranUpdatePayload
): Promise<Ecran> {
  const response = await api.put<Ecran>(`/ecrans/${id}/`, data);
  return response.data;
}
