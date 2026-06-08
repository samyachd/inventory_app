"""Tests de l'endpoint OCR (/models/extract).
 
L'appel à Mistral est mocké : ces tests sont déterministes, rapides, et
tournent en CI sans clé API ni réseau. Ils valident NOTRE logique
d'intégration (validation des entrées, contrôle d'accès, gestion d'erreur,
écriture des statistiques), pas le modèle Mistral lui-même.
 
Le smoke test du vrai contrat Mistral reste dans
tests/unit/services/test_ocr.py (skippé en CI).
"""
import io
import sys
 
# Le routeur défini dans api/routes/model.py s'appelle "model", comme le
# module — et le package api.routes le réexporte. Conséquence : le chemin
# TEXTE "api.routes.model" se résout vers l'objet APIRouter, pas vers le
# module, ce qui fait échouer monkeypatch.setattr("api.routes.model....").
# On récupère donc le VRAI module via sys.modules (jamais masqué) et on
# patchera l'objet module directement.
import api.routes.model  # noqa: E402 -- garantit la présence dans sys.modules
ROUTE_OCR = sys.modules["api.routes.model"]
 
 
# Réponse type renvoyée par le service OCR quand tout va bien.
# Les clés de "metriques" doivent correspondre EXACTEMENT aux colonnes de
# OcrStat (après le pop de "_type_document"), car l'endpoint fait
# OcrStat(**metriques). Une clé en trop = TypeError.
FAKE_OCR_RESULT = {
    "donnees": [{"tag": "PC-TEST-001", "marque": "Dell", "type_equipement": "PC FIXE"}],
    "metriques": {
        "duree_ocr_ms": 120,
        "duree_extraction_ms": 80,
        "nb_pages": 1,
        "nb_champs_extraits": 3,
        "nb_champs_vides": 30,
        "taux_completude": 0.09,
        "resultat_json": "[]",
        "_type_document": "facture",
    },
}
 
 
def _pdf_upload(content_type="application/pdf"):
    """Construit un faux fichier à envoyer en multipart/form-data.
    Le 3e élément du tuple impose le content_type vu par l'endpoint."""
    return {"file": ("test.pdf", io.BytesIO(b"%PDF-1.4 faux contenu"), content_type)}
 
 
def _fake_extraire_ok(contenu, type_mime):
    """Mock async d'un OCR qui réussit. On copie le dict pour que le pop()
    de l'endpoint n'altère pas la constante partagée entre les tests."""
    return {
        "donnees": FAKE_OCR_RESULT["donnees"],
        "metriques": dict(FAKE_OCR_RESULT["metriques"]),
    }
 
 
# ── 1. Validation des entrées ──────────────────────────────────────────────
 
def test_format_non_supporte_renvoie_400(user_client):
    """Un fichier d'un type non autorisé est rejeté avant tout appel OCR."""
    files = {"file": ("note.txt", io.BytesIO(b"bonjour"), "text/plain")}
    response = user_client.post("/models/extract", files=files)
    assert response.status_code == 400
 
 
# ── 2. Contrôle d'accès (require_role) ─────────────────────────────────────
 
def test_non_authentifie_est_refuse(client):
    """Sans jeton, l'endpoint OCR est inaccessible."""
    response = client.post("/models/extract", files=_pdf_upload())
    assert response.status_code in (401, 403)
 
 
# ── 3. Chemin nominal ──────────────────────────────────────────────────────
 
def test_extraction_nominale_renvoie_200(user_client, monkeypatch):
    """Avec un service OCR qui répond, l'endpoint renvoie donnees + metriques."""
    async def fake_extraire(contenu, type_mime):
        return _fake_extraire_ok(contenu, type_mime)
 
    # On patche l'attribut SUR L'OBJET MODULE (pas via une chaîne de caractères).
    monkeypatch.setattr(ROUTE_OCR, "extraire_document", fake_extraire)
 
    response = user_client.post("/models/extract", files=_pdf_upload())
 
    assert response.status_code == 200
    body = response.json()
    assert "donnees" in body
    assert "metriques" in body
    assert body["donnees"][0]["tag"] == "PC-TEST-001"
 
 
# ── 4. Gestion d'erreur (pas de fuite d'info) ──────────────────────────────
 
def test_echec_ocr_renvoie_500_generique(user_client, monkeypatch):
    """Si le service OCR lève une exception, l'endpoint renvoie un 500
    générique — le détail interne n'est jamais exposé au client."""
    async def fake_extraire_qui_plante(contenu, type_mime):
        raise RuntimeError("boom interne Mistral")
 
    monkeypatch.setattr(ROUTE_OCR, "extraire_document", fake_extraire_qui_plante)
 
    response = user_client.post("/models/extract", files=_pdf_upload())
 
    assert response.status_code == 500
    # Le message technique réel ("boom interne Mistral") ne doit pas fuiter
    assert "boom" not in response.text.lower()
 
 
# ── 5. Effet de bord : écriture des statistiques (lien C9/C11) ─────────────
 
def test_extraction_ecrit_une_ligne_ocr_stats(user_client, db_session, monkeypatch):
    """Chaque extraction réussie journalise une ligne dans ocr_stats,
    qui alimente le monitorage du service d'IA."""
    from db.models.ocr_stats import OcrStat
 
    async def fake_extraire(contenu, type_mime):
        return _fake_extraire_ok(contenu, type_mime)
 
    monkeypatch.setattr(ROUTE_OCR, "extraire_document", fake_extraire)
 
    avant = db_session.query(OcrStat).count()
    user_client.post("/models/extract", files=_pdf_upload())
    apres = db_session.query(OcrStat).count()
 
    assert apres == avant + 1