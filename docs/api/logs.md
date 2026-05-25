# Logs & Audit

Préfixe : `/logs`  
**Autorisation : `admin` uniquement**

Journal d'audit de toutes les opérations de création, modification et suppression sur l'inventaire.

---

## GET /logs/

Liste les entrées du journal d'audit avec filtrage et pagination.

### Paramètres de requête

| Paramètre | Type | Description |
|---|---|---|
| `action` | string | Filtrer par action : `creation`, `modification`, `suppression` |
| `table_cible` | string | Filtrer par table : `agents`, `ordinateurs`, `ecrans`, `licences`, `documents` |
| `user_id` | int | Filtrer par utilisateur |
| `limit` | int | Max 1000, défaut 100 |
| `offset` | int | Pagination, défaut 0 |

### Réponse 200

```json
[
  {
    "id": 42,
    "user_id": 1,
    "action": "suppression",
    "table_cible": "ordinateurs",
    "item_id": 7,
    "detail": "{\"tag\": \"PC-007\", ...}",
    "timestamp": "2026-05-15T10:32:00Z"
  }
]
```

---

## GET /logs/ocr

Liste les statistiques des extractions OCR.

### Paramètres de requête

| Paramètre | Type | Description |
|---|---|---|
| `limit` | int | Max 1000, défaut 100 |
| `offset` | int | Pagination, défaut 0 |

### Réponse 200

```json
[
  {
    "id": 1,
    "user_id": 1,
    "type_document": "inventaire",
    "nom_fichier": "inventaire_mai.pdf",
    "type_mime": "application/pdf",
    "taille_fichier": 204800,
    "duree_ms": 1340,
    "succes": true,
    "timestamp": "2026-05-15T09:00:00Z"
  }
]
```

---

## POST /logs/{log_id}/restore

Restaure un élément supprimé à partir de son entrée de log.

Seuls les logs d'action `suppression` peuvent être restaurés — le log doit contenir le snapshot JSON de l'objet dans le champ `detail`.

### Réponse 201

L'objet restauré (dans son schéma de lecture habituel).

### Erreurs

| Code | Description |
|---|---|
| `404` | Log introuvable |
| `400` | L'action n'est pas une suppression, ou les données sont manquantes/invalides |
| `409` | Un élément avec ces données existe déjà |

!!! warning "Restauration partielle"
    La restauration recrée l'objet avec un **nouvel identifiant**. Les relations (ex: `agent_id` sur un ordinateur restauré) doivent encore exister en base.
