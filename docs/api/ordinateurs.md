# Ordinateurs

Préfixe : `/ordinateurs`  
**Autorisation : `user` ou `admin`**

---

## POST /ordinateurs/

Crée un ordinateur.

### Corps de la requête

```json
{
  "tag": "PC-001",
  "type_pc": "Fixe",
  "marque": "Dell",
  "modele": "OptiPlex 7090",
  "service": "DRH",
  "batiment": "Hôtel de Ville",
  "ram": "16 Go",
  "os": "Windows 11 Pro",
  "nom_reseau": "PC-DRH-001",
  "ip_address": "192.168.1.10",
  "agent_id": 1,
  "office_licence_id": 2
}
```

| Champ | Type | Unique | Requis |
|---|---|---|---|
| `tag` | string | oui | oui |
| `nom_reseau` | string | oui | non |
| `ip_address` | string | oui | non |
| `agent_id` | int (FK) | — | non |
| `office_licence_id` | int (FK) | — | non |

### Réponse 201

L'ordinateur créé.

### Erreurs

| Code | Description |
|---|---|
| `409` | Tag, IP ou adresse réseau déjà utilisé |

---

## PUT /ordinateurs/{ordinateur_id}

Met à jour un ordinateur (champs partiels acceptés).

### Réponse 200

L'ordinateur mis à jour.

### Erreurs

| Code | Description |
|---|---|
| `404` | Ordinateur inexistant |

---

## DELETE /ordinateurs/{ordinateur_id}

Supprime un ordinateur.

### Réponse 204

Aucun contenu.
