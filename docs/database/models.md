# Modèles de base de données

## Classes de base

### `BaseEntry`

Classe abstraite dont héritent tous les modèles métier.

| Colonne | Type | Description |
|---|---|---|
| `id` | integer (PK) | Clé primaire auto-incrémentée |
| `created_at` | timestamptz | Date de création (serveur) |
| `updated_at` | timestamptz | Date de dernière modification (serveur) |

### `BaseEquipement`

Étend `BaseEntry` avec les champs communs aux équipements physiques.

| Colonne | Type | Description |
|---|---|---|
| `tag` | string(50) — unique | Étiquette physique de l'équipement |
| `marque` | string(255) | Fabricant |
| `proprietaire` | string(255) | Responsable de l'équipement |
| `service` | string(255) | Service/département |
| `batiment` | string(255) | Bâtiment |
| `type_equipement` | enum | `PC FIXE`, `PC PORTABLE`, `ECRAN`, `AUTRE` |
| `date_achat` | date | Date d'achat |
| `fin_garantie` | date | Date de fin de garantie |
| `fournisseur` | string(255) | Fournisseur |

---

## Modèles métier

### `Agent`

Employé de la mairie pouvant se voir affecter des équipements.

| Colonne | Type | Contrainte |
|---|---|---|
| `nom` | string(255) | NOT NULL |
| `email` | string(255) | unique, nullable |
| `telephone` | string(20) | nullable |

Relations : `ordinateur[]`, `ecran[]`

---

### `Ordinateur`

Étend `BaseEquipement`.

| Colonne | Type | Contrainte |
|---|---|---|
| `agent_id` | FK → agent | SET NULL on delete |
| `office_licence_id` | FK → office_licence | SET NULL on delete |
| `ram` | string(50) | nullable |
| `os` | string(100) | nullable |
| `nom_reseau` | string(50) | unique, nullable |
| `ip_address` | string(45) | nullable |
| `mac_ethernet` | string(17) | unique, nullable |
| `mac_wifi` | string(17) | unique, nullable |
| `tag_chargeur` | string(50) | unique, nullable |
| `clef_wifi` | boolean | nullable |
| `lecteur_cd` | boolean | nullable |
| `casque` | boolean | nullable |
| `absolute_dell` | boolean | nullable |
| `watt` | integer | nullable |

Relations : `agent`, `office_licence`, `ecran[]`, `documents[]`

---

### `Ecran`

Étend `BaseEquipement`.

| Colonne | Type | Contrainte |
|---|---|---|
| `ordinateur_id` | FK → ordinateur | SET NULL on delete |
| `agent_id` | FK → agent | SET NULL on delete |
| `taille` | float | nullable |
| `slot` | integer (1–5) | nullable |

Contraintes de table :

- `uq_ecran_slot_per_pc` — `(ordinateur_id, slot)` unique
- `ck_slot_1_5` — slot entre 1 et 5
- `ck_slot_required_when_linked` — slot requis si `ordinateur_id` est renseigné

Relations : `agent`, `ordinateur`, `documents[]`

---

### `OfficeLicence`

Licence Microsoft Office.

| Colonne | Type |
|---|---|
| `type_licence` | string(255) |
| `version` | string(500) |
| `date_achat` | date |
| `fournisseur` | string(255) |
| `clef` | string(255) |
| `mail_activation` | string(255) |

Relations : `ordinateur[]`, `documents[]`

---

### `User`

Compte utilisateur de l'application (pas un agent de la mairie).

| Colonne | Type | Contrainte |
|---|---|---|
| `nom` | string(255) | NOT NULL |
| `email` | string(255) | unique, NOT NULL |
| `mot_de_passe_hash` | string(500) | bcrypt |
| `role` | enum | `admin`, `user`, `read` |

---

### `Log`

Journal d'audit.

| Colonne | Type | Description |
|---|---|---|
| `user_id` | FK → user | Auteur de l'action (nullable) |
| `timestamp` | timestamptz | Date de l'action (UTC) |
| `action` | string(50) | `creation`, `modification`, `suppression` |
| `table_cible` | string(50) | Table concernée |
| `item_id` | integer | Identifiant de l'élément |
| `detail` | text | Snapshot JSON (pour restauration) |

---

### `TokenBlacklist`

Tokens JWT révoqués (logout).

| Colonne | Type | Description |
|---|---|---|
| `token` | string(500) | Token JWT complet |
| `expire_at` | timestamptz | Expiration du token |
| `created_at` | timestamptz | Date de révocation |

Les tokens expirés sont purgés automatiquement à chaque appel `DELETE /auth/logout`.

---

## Diagramme de relations

```
User ──< Log
Agent ──< Ordinateur >── OfficeLicence
Agent ──< Ecran ──> Ordinateur
Ordinateur ──< Document
Ecran ──< Document
OfficeLicence ──< Document
```
