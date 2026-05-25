# Modèle IA (OCR)

Préfixe : `/models`  
**Autorisation : `user` ou `admin`**

Extraction automatique de données depuis des documents via **Mistral AI** (`mistral-ocr-latest`).

---

## POST /models/extract

Analyse un fichier (PDF, JPG, PNG) et extrait les champs d'inventaire reconnus.

**Les données extraites ne sont PAS automatiquement enregistrées** — elles sont retournées au client pour validation avant insertion manuelle (pré-remplissage de formulaire).

### Corps de la requête

`multipart/form-data` avec le champ `file`.

Types acceptés : `application/pdf`, `image/jpeg`, `image/png`

### Réponse 200

```json
{
  "donnees": [
    {
      "tag": "PC-042",
      "marque": "HP",
      "modele": "EliteBook 840",
      "service": "Comptabilité"
    }
  ],
  "metriques": {
    "nb_equipements": 1,
    "duree_ocr_ms": 1240
  }
}
```

| Champ | Description |
|---|---|
| `donnees` | Liste d'équipements détectés (structure variable selon le document) |
| `metriques` | Statistiques de traitement |

### Erreurs

| Code | Description |
|---|---|
| `400` | Format de fichier non supporté |
| `500` | Erreur interne lors de l'extraction |

### Statistiques OCR

Chaque extraction réussie génère une ligne dans la table `ocr_stats`, consultable via [`GET /logs/ocr`](logs.md#get-logsocr).
