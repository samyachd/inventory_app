import base64
import json
import time
from mistralai.client import Mistral
import re
from core.settings import settings

client = Mistral(api_key=settings.MISTRAL_API_KEY)

# Fields the LLM extracts, tiered by how reliably they appear on a procurement
# document (devis / bon de commande / facture).
#
# CHAMPS_DOCUMENT + CHAMPS_LIGNE_CORE (= CHAMPS_ATTENDUS) are realistically
# printed on almost every document, so `taux_completude` is weighted ONLY on
# these — the metric then measures extraction quality, not how sparse the
# document format is.
#
# CHAMPS_OPPORTUNISTES appear only when the supplier spells them out in the line
# description; the model fills them when present but they don't count against
# completeness. Everything else (IP, MAC, propriétaire, service, garantie,
# accessoires…) is a runtime/internal attribute that is never on a purchase
# document — the user fills those in during the review step, not here.

CHAMPS_DOCUMENT = [
    "type_document", "numero_document", "numero_de_commande",
    "date_document", "montant_ht", "montant_ttc",
]
CHAMPS_LIGNE_CORE = [
    "type_equipement", "marque", "designation", "quantite", "fournisseur",
]
CHAMPS_OPPORTUNISTES = [
    "ram", "os", "taille", "type_licence", "version_logiciel", "tag",
]

# Completeness is weighted only on what a document realistically contains.
CHAMPS_ATTENDUS = CHAMPS_DOCUMENT + CHAMPS_LIGNE_CORE


async def extraire_document(contenu: bytes, type_mime: str) -> dict:
    fichier_b64 = base64.standard_b64encode(contenu).decode("utf-8")

    if type_mime == "application/pdf":
        document = {
            "type": "document_url",
            "document_url": f"data:{type_mime};base64,{fichier_b64}",
        }
    else:
        document = {
            "type": "image_url",
            "image_url": f"data:{type_mime};base64,{fichier_b64}",
        }

    debut_ocr = time.time()
    response = await client.ocr.process_async(
        model="mistral-ocr-latest",
        document=document,
        include_image_base64=False,
    )
    duree_ocr_ms = int((time.time() - debut_ocr) * 1000)

    texte = "\n".join([page.markdown for page in response.pages])
    nb_pages = len(response.pages)

    debut_extraction = time.time()
    extraction = await client.chat.complete_async(
        model="mistral-small-latest",
        messages=[
            {
                "role": "user",
                "content": f"""Tu analyses un document d'achat (devis, bon de commande ou facture).
Extrais les LIGNES d'équipements et de licences sous forme d'un tableau JSON.
Chaque élément du tableau = UNE ligne de produit distincte du document.

RÈGLE DE QUANTITÉ (importante) :
- Une ligne "6x Dell OptiPlex" donne UN SEUL élément avec quantite=6.
- Ne duplique PAS la ligne : c'est le champ `quantite` qui porte le nombre.
- Si le document liste des numéros de série individuels (SN001, SN002...), crée alors UN élément par numéro de série, chacun avec quantite=1 et son tag.

CHAMPS À EXTRAIRE pour chaque élément :

-- Champs du document (communs, répète dans chaque élément) --
- type_document       : UN SEUL parmi 'devis', 'bon_de_commande', 'facture'
- numero_document     : numéro du document (ex: DV-2024-001, FA-2024-001)
- numero_de_commande  : numéro de commande si différent du numéro de document
- date_document       : date du document (YYYY-MM-DD)
- montant_ht          : prix unitaire HT de la ligne (décimal)
- montant_ttc         : prix unitaire TTC de la ligne (décimal)

-- Champs de la ligne (cœur) --
- type_equipement : UN SEUL parmi 'PC FIXE', 'PC PORTABLE', 'ECRAN', 'AUTRE', 'LICENCE'
- marque          : marque/fabricant (ex: Dell, HP, LG, Microsoft)
- designation     : libellé complet de la ligne tel qu'écrit (ex: 'Dell OptiPlex 7010, i5, 16 Go')
- quantite        : nombre d'unités de cette ligne (entier, défaut 1)
- fournisseur     : nom du fournisseur/vendeur

-- Champs optionnels (UNIQUEMENT s'ils sont écrits noir sur blanc dans la ligne) --
- tag             : numéro de série si explicitement listé, sinon null
- ram             : mémoire vive si indiquée (ex: '8 Go', '16 Go')
- os              : système d'exploitation si indiqué (ex: 'Windows 11 Pro')
- taille          : pour un ECRAN, taille en pouces (décimal, ex: 24.0, 27.0)
- type_licence    : pour une LICENCE (ex: 'OEM', 'Volume', 'Abonnement')
- version_logiciel: pour une LICENCE (ex: 'Microsoft 365', 'Office 2021 Pro')

RÈGLES STRICTES :
- Ne renseigne QUE les champs réellement présents. Mets null pour tout le reste.
- Ne devine pas, n'invente pas, n'hallucine pas (surtout pour tag, ram, os).
- N'invente jamais d'adresse IP/MAC, de propriétaire, de service ou de garantie : ces informations ne figurent pas sur un document d'achat.
- Si aucun équipement n'est identifiable, retourne [].

Document :
{texte}

Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour.""",
            }
        ],
    )
    duree_extraction_ms = int((time.time() - debut_extraction) * 1000)

    try:
        contenu_json = extraction.choices[0].message.content
        contenu_json = re.sub(r"^```json\s*", "", contenu_json.strip())
        contenu_json = re.sub(r"\s*```$", "", contenu_json.strip())
        items = json.loads(contenu_json)
        if not isinstance(items, list):
            items = [items] if isinstance(items, dict) else []
    except (json.JSONDecodeError, AttributeError):
        items = []

    # Normalize quantite to a positive int (default 1) and dedup by tag —
    # keeping the first occurrence of each non-null tag. On devis/BC tags are
    # usually absent, so dedup mostly no-ops; quantite carries the count.
    seen_tags: set[str] = set()
    unique_items = []
    for item in items:
        if not isinstance(item, dict):
            continue
        try:
            qte = int(item.get("quantite") or 1)
        except (TypeError, ValueError):
            qte = 1
        item["quantite"] = max(1, qte)

        tag = item.get("tag")
        if tag and tag in seen_tags:
            continue
        if tag:
            seen_tags.add(tag)
        unique_items.append(item)
    items = unique_items

    # Completeness is weighted only on the fields a document realistically
    # contains (CHAMPS_ATTENDUS), so a clean devis scores high instead of being
    # dragged down by runtime fields the model is no longer asked to fill.
    nb_items = len(items)
    nb_champs_total = nb_items * len(CHAMPS_ATTENDUS) if nb_items else len(CHAMPS_ATTENDUS)
    nb_champs_remplis = sum(
        len([k for k in CHAMPS_ATTENDUS if item.get(k) not in (None, "")])
        for item in items
    ) if items else 0
    type_document = items[0].get("type_document") if items else "inconnu"

    return {
        "donnees": items,
        "metriques": {
            "duree_ocr_ms": duree_ocr_ms,
            "duree_extraction_ms": duree_extraction_ms,
            "nb_pages": nb_pages,
            "nb_champs_extraits": nb_champs_remplis,
            "nb_champs_vides": nb_champs_total - nb_champs_remplis,
            "taux_completude": nb_champs_remplis / nb_champs_total if nb_champs_total else 0.0,
            "resultat_json": json.dumps(items, ensure_ascii=False),
            "_type_document": type_document,
        },
    }
