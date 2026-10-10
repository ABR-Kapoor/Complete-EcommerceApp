import json
import os
import re

import requests

ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"
GEMINI_URL_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)

DEFAULT_STT_MODEL = "scribe_v2"
DEFAULT_GEMINI_MODEL = "gemini-flash-latest"

STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "for", "to", "in", "on", "at", "with",
    "i", "me", "my", "we", "you", "is", "are", "be", "want", "need", "looking",
    "show", "find", "get", "buy", "please", "some", "any", "can", "could",
    "would", "like", "have", "has", "do", "does", "it", "this", "that", "these",
    "those", "给我", "我想", "买", "找", "的", "了", "个", "请", "我要",
}


def _simple_keywords(text):
    words = re.findall(r"[\w]+", (text or "").lower(), flags=re.UNICODE)
    seen = []
    for w in words:
        if len(w) < 3 or w in STOPWORDS:
            continue
        if w not in seen:
            seen.append(w)
    return seen


def transcribe_audio(filename, data, content_type=None, language_code=None):
    """Transcribe audio bytes with ElevenLabs Scribe v2. Auto-detects language."""
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is not configured")

    model_id = os.getenv("ELEVENLABS_STT_MODEL", DEFAULT_STT_MODEL)
    files = {
        "file": (filename or "recording.webm", data, content_type or "audio/webm"),
    }
    form = {"model_id": model_id, "tag_audio_events": "false"}
    if language_code:
        form["language_code"] = language_code

    response = requests.post(
        ELEVENLABS_STT_URL,
        headers={"xi-api-key": api_key},
        files=files,
        data=form,
        timeout=60,
    )
    if response.status_code >= 400:
        raise RuntimeError(
            f"ElevenLabs transcription failed ({response.status_code}): {response.text[:300]}"
        )

    payload = response.json()
    return {
        "text": (payload.get("text") or "").strip(),
        "language": payload.get("language_code") or payload.get("language"),
    }


def _fallback_intent(transcript):
    return {
        "english_query": transcript,
        "keywords": _simple_keywords(transcript),
        "category": "",
        "reply": f'Searching for "{transcript}".',
    }


def extract_intent(transcript, categories=None):
    """Use Gemini to translate/understand the transcript and return a search intent."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return _fallback_intent(transcript)

    model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    category_list = ", ".join(categories or []) or "(none configured)"

    prompt = (
        "You are the voice shopping assistant for AuraMart, an online pharmacy and "
        "healthcare store.\n"
        "A customer spoke the transcript below. It may be in ANY language or mixture of languages, with noise or rambling speech.\n\n"
        "Transcript: \"\"\"{transcript}\"\"\"\n\n"
        "Available store categories: {categories}\n\n"
        "Your task: Extract the exact product, medicine, or health symptom intent. Ignore filler words or irrelevant conversation.\n"
        "Return ONLY a JSON object with this exact shape:\n"
        "{{\n"
        '  "english_query": "concise English product/medicine query representing user intent (e.g. Dizziness & Vertigo Medicine)",\n'
        '  "keywords": ["3 to 6 short English search keywords for product title/description matching"],\n'
        '  "category": "the single best matching category from available store categories, or an empty string",\n'
        '  "reply": "one short, warm, helpful English sentence confirming the intent and recommended products"\n'
        "}}\n"
        "Do not add any markdown formatting or text outside the JSON."
    ).format(transcript=transcript, categories=category_list)

    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.2,
        },
    }

    try:
        response = requests.post(
            GEMINI_URL_TEMPLATE.format(model=model),
            headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
            json=body,
            timeout=30,
        )
        if response.status_code >= 400:
            print(f"Gemini intent failed ({response.status_code}): {response.text[:300]}")
            return _fallback_intent(transcript)

        payload = response.json()
        text = payload["candidates"][0]["content"]["parts"][0]["text"]
        parsed = _parse_json(text)
        if not isinstance(parsed, dict):
            return _fallback_intent(transcript)

        keywords = parsed.get("keywords") or _simple_keywords(transcript)
        return {
            "english_query": parsed.get("english_query") or transcript,
            "keywords": [str(k) for k in keywords if str(k).strip()],
            "category": parsed.get("category") or "",
            "reply": parsed.get("reply") or f"Searching for {parsed.get('english_query') or transcript}.",
        }
    except Exception as exc:  # noqa: BLE001 - degrade gracefully
        print(f"Gemini intent error: {exc}")
        return _fallback_intent(transcript)


def _parse_json(text):
    if not text:
        return None
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\s*", "", cleaned)
        cleaned = re.sub(r"```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, flags=re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return None
        return None


def rank_products(products, intent, limit=12):
    """Score products against the intent. Returns most relevant products first."""
    keywords = [str(k).lower() for k in (intent.get("keywords") or []) if str(k).strip()]
    query = str(intent.get("english_query") or "").lower()
    category = str(intent.get("category") or "").lower()

    tokens = set(keywords)
    tokens.update(
        t for t in re.findall(r"[\w]+", query, flags=re.UNICODE) if len(t) > 2 and t not in STOPWORDS
    )

    scored = []
    for product in products:
        title = str(product.get("title") or "").lower()
        description = str(product.get("description") or "").lower()
        product_category = str(product.get("category") or "").lower()

        score = 0
        for token in tokens:
            if token in title:
                score += 5
            if product_category and token in product_category:
                score += 3
            if token in description:
                score += 1
        if query and query in title:
            score += 6
        if category and category in product_category:
            score += 4

        if score > 0:
            scored.append((score, product))

    scored.sort(key=lambda item: item[0], reverse=True)
    return [product for _, product in scored[:limit]]
