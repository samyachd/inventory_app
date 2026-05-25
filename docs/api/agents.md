# Agents

Préfixe : `/agents`  
**Autorisation : `user` ou `admin`**

Les agents sont les **employés de la mairie** à qui des équipements peuvent être affectés.

---

## POST /agents/

Crée un nouvel agent.

### Corps de la requête

```json
{
  "nom": "Marie Martin",
  "email": "marie.martin@mairie.fr",
  "service": "DRH",
  "batiment": "Hôtel de Ville"
}
```

### Réponse 201

L'agent créé avec son `id`.

### Erreurs

| Code | Description |
|---|---|
| `409` | Un agent avec cet email existe déjà |

---

## PUT /agents/{agent_id}

Met à jour un agent existant (champs partiels acceptés).

### Réponse 200

L'agent mis à jour.

### Erreurs

| Code | Description |
|---|---|
| `404` | Agent introuvable |

---

## DELETE /agents/{agent_id}

Supprime un agent.

### Réponse 204

Aucun contenu.

### Erreurs

| Code | Description |
|---|---|
| `404` | Agent introuvable |

!!! note "Audit"
    Toutes les opérations de création, modification et suppression sont enregistrées dans le journal d'audit (table `action_log`).
