# Authentification

Préfixe : `/auth`

L'API utilise des **JWT Bearer tokens** (HS256). Toutes les routes protégées attendent le header :

```
Authorization: Bearer <token>
```

---

## POST /auth/login

Authentifie un utilisateur et retourne un access token.

**Aucune autorisation requise.**

### Corps de la requête

```json
{
  "email": "admin@mairie.fr",
  "password": "motdepasse"
}
```

### Réponse 200

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "utilisateur_id": 1
}
```

### Erreurs

| Code | Description |
|---|---|
| `401` | Utilisateur introuvable ou mot de passe incorrect |

---

## DELETE /auth/logout

Invalide le token courant en l'ajoutant à la blacklist.

**Autorisation requise** (tout rôle).

### Réponse 200

```json
{
  "message": "Déconnecté"
}
```

!!! note "Nettoyage automatique"
    À chaque logout, les tokens expirés sont purgés de la blacklist pour éviter que la table grossisse indéfiniment.

---

## Rôles

| Rôle | Accès |
|---|---|
| `admin` | Toutes les opérations, y compris la gestion des utilisateurs |
| `user` | Lecture et écriture sur l'inventaire |
| `read` | Lecture seule (endpoint `/inventaire/`) |

Les rôles sont embarqués dans le payload JWT (`"role"` claim) et vérifiés par la dépendance `require_role()` à chaque requête.
