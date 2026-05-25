// ────────── Auth ──────────

export interface Credentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
}

export interface User {
  id: number;
  email: string;
  role: "admin" | "user" | "read";
}

// ────────── Inventory: shared base ──────────

export interface BaseEquipment {
  id: number;
  tag: string | null;
  marque: string | null;
  proprietaire: string | null;
  service: string | null;
  batiment: string | null;
  type_equipement: string | null;
  fournisseur: string | null;
  fin_garantie: string | null;
  date_achat: string | null;
  created_at: string;
  updated_at: string | null;
}

// ────────── Ordinateur ──────────

export interface Ordinateur extends BaseEquipment {
  agent_id: number | null;
  officelicence_id: number | null;

  ram: string | null;
  os: string | null;
  nom_reseau: string | null;
  tag_chargeur: string | null;
  ip_address: string | null;
  mac_ethernet: string | null;
  mac_wifi: string | null;
  lecteur_cd: boolean | null;
  absolute_dell: boolean | null;
  watt: number | null;
}

// ────────── Ecran ──────────

export interface Ecran extends BaseEquipment {
  taille: number | null;

  agent_id: number | null;
}

// ────────── OfficeLicence ──────────

export interface OfficeLicence {
  id: number;
  version: string | null;
  type_licence: string | null;
  fournisseur: string | null;
  date_achat: string | null;
  clef: string | null;
  mail_activation: string | null;

  created_at: string;
  updated_at: string | null;
}

// ────────── Agent ──────────

export interface Agent {
  id: number;
  nom: string;
  email: string | null;
  telephone: string | null;
  clef_wifi: boolean | null;
  casque: boolean | null;
  created_at: string;
  updated_at: string | null;
}

// ────────── Document (unified) ──────────

export type DocumentType = "devis" | "bon_de_commande" | "facture";

export interface Document {
  id: number;
  type: DocumentType;
  nom: string;
  numero: string;
  path: string;
  date_document: string;
  montant_ttc: number | null;
  montant_ht: number | null;
  ordinateur_ids: number[];
  ecran_ids: number[];
  office_licence_ids: number[];
  created_at: string;
  updated_at: string | null;
}

// ────────── /inventaire response ──────────

export interface InventaireResponse {
  ordinateurs: Ordinateur[];
  ecrans: Ecran[];
  licences: OfficeLicence[];
  agents: Agent[];
  documents: Document[];
}
