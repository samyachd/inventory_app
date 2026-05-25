import api from "./api";
import type { Ordinateur } from "@/app/types";

export interface OrdinateurCreatePayload {
  tag: string | null;
  nom_reseau: string | null;
  marque: string | null;
  type_equipement: string | null;
  os: string | null;
  ram: string | null;
  proprietaire: string | null;
  service: string | null;
  batiment: string | null;
  fournisseur: string | null;
  date_achat: string | null;
  fin_garantie: string | null;
  ip_address: string | null;
  mac_ethernet: string | null;
  mac_wifi: string | null;
  tag_chargeur: string | null;
  lecteur_cd: boolean | null;
  absolute_dell: boolean | null;
  watt: number | null;
  agent_id: number | null;
}

export type OrdinateurUpdatePayload = Partial<OrdinateurCreatePayload> & {
  officelicence_id?: number | null;
};

export async function createOrdinateur(
  data: OrdinateurCreatePayload
): Promise<Ordinateur> {
  const response = await api.post<Ordinateur>("/ordinateurs/", data);
  return response.data;
}

export async function deleteOrdinateur(id: number): Promise<void> {
  await api.delete(`/ordinateurs/${id}`);
}

export async function updateOrdinateur(
  id: number,
  data: OrdinateurUpdatePayload
): Promise<Ordinateur> {
  const response = await api.put<Ordinateur>(`/ordinateurs/${id}/`, data);
  return response.data;
}
