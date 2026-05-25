# Écrans

Préfixe : `/ecrans`  
**Autorisation : `user` ou `admin`**

---

## POST /ecrans/

Crée un écran.

### Corps de la requête

```json
{
  "tag": "ECR-001",
  "taille": "24",
  "marque": "Dell",
  "modele": "U2422H",
  "ordinateur_id": 1,
  "slot": 1
}
```

| Champ | Type | Description |
|---|---|---|
| `tag` | string (unique) | Identifiant physique |
| `taille` | string | Taille en pouces |
| `ordinateur_id` | int (FK) | Ordinateur associé |
| `slot` | int (1–5) | Port de connexion sur l'ordinateur |

### Réponse 201

L'écran créé.

### Erreurs

| Code | Description |
|---|---|
| `409` | Tag déjà utilisé |

---

## PUT /ecrans/{ecran_id}

Met à jour un écran (champs partiels acceptés).

### Réponse 200

L'écran mis à jour.

---

## DELETE /ecrans/{ecran_id}

Supprime un écran.

### Réponse 204

Aucun contenu.
