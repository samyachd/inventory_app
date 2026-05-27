from datetime import datetime
import pandas as pd
import json
from pathlib import Path

OUTPUT_DIR = Path("../data/raw_extracts")
TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
OUTPUT = OUTPUT_DIR / f"seed_data_{TIMESTAMP}.json"

fichiers = {
    "inventaire": "../data/excel/INVENTAIRE_PC.xlsx",
}

if not fichiers:
    print("Aucun fichier excel trouvé")
    exit()

resultat = {}
for cle, fichier in fichiers.items():
    df = pd.read_excel(fichier)
    df = df.where(pd.notna(df), None)  # remplace NaN par None
    resultat[cle] = df.to_dict(orient="records")
    

with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump(resultat, f, ensure_ascii=False, indent=2, default=str)

print(f"Conversion de {fichier} terminée")