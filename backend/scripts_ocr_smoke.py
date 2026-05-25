import asyncio
from services.ocr import extraire_document
from pathlib import Path

BASE = Path(__file__).parent
path = BASE.parent / "data" / "files_test" /"test_facture.pdf"

async def main():
    with open(path, "rb") as f:
        contenu = f.read()
    
    resultat = await extraire_document(contenu, "application/pdf")
    
    print("Données extraites:")
    print(resultat["donnees"])
    print("\nMétriques:")
    print(resultat["metriques"])

asyncio.run(main())