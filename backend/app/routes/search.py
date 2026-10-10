from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from app.db import get_supabase_client
from app.services import voice

router = APIRouter(prefix="/api/search", tags=["search"])

MAX_AUDIO_BYTES = 15 * 1024 * 1024  # 15 MB


class TextQuery(BaseModel):
    query: str
    limit: int = 12


def _fetch_products():
    client = get_supabase_client()
    data = client.table("products").select("*").execute()
    return data.data or []


def _run_intent_search(transcript: str, products, limit: int):
    categories = sorted(
        {str(p.get("category")) for p in products if p.get("category")}
    )
    intent = voice.extract_intent(transcript, categories)
    matches = voice.rank_products(products, intent, limit=limit)
    return intent, matches


@router.post("/voice")
async def voice_search(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(None),
    limit: int = Form(12),
):
    """Transcribe uploaded audio (any language) and return relevant products."""
    data = await audio.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty audio upload")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio file is too large")

    try:
        stt = voice.transcribe_audio(
            audio.filename, data, audio.content_type, language_code=language
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Transcription failed: {exc}")

    transcript = stt["text"]
    if not transcript:
        return {
            "transcript": "",
            "language": stt["language"],
            "query": "",
            "reply": "I didn't catch that. Please try again.",
            "products": [],
        }

    try:
        products = _fetch_products()
        intent, matches = _run_intent_search(transcript, products, int(limit))
    except Exception as exc:  # noqa: BLE001
        print(f"Voice search error: {exc}")
        raise HTTPException(status_code=500, detail="Search failed")

    return {
        "transcript": transcript,
        "language": stt["language"],
        "query": intent.get("english_query") or transcript,
        "reply": intent.get("reply") or "",
        "issues": intent.get("issues") or [],
        "products": matches,
    }


@router.post("/query")
def text_search(payload: TextQuery):
    """Text fallback that runs the same intent + ranking pipeline."""
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query is required")

    try:
        products = _fetch_products()
        intent, matches = _run_intent_search(
            payload.query.strip(), products, int(payload.limit)
        )
    except Exception as exc:  # noqa: BLE001
        print(f"Text search error: {exc}")
        raise HTTPException(status_code=500, detail="Search failed")

    return {
        "transcript": payload.query.strip(),
        "language": "eng",
        "query": intent.get("english_query") or payload.query.strip(),
        "reply": intent.get("reply") or "",
        "issues": intent.get("issues") or [],
        "products": matches,
    }
