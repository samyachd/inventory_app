# Documents

Préfixe : `/documents`  
**Autorisation : `user` ou `admin`**

---

## POST /documents/

Crée un document associé à l'inventaire.

### Corps de la requête

```json
{
  "nom": "bon_commande_PC.pdf",
  "type": "Bon de commande",
  "ordinateur_id": 1
}
```

### Réponse 201

Le document créé.

### Erreurs

| Code | Description |
|---|---|
| `409` | Contrainte de données violée |

---

## PUT /documents/{document_id}

Met à jour un document.

### Réponse 200

Le document mis à jour.

---

## DELETE /documents/{document_id}

Supprime un document.

### Réponse 204

Aucun contenu.
