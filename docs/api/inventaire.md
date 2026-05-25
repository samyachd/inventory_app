# Inventaire

Préfixe : `/inventaire`  
**Autorisation : `read`, `user`, ou `admin`**

Endpoint unique qui retourne l'ensemble de l'inventaire en une seule requête — conçu pour alimenter la page principale du frontend.

---

## GET /inventaire/

Retourne la vue complète de l'inventaire.

### Réponse 200

```json
{
  "agents": [ { "id": 1, "nom": "Marie Martin", "service": "DRH", ... } ],
  "ordinateurs": [ { "id": 1, "tag": "PC-001", "marque": "Dell", ... } ],
  "ecrans": [ { "id": 1, "tag": "ECR-001", "taille": "24", ... } ],
  "licences": [ { "id": 1, "version": "Office 2021", "clef": "XXXX-...", ... } ],
  "documents": [ { "id": 1, "nom": "bon_commande.pdf", ... } ]
}
```

!!! tip "Performance"
    Cet endpoint charge toutes les entités en une seule passe. Pour des inventaires très volumineux, préférez les endpoints individuels avec pagination.
