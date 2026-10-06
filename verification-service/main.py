"""
CampX Verification Service — Phase 1
OCR/ID verification logic.
Express calls this service via POST /verify-id (internal only, never exposed to the frontend).
"""
import os
import io
import re
import urllib.request
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from PIL import Image

try:
    import pytesseract
    from fuzzywuzzy import fuzz
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False

load_dotenv()

app = FastAPI(
    title="CampX Verification Service",
    description="Internal OCR-based PRN/ID card verification service for CampusXchange.",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT") != "production" else None,
)

class VerifyIdRequest(BaseModel):
    imageUrl: str
    prn: str

class VerifyIdResponse(BaseModel):
    isMatched: bool
    confidence: float
    extracted_prn: str = ""

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "campx-verification",
        "phase": 1,
        "ocr_available": HAS_TESSERACT
    }

@app.post("/verify-id", response_model=VerifyIdResponse)
async def verify_id(payload: VerifyIdRequest):
    """
    Receives: { imageUrl: str, prn: str }
    Returns:  { isMatched: bool, confidence: float, extracted_prn: str }
    Express sets verificationStatus based on the returned isMatched boolean.
    """
    if not HAS_TESSERACT:
        # Fallback if tesseract/fuzzywuzzy is not installed or available
        print(f"[WARN] OCR not available. Auto-approving PRN {payload.prn} for testing.")
        return VerifyIdResponse(isMatched=True, confidence=100.0, extracted_prn=payload.prn)

    try:
        # Download image into memory
        req = urllib.request.Request(payload.imageUrl, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            img_data = response.read()

        img = Image.open(io.BytesIO(img_data))
        
        # Extract text via Tesseract
        text = pytesseract.image_to_string(img)
        
        # Clean text
        clean_text = re.sub(r'[^a-zA-Z0-9]', '', text).upper()
        target_prn = re.sub(r'[^a-zA-Z0-9]', '', payload.prn).upper()

        if target_prn in clean_text:
            return VerifyIdResponse(isMatched=True, confidence=100.0, extracted_prn=payload.prn)
        
        # Fuzzy match if exact substring not found
        # (Assuming the extracted text might have slight OCR errors)
        tokens = text.split()
        best_match = 0
        best_token = ""
        for token in tokens:
            score = fuzz.ratio(target_prn, token.upper())
            if score > best_match:
                best_match = score
                best_token = token
                
        is_matched = best_match >= 85  # 85% confidence threshold
        
        return VerifyIdResponse(
            isMatched=is_matched,
            confidence=float(best_match),
            extracted_prn=best_token
        )

    except Exception as e:
        print(f"[ERROR] OCR failed: {e}")
        # Return false so it goes to manual review
        return VerifyIdResponse(isMatched=False, confidence=0.0)
