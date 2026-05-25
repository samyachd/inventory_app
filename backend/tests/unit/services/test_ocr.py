"""Integration smoke test for the OCR service.

This calls the real Mistral OCR API and requires:
- A valid MISTRAL_API_KEY (not a stub)
- A test PDF at OCR_TEST_PDF_PATH

It is skipped by default in CI. To run locally:
    MISTRAL_API_KEY=… OCR_TEST_PDF_PATH=/path/to/facture.pdf \\
        pytest tests/unit/services/test_ocr.py
"""
import asyncio
import os
from pathlib import Path

import pytest

from services.ocr import extraire_document


_PDF_PATH = os.getenv("OCR_TEST_PDF_PATH")
_API_KEY = os.getenv("MISTRAL_API_KEY", "")


@pytest.mark.skipif(
    not _PDF_PATH or not Path(_PDF_PATH).is_file(),
    reason="OCR_TEST_PDF_PATH not set or file missing",
)
@pytest.mark.skipif(
    not _API_KEY or _API_KEY.startswith("fake") or _API_KEY.startswith("test"),
    reason="MISTRAL_API_KEY missing or is a stub",
)
def test_extraire_facture_pdf():
    with open(_PDF_PATH, "rb") as f:  # type: ignore[arg-type]
        contenu = f.read()

    resultat = asyncio.run(extraire_document(contenu, "application/pdf"))

    assert "donnees" in resultat
    assert "metriques" in resultat
    assert isinstance(resultat["donnees"], list)
