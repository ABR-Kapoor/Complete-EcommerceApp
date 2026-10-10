import json
import os
import re

import requests

ELEVENLABS_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"
GEMINI_URL_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
)

DEFAULT_STT_MODEL = "scribe_v2"
DEFAULT_GEMINI_MODEL = "gemini-3.8-flash"

STOPWORDS = {
    "the", "a", "an", "and", "or", "of", "for", "to", "in", "on", "at", "with",
    "i", "me", "my", "we", "you", "is", "are", "be", "want", "need", "looking",
    "show", "find", "get", "buy", "please", "some", "any", "can", "could",
    "would", "like", "have", "has", "do", "does", "it", "this", "that", "these",
    "those", "also", "very", "much", "since", "yesterday", "today", "tomorrow",
    "给我", "我想", "买", "找", "的", "了", "个", "请", "我要",
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
    kws = _simple_keywords(transcript)
    kw_str = " ".join(kws[:3]) if kws else transcript

    fallback_issues = [
        {
            "id": "issue-1",
            "title": f"Targeted Relief: {kw_str.title() if kw_str else 'Primary Need'}",
            "query": kw_str or transcript,
            "category": "OTC Medicines",
            "icon": "pill",
            "tip": "Targeted remedies for primary symptom comfort.",
        },
        {
            "id": "issue-2",
            "title": "Pain & Inflammation Support",
            "query": "pain relief balm analgesic",
            "category": "OTC Medicines",
            "icon": "emoticon-sick-outline",
            "tip": "Soothing comfort for body aches and tenderness.",
        },
        {
            "id": "issue-3",
            "title": "Health Monitoring & Diagnostics",
            "query": "health monitoring thermometer kit",
            "category": "Health Monitoring",
            "icon": "medical-bag",
            "tip": "Keep track of vital indicators during recovery.",
        },
        {
            "id": "issue-4",
            "title": "Immunity & Fast Recovery",
            "query": "immunity vitamins personal care",
            "category": "Personal Care",
            "icon": "shield-plus-outline",
            "tip": "Boost hydration, nutrients, and immune defenses.",
        },
    ]

    return {
        "english_query": transcript,
        "keywords": kws,
        "category": "OTC Medicines",
        "reply": f"Aura AI compiled your symptoms into 4 key health issues.",
        "issues": fallback_issues,
    }


def extract_intent(transcript, categories=None):
    """Use Gemini to translate/understand the transcript and compile into 3-4 specific issues."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return _fallback_intent(transcript)

    model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    category_list = ", ".join(categories or []) or "OTC Medicines, Personal Care, Health Monitoring, Healthcare Devices, First Aid"

    prompt = (
        "You are Aura AI, the intelligent voice shopping and clinical triage assistant for AuraMart, an online pharmacy and healthcare store.\n"
        "A customer spoke the transcript below describing their symptoms, health problems, or medical requests. "
        "It may be in ANY language (English, Hindi, Bengali, Hinglish, etc.) or a mixture of languages, with casual or rambling speech.\n\n"
        "Customer Transcript: \"\"\"{transcript}\"\"\"\n\n"
        "Available store categories: {categories}\n\n"
        "YOUR CORE TASK:\n"
        "1. Compile and synthesize the customer's natural speech into EXACTLY 3 to 4 specific, actionable health issues or shopping dimensions.\n"
        "2. Even if the customer's sentence is brief or focused on one symptom (e.g. 'I have a fever'), break it down into 3 to 4 complementary healthcare issues to search for (such as: 1. Primary Symptom Relief, 2. Secondary/Associated Discomfort, 3. Health Monitoring / Vital Check, 4. Immunity / Hydration / Recovery).\n"
        "3. Provide specific search terms for each of the 3-4 issues so the store can find exact matching remedies.\n"
        "4. Return ONLY a valid JSON object matching this exact schema:\n"
        "{{\n"
        '  "english_query": "short 2 to 5 word English search query representing the core symptoms",\n'
        '  "keywords": ["short English search keywords for matching store inventory"],\n'
        '  "category": "the single best overall matching store category from the available categories list",\n'
        '  "reply": "one warm, caring, concise sentence from Aura AI confirming the 3-4 specific issues identified",\n'
        '  "issues": [\n'
        "    {{\n"
        '      "id": "issue-1",\n'
        '      "title": "Concise issue summary (e.g. High Fever & Chills)",\n'
        '      "query": "2 to 4 search terms for this specific issue (e.g. fever paracetamol dolo)",\n'
        '      "category": "matching store category",\n'
        '      "icon": "MaterialCommunityIcons name like thermometer, pill, emoticon-sick-outline, stomach, medical-bag, shield-plus-outline, bandage, heart-pulse, water",\n'
        '      "tip": "Short 1-line guidance or recovery tip for this issue"\n'
        "    }}\n"
        "  ]\n"
        "}}\n"
        "CRITICAL: The 'issues' list MUST contain between 3 and 4 items. Do not include markdown code fences or any text outside the JSON."
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
        candidates = payload.get("candidates") or []
        if not candidates:
            return _fallback_intent(transcript)

        text = candidates[0]["content"]["parts"][0]["text"]
        parsed = _parse_json(text)
        if not isinstance(parsed, dict):
            return _fallback_intent(transcript)

        keywords = parsed.get("keywords") or _simple_keywords(transcript)
        issues = parsed.get("issues") or []

        # Ensure valid list of 3-4 issues
        valid_issues = []
        for idx, issue in enumerate(issues[:4], start=1):
            if isinstance(issue, dict) and issue.get("title"):
                valid_issues.append({
                    "id": str(issue.get("id") or f"issue-{idx}"),
                    "title": str(issue.get("title")),
                    "query": str(issue.get("query") or issue.get("title")),
                    "category": str(issue.get("category") or ""),
                    "icon": str(issue.get("icon") or "pill"),
                    "tip": str(issue.get("tip") or "Targeted remedy for symptom relief."),
                })

        # If model returned fewer than 3 issues, pad with sensible recovery items
        if len(valid_issues) < 3:
            fallback = _fallback_intent(transcript)["issues"]
            for f_issue in fallback:
                if len(valid_issues) >= 4:
                    break
                if not any(v["title"].lower() == f_issue["title"].lower() for v in valid_issues):
                    f_issue_copy = dict(f_issue)
                    f_issue_copy["id"] = f"issue-{len(valid_issues) + 1}"
                    valid_issues.append(f_issue_copy)

        return {
            "english_query": parsed.get("english_query") or transcript,
            "keywords": [str(k) for k in keywords if str(k).strip()],
            "category": parsed.get("category") or "",
            "reply": parsed.get("reply") or f"Aura AI compiled your symptoms into {len(valid_issues)} key issues.",
            "issues": valid_issues,
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


def rank_products(products, intent, limit=16):
    """Score products against the intent and tag each product with matching issue IDs."""
    keywords = [str(k).lower() for k in (intent.get("keywords") or []) if str(k).strip()]
    query = str(intent.get("english_query") or "").lower()
    category = str(intent.get("category") or "").lower()
    issues = intent.get("issues") or []

    # Collect tokens per issue
    issue_token_map = {}
    for issue in issues:
        iss_id = issue.get("id")
        iss_tokens = set(re.findall(r"[\w]+", (issue.get("query") or "").lower(), flags=re.UNICODE))
        iss_tokens.update(re.findall(r"[\w]+", (issue.get("title") or "").lower(), flags=re.UNICODE))
        issue_token_map[iss_id] = {t for t in iss_tokens if len(t) > 2 and t not in STOPWORDS}

    tokens = set(keywords)
    tokens.update(
        t for t in re.findall(r"[\w]+", query, flags=re.UNICODE) if len(t) > 2 and t not in STOPWORDS
    )
    for iss_tokens in issue_token_map.values():
        tokens.update(iss_tokens)

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

        # Compute matched issues
        matched_issue_ids = []
        for issue in issues:
            iss_id = issue.get("id")
            iss_cat = str(issue.get("category") or "").lower()
            iss_tokens = issue_token_map.get(iss_id, set())

            issue_match_score = 0
            for t in iss_tokens:
                if t in title:
                    issue_match_score += 4
                if product_category and t in product_category:
                    issue_match_score += 2
                if t in description:
                    issue_match_score += 1
            if iss_cat and iss_cat in product_category:
                issue_match_score += 2

            if issue_match_score > 0:
                matched_issue_ids.append(iss_id)

        # Create augmented product dict
        augmented_product = dict(product)
        augmented_product["matched_issue_ids"] = matched_issue_ids

        if score > 0:
            scored.append((score, augmented_product))

    scored.sort(key=lambda item: item[0], reverse=True)

    # Return top ranked products; if fewer than limit, include others
    result_list = [product for _, product in scored[:limit]]

    # Ensure every issue has at least some matching products if products exist
    for issue in issues:
        iss_id = issue.get("id")
        has_match = any(iss_id in (p.get("matched_issue_ids") or []) for p in result_list)
        if not has_match and result_list:
            # Map top matching product or first product to this issue if appropriate
            result_list[0]["matched_issue_ids"] = list(
                set((result_list[0].get("matched_issue_ids") or []) + [iss_id])
            )

    return result_list

