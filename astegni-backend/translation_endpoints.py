"""
Translation API Endpoints for Astegni Chat
Provides real-time message translation using Google Cloud Translation API
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from translation_service import get_translation_service, SUPPORTED_LANGUAGES

router = APIRouter(prefix="/api/translate", tags=["Translation"])


# ============================================
# PYDANTIC MODELS
# ============================================

class TranslateRequest(BaseModel):
    """Request model for single text translation"""
    text: str = Field(..., description="Text to translate", min_length=1, max_length=10000)
    target_language: str = Field(..., description="Target language code (e.g., 'en', 'am', 'fr')")
    source_language: Optional[str] = Field(None, description="Source language code (auto-detect if not provided)")


class TranslateBatchRequest(BaseModel):
    """Request model for batch text translation"""
    texts: List[str] = Field(..., description="List of texts to translate", min_items=1, max_items=100)
    target_language: str = Field(..., description="Target language code")
    source_language: Optional[str] = Field(None, description="Source language code (auto-detect if not provided)")


class DetectLanguageRequest(BaseModel):
    """Request model for language detection"""
    text: str = Field(..., description="Text to analyze", min_length=1, max_length=5000)


class TranslateResponse(BaseModel):
    """Response model for translation"""
    success: bool
    translated_text: Optional[str] = None
    original_text: str
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    error: Optional[str] = None


class DetectLanguageResponse(BaseModel):
    """Response model for language detection"""
    success: bool
    language: Optional[str] = None
    language_name: Optional[str] = None
    confidence: Optional[float] = None
    is_reliable: Optional[bool] = None
    error: Optional[str] = None


class LanguageInfo(BaseModel):
    """Language information model"""
    code: str
    name: str


class SupportedLanguagesResponse(BaseModel):
    """Response model for supported languages"""
    languages: List[LanguageInfo]
    count: int


class TranslationStatusResponse(BaseModel):
    """Response model for translation service status"""
    configured: bool
    message: str


# ============================================
# API ENDPOINTS
# ============================================

@router.post("/text", response_model=TranslateResponse)
async def translate_text(request: TranslateRequest):
    """
    Translate a single text to the target language

    - **text**: The text to translate (max 10,000 characters)
    - **target_language**: ISO 639-1 language code (e.g., 'en', 'am', 'fr')
    - **source_language**: Optional source language (auto-detected if not provided)
    """
    service = get_translation_service()

    if not service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Translation service is not configured. Please add GOOGLE_TRANSLATE_API_KEY to .env"
        )

    # Validate target language
    if request.target_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported target language: {request.target_language}"
        )

    result = await service.translate_text(
        text=request.text,
        target_language=request.target_language,
        source_language=request.source_language
    )

    return TranslateResponse(**result)


@router.post("/batch", response_model=List[TranslateResponse])
async def translate_batch(request: TranslateBatchRequest):
    """
    Translate multiple texts in a single API call (more efficient for bulk translations)

    - **texts**: List of texts to translate (max 100 items)
    - **target_language**: ISO 639-1 language code
    - **source_language**: Optional source language (auto-detected if not provided)
    """
    service = get_translation_service()

    if not service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Translation service is not configured. Please add GOOGLE_TRANSLATE_API_KEY to .env"
        )

    # Validate target language
    if request.target_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported target language: {request.target_language}"
        )

    results = await service.translate_batch(
        texts=request.texts,
        target_language=request.target_language,
        source_language=request.source_language
    )

    return [TranslateResponse(**result) for result in results]


@router.post("/detect", response_model=DetectLanguageResponse)
async def detect_language(request: DetectLanguageRequest):
    """
    Detect the language of the given text

    - **text**: The text to analyze (max 5,000 characters)
    """
    service = get_translation_service()

    if not service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Translation service is not configured. Please add GOOGLE_TRANSLATE_API_KEY to .env"
        )

    result = await service.detect_language(request.text)

    if result.get('success'):
        language_code = result.get('language')
        result['language_name'] = SUPPORTED_LANGUAGES.get(language_code, 'Unknown')

    return DetectLanguageResponse(**result)


@router.get("/languages", response_model=SupportedLanguagesResponse)
async def get_supported_languages():
    """
    Get list of all supported languages for translation
    """
    languages = [
        LanguageInfo(code=code, name=name)
        for code, name in sorted(SUPPORTED_LANGUAGES.items(), key=lambda x: x[1])
    ]

    return SupportedLanguagesResponse(
        languages=languages,
        count=len(languages)
    )


@router.get("/status", response_model=TranslationStatusResponse)
async def get_translation_status():
    """
    Check if the translation service is properly configured and available
    """
    service = get_translation_service()

    if service.is_configured():
        return TranslationStatusResponse(
            configured=True,
            message="Translation service is configured and ready"
        )
    else:
        return TranslationStatusResponse(
            configured=False,
            message="Translation service is not configured. Add GOOGLE_TRANSLATE_API_KEY to .env file"
        )


@router.get("/message/{message_id}")
async def translate_message(
    message_id: int,
    target_language: str = Query(..., description="Target language code")
):
    """
    Translate a specific chat message by its ID

    - **message_id**: The ID of the chat message to translate
    - **target_language**: ISO 639-1 language code for the translation
    """
    from models import SessionLocal, ChatMessage

    service = get_translation_service()

    if not service.is_configured():
        raise HTTPException(
            status_code=503,
            detail="Translation service is not configured"
        )

    # Validate target language
    if target_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported target language: {target_language}"
        )

    db = SessionLocal()
    try:
        # Get the message
        message = db.query(ChatMessage).filter(ChatMessage.id == message_id).first()

        if not message:
            raise HTTPException(status_code=404, detail="Message not found")

        if not message.content:
            return {
                "success": True,
                "message_id": message_id,
                "original_text": "",
                "translated_text": "",
                "target_language": target_language
            }

        # Translate the message content
        result = await service.translate_text(
            text=message.content,
            target_language=target_language
        )

        return {
            "success": result.get('success', False),
            "message_id": message_id,
            "original_text": message.content,
            "translated_text": result.get('translated_text', ''),
            "source_language": result.get('source_language'),
            "target_language": target_language,
            "error": result.get('error')
        }

    finally:
        db.close()
