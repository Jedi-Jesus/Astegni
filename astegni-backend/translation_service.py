"""
Translation Service for Astegni Chat
Uses Google Cloud Translation API for real-time message translation
"""

import os
import httpx
from typing import Optional, List, Dict
from functools import lru_cache

# Google Cloud Translation API configuration
GOOGLE_TRANSLATE_API_KEY = os.getenv('GOOGLE_TRANSLATE_API_KEY', '')
GOOGLE_TRANSLATE_API_URL = 'https://translation.googleapis.com/language/translate/v2'
GOOGLE_DETECT_API_URL = 'https://translation.googleapis.com/language/translate/v2/detect'
GOOGLE_LANGUAGES_API_URL = 'https://translation.googleapis.com/language/translate/v2/languages'

# Supported languages with their display names
SUPPORTED_LANGUAGES = {
    'en': 'English',
    'am': 'Amharic',
    'om': 'Oromo',
    'ti': 'Tigrinya',
    'fr': 'French',
    'ar': 'Arabic',
    'es': 'Spanish',
    'pt': 'Portuguese',
    'zh': 'Chinese',
    'hi': 'Hindi',
    'sw': 'Swahili',
    'de': 'German',
    'it': 'Italian',
    'ja': 'Japanese',
    'ko': 'Korean',
    'ru': 'Russian',
    'tr': 'Turkish',
    'nl': 'Dutch',
    'pl': 'Polish',
    'vi': 'Vietnamese',
    'th': 'Thai',
    'id': 'Indonesian',
    'ms': 'Malay',
    'he': 'Hebrew',
    'uk': 'Ukrainian',
    'bn': 'Bengali',
    'ur': 'Urdu',
    'ta': 'Tamil',
    'te': 'Telugu',
    'yo': 'Yoruba',
    'ig': 'Igbo',
    'ha': 'Hausa',
    'zu': 'Zulu',
    'af': 'Afrikaans'
}


class TranslationService:
    """Service for translating text using Google Cloud Translation API"""

    def __init__(self):
        self.api_key = GOOGLE_TRANSLATE_API_KEY
        self.configured = bool(self.api_key)
        if not self.configured:
            print("[WARNING] Google Translate API key not configured - translation disabled")

    async def translate_text(
        self,
        text: str,
        target_language: str,
        source_language: Optional[str] = None
    ) -> Dict:
        """
        Translate text to target language

        Args:
            text: Text to translate
            target_language: ISO 639-1 language code (e.g., 'en', 'am', 'fr')
            source_language: Optional source language code. If not provided, auto-detects.

        Returns:
            Dict with translated_text, source_language, and target_language
        """
        if not self.configured:
            return {
                'success': False,
                'error': 'Translation service not configured',
                'original_text': text
            }

        if not text or not text.strip():
            return {
                'success': True,
                'translated_text': text,
                'original_text': text,
                'source_language': source_language or 'unknown',
                'target_language': target_language
            }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                params = {
                    'key': self.api_key,
                    'q': text,
                    'target': target_language,
                    'format': 'text'
                }

                if source_language:
                    params['source'] = source_language

                response = await client.post(
                    GOOGLE_TRANSLATE_API_URL,
                    params=params
                )

                if response.status_code == 200:
                    data = response.json()
                    translation = data['data']['translations'][0]

                    return {
                        'success': True,
                        'translated_text': translation['translatedText'],
                        'original_text': text,
                        'source_language': translation.get('detectedSourceLanguage', source_language),
                        'target_language': target_language
                    }
                else:
                    error_data = response.json()
                    error_message = error_data.get('error', {}).get('message', 'Translation failed')
                    return {
                        'success': False,
                        'error': error_message,
                        'original_text': text
                    }

        except httpx.TimeoutException:
            return {
                'success': False,
                'error': 'Translation service timed out',
                'original_text': text
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'original_text': text
            }

    async def translate_batch(
        self,
        texts: List[str],
        target_language: str,
        source_language: Optional[str] = None
    ) -> List[Dict]:
        """
        Translate multiple texts in a single API call

        Args:
            texts: List of texts to translate
            target_language: ISO 639-1 language code
            source_language: Optional source language code

        Returns:
            List of translation results
        """
        if not self.configured:
            return [{
                'success': False,
                'error': 'Translation service not configured',
                'original_text': text
            } for text in texts]

        if not texts:
            return []

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                params = {
                    'key': self.api_key,
                    'target': target_language,
                    'format': 'text'
                }

                if source_language:
                    params['source'] = source_language

                # Google API accepts multiple 'q' parameters
                for text in texts:
                    if 'q' in params:
                        if isinstance(params['q'], list):
                            params['q'].append(text)
                        else:
                            params['q'] = [params['q'], text]
                    else:
                        params['q'] = text

                response = await client.post(
                    GOOGLE_TRANSLATE_API_URL,
                    params=params
                )

                if response.status_code == 200:
                    data = response.json()
                    translations = data['data']['translations']

                    results = []
                    for i, translation in enumerate(translations):
                        results.append({
                            'success': True,
                            'translated_text': translation['translatedText'],
                            'original_text': texts[i],
                            'source_language': translation.get('detectedSourceLanguage', source_language),
                            'target_language': target_language
                        })
                    return results
                else:
                    error_data = response.json()
                    error_message = error_data.get('error', {}).get('message', 'Translation failed')
                    return [{
                        'success': False,
                        'error': error_message,
                        'original_text': text
                    } for text in texts]

        except Exception as e:
            return [{
                'success': False,
                'error': str(e),
                'original_text': text
            } for text in texts]

    async def detect_language(self, text: str) -> Dict:
        """
        Detect the language of the given text

        Args:
            text: Text to analyze

        Returns:
            Dict with detected language code and confidence
        """
        if not self.configured:
            return {
                'success': False,
                'error': 'Translation service not configured'
            }

        if not text or not text.strip():
            return {
                'success': False,
                'error': 'Empty text provided'
            }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                params = {
                    'key': self.api_key,
                    'q': text
                }

                response = await client.post(
                    GOOGLE_DETECT_API_URL,
                    params=params
                )

                if response.status_code == 200:
                    data = response.json()
                    detection = data['data']['detections'][0][0]

                    return {
                        'success': True,
                        'language': detection['language'],
                        'confidence': detection.get('confidence', 0),
                        'is_reliable': detection.get('isReliable', False)
                    }
                else:
                    error_data = response.json()
                    error_message = error_data.get('error', {}).get('message', 'Detection failed')
                    return {
                        'success': False,
                        'error': error_message
                    }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def get_supported_languages(self) -> Dict[str, str]:
        """Get list of supported languages"""
        return SUPPORTED_LANGUAGES.copy()

    def is_configured(self) -> bool:
        """Check if translation service is properly configured"""
        return self.configured


# Singleton instance
_translation_service = None

def get_translation_service() -> TranslationService:
    """Get the singleton translation service instance"""
    global _translation_service
    if _translation_service is None:
        _translation_service = TranslationService()
    return _translation_service
