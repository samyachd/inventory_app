import base64
import json
import time
from mistralai.client import Mistral
import re
from core.settings import settings

client = Mistral(api_key=settings.MISTRAL_API_KEY)

CHAMPS = [
    # Document
    "type_document", "numero_document", "numero_de_commande",
    "date_document", "montant_ttc", "montant_ht",
    # Common equipment
    "type_equipement", "marque", "tag", "fournisseur",
    "date_achat", "fin_garantie", "proprietaire", "service", "batiment",
    # Ordinateur-specific
    "ram", "os", "nom_reseau", "ip_address",
    "mac_ethernet", "mac_wifi", "tag_chargeur", "watt",
    "clef_wifi", "lecteur_cd", "casque", "absolute_dell",
    # Ecran-specific
    "taille",
    # Licence-specific
    "type_licence", "version_logiciel", "clef_licence", "mail_activation",
]


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
                "content": f"""Extrais TOUS les équipements et licences listés dans ce document sous forme d'un tableau JSON.
Chaque élément du tableau représente UN équipement physique distinct OU UNE licence logicielle.

CHAMPS À EXTRAIRE pour chaque élément :

-- Champs liés au document (communs, répète dans chaque élément) --
- type_document       : UN SEUL parmi 'devis', 'bon_de_commande', 'facture'
- numero_document     : numéro du document (ex: FA-2024-001)
- numero_de_commande  : numéro de commande si différent du numéro de document
- date_document       : date du document (YYYY-MM-DD)
- montant_ttc         : prix unitaire TTC (décimal, uniquement pour les factures)
- montant_ht          : prix unitaire HT (décimal, uniquement pour les factures)

-- Champs communs à tous les équipements --
- type_equipement : UN SEUL parmi 'PC FIXE', 'PC PORTABLE', 'ECRAN', 'AUTRE', 'LICENCE'
- marque          : marque/fabricant (ex: Dell, HP, LG, Microsoft)
- tag             : numéro de série ou référence individuelle UNIQUE par équipement
- fournisseur     : nom du fournisseur/vendeur
- date_achat      : date d'achat (YYYY-MM-DD)
- fin_garantie    : date de fin de garantie (YYYY-MM-DD)
- proprietaire    : nom du propriétaire ou utilisateur si mentionné
- service         : service ou département destinataire si mentionné
- batiment        : bâtiment ou local destinataire si mentionné

-- Champs spécifiques aux ordinateurs (PC FIXE, PC PORTABLE) --
- ram          : mémoire vive (ex: '8 Go', '16 Go', '32 Go')
- os           : système d'exploitation (ex: 'Windows 11 Pro', 'Ubuntu 22.04')
- nom_reseau   : nom d'hôte réseau / hostname si mentionné
- ip_address   : adresse IP si mentionnée (ex: '192.168.1.10')
- mac_ethernet : adresse MAC Ethernet si mentionnée (format XX:XX:XX:XX:XX:XX)
- mac_wifi     : adresse MAC WiFi si mentionnée (format XX:XX:XX:XX:XX:XX)
- tag_chargeur : référence ou tag du chargeur associé si mentionné
- watt         : consommation électrique en watts (entier)
- clef_wifi    : true si une clé WiFi USB est incluse, false sinon, null si non mentionné
- lecteur_cd   : true si un lecteur CD/DVD est inclus, false sinon, null si non mentionné
- casque       : true si un casque audio est inclus, false sinon, null si non mentionné
- absolute_dell: true si Absolute Dell / DDS est mentionné, false sinon, null si non mentionné

-- Champs spécifiques aux écrans (ECRAN) --
- taille : taille en pouces (décimal, ex: 24.0, 27.0)

-- Champs spécifiques aux licences logicielles (LICENCE) --
- type_licence     : type de licence (ex: 'OEM', 'Volume', 'Retail', 'Abonnement')
- version_logiciel : version du logiciel (ex: 'Microsoft 365', 'Office 2021 Pro')
- clef_licence     : clé de produit si mentionnée (ex: 'XXXXX-XXXXX-XXXXX-XXXXX-XXXXX')
- mail_activation  : adresse email d'activation si mentionnée

RÈGLES STRICTES :
- Chaque tag ne doit apparaître QU'UNE SEULE fois. Ne duplique jamais un tag.
- Si le document liste des tags individuels (SN001, SN002...), crée UN élément par tag.
- Si une ligne indique une quantité sans tags (ex: "6x Dell OptiPlex"), crée EXACTEMENT autant d'éléments que la quantité, chacun avec tag null.
- Si un champ est commun à tous (fournisseur, date_document...), répète-le dans chaque élément.
- Mets null pour tout champ absent ou non mentionné. Ne devine pas, n'hallucine pas.
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

    # Deduplicate by tag — keep first occurrence of each non-null tag
    seen_tags: set[str] = set()
    unique_items = []
    for item in items:
        tag = item.get("tag")
        if tag and tag in seen_tags:
            continue
        if tag:
            seen_tags.add(tag)
        unique_items.append(item)
    items = unique_items

    nb_items = len(items)
    nb_champs_total = nb_items * len(CHAMPS) if nb_items else len(CHAMPS)
    nb_champs_remplis = sum(
        len([k for k in CHAMPS if item.get(k)]) for item in items
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
