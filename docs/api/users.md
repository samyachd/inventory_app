# Utilisateurs (système)

Préfixe : `/users`  
**Autorisation : `admin` uniquement** (sauf `GET /{id}` : `user` ou `admin`)

Ces endpoints gèrent les **comptes utilisateurs** de l'application (pas les agents de la mairie — voir [Agents](agents.md)).

---

## POST /users/

Crée un nouvel utilisateur.

### Corps de la requête

```json
{
  "nom": "Jean Dupont",
  "email": "jean.dupont@mairie.fr",
  "password": "MotDePasse123!",
  "role": "user"
}
```

| Champ | Type | Requis | Description |
|---|---|---|---|
| `nom` | string | oui | Nom complet |
| `email` | string | oui | Email unique |
| `password` | string | oui | Mot de passe (validé en force) |
| `role` | string | oui | `admin`, `user`, ou `read` |

### Réponse 201

```json
{
  "id": 1,
  "nom": "Jean Dupont",
  "email": "jean.dupont@mairie.fr",
  "role": "user"
}
```

### Erreurs

| Code | Description |
|---|---|
| `400` | Email déjà utilisé, ou mot de passe trop faible |

---

## GET /users/

Liste tous les utilisateurs.

### Réponse 200

```json
[
  { "id": 1, "nom": "Jean Dupont", "email": "jean.dupont@mairie.fr", "role": "user" }
]
```

---

## GET /users/{user_id}

Retourne un utilisateur par son identifiant.  
**Autorisation : `user` ou `admin`.**

### Réponse 200

```json
{
  "id": 1,
  "nom": "Jean Dupont",
  "email": "jean.dupont@mairie.fr",
  "role": "user"
}
```

### Erreurs

| Code | Description |
|---|---|
| `404` | Utilisateur introuvable |

---

## PUT /users/{user_id}

Met à jour un utilisateur (champs partiels acceptés).

### Corps de la requête (exemple)

```json
{
  "nom": "Jean-Paul Dupont",
  "password": "NouveauMDP456!"
}
```

### Réponse 200

L'utilisateur mis à jour.

---

## DELETE /users/{user_id}

Supprime un utilisateur.

### Réponse 204

Aucun contenu.
