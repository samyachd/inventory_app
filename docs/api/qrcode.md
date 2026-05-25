# QR Codes

Préfixe : `/qrcode`  
**Autorisation : `read`, `user`, ou `admin`**

Génère des QR codes PNG pour l'étiquetage physique des équipements.

---

## GET /qrcode/ordinateur/{id}

Retourne un QR code PNG pour l'ordinateur dont l'identifiant est `id`.  
Le QR code encode le `tag` de l'ordinateur (ex: `PC-001`).

**Réponse :** `image/png` (streaming)

### Erreurs

| Code | Description |
|---|---|
| `404` | Ordinateur introuvable |

---

## GET /qrcode/ordinateur/all

Retourne un fichier ZIP contenant un QR code PNG pour **chaque** ordinateur de la base.

**Réponse :** `application/zip` — `qrcodes-ordinateurs.zip`

---

## GET /qrcode/ecran/{id}

Retourne un QR code PNG pour l'écran dont l'identifiant est `id`.  
Le QR code encode le `tag` de l'écran (ex: `ECR-001`).

**Réponse :** `image/png` (streaming)

### Erreurs

| Code | Description |
|---|---|
| `404` | Écran introuvable |

---

## GET /qrcode/ecran/all

Retourne un fichier ZIP contenant un QR code PNG pour **chaque** écran de la base.

**Réponse :** `application/zip` — `qrcodes-ecrans.zip`

!!! tip "Ordre des routes"
    Les routes `/all` sont déclarées avant `/{id}` pour que FastAPI ne tente pas d'interpréter la chaîne `"all"` comme un entier.
