# Licences Office

Préfixe : `/licenses`  
**Autorisation : `user` ou `admin`**

---

## POST /licenses/

Crée une licence Office.

### Corps de la requête

```json
{
  "version": "Office 2021",
  "type_license": "Perpétuelle",
  "clef": "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX",
  "numero_bc": "BC-2024-0042",
  "achat": "2024-03-15",
  "fin_garantie": "2027-03-15"
}
```

### Réponse 201

La licence créée.

### Erreurs

| Code | Description |
|---|---|
| `409` | Licence déjà existante (contrainte sur la clef) |

---

## PUT /licenses/{licence_id}

Met à jour une licence (champs partiels acceptés).

### Réponse 200

La licence mise à jour.

---

## DELETE /licenses/{licence_id}

Supprime une licence.

### Réponse 204

Aucun contenu.

!!! warning "Dépendances"
    Supprimer une licence libère le champ `office_licence_id` sur les ordinateurs qui l'utilisaient. Vérifier les ordinateurs affectés avant suppression.
