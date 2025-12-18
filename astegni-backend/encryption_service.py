"""
Encryption Service for Chat Messages
=====================================
Provides AES-256 encryption for sensitive data like chat messages.
Uses Fernet (symmetric encryption) which is built on AES-128-CBC with HMAC.

For production, consider:
- Storing encryption keys in a secure key management service (AWS KMS, HashiCorp Vault)
- Implementing key rotation
- Using per-conversation or per-user keys for additional security
"""

from cryptography.fernet import Fernet
import base64
import os
from dotenv import load_dotenv

load_dotenv()

# Get encryption key from environment or generate one
# IMPORTANT: In production, this should be stored securely and never change
# If you lose the key, all encrypted messages become unreadable
ENCRYPTION_KEY = os.getenv("CHAT_ENCRYPTION_KEY")

if not ENCRYPTION_KEY:
    # Generate a new key if not set (for development only)
    # In production, you MUST set this in .env and keep it safe
    print("[WARNING] CHAT_ENCRYPTION_KEY not set. Using a generated key.")
    print("[WARNING] Set CHAT_ENCRYPTION_KEY in .env for production!")
    ENCRYPTION_KEY = Fernet.generate_key().decode()

# Ensure key is valid Fernet key (32 bytes, base64 encoded = 44 chars)
try:
    fernet = Fernet(ENCRYPTION_KEY.encode() if isinstance(ENCRYPTION_KEY, str) else ENCRYPTION_KEY)
except Exception as e:
    print(f"[ERROR] Invalid encryption key: {e}")
    print("[INFO] Generating new key. Add this to your .env file:")
    new_key = Fernet.generate_key().decode()
    print(f"CHAT_ENCRYPTION_KEY={new_key}")
    fernet = Fernet(new_key.encode())


def encrypt_message(plaintext: str) -> str:
    """
    Encrypt a message using AES-256 encryption.

    Args:
        plaintext: The message to encrypt

    Returns:
        Base64 encoded encrypted string
    """
    if not plaintext:
        return plaintext

    try:
        encrypted = fernet.encrypt(plaintext.encode('utf-8'))
        return encrypted.decode('utf-8')
    except Exception as e:
        print(f"[ERROR] Encryption failed: {e}")
        # Return original text if encryption fails (fallback)
        return plaintext


def decrypt_message(ciphertext: str) -> str:
    """
    Decrypt a message that was encrypted with encrypt_message.

    Args:
        ciphertext: The encrypted message (base64 encoded)

    Returns:
        Decrypted plaintext string
    """
    if not ciphertext:
        return ciphertext

    try:
        decrypted = fernet.decrypt(ciphertext.encode('utf-8'))
        return decrypted.decode('utf-8')
    except Exception as e:
        # If decryption fails, message might not be encrypted (legacy)
        # Return as-is for backwards compatibility
        return ciphertext


def is_encrypted(text: str) -> bool:
    """
    Check if a text appears to be encrypted (starts with gAAAAA which is Fernet signature).

    Args:
        text: The text to check

    Returns:
        True if text appears to be Fernet encrypted
    """
    if not text:
        return False
    return text.startswith('gAAAAA')


def generate_new_key() -> str:
    """
    Generate a new Fernet encryption key.
    Use this to create a key for your .env file.

    Returns:
        A new base64-encoded encryption key
    """
    return Fernet.generate_key().decode()


# Utility function to encrypt/decrypt media metadata if needed
def encrypt_dict(data: dict) -> dict:
    """Encrypt string values in a dictionary."""
    if not data:
        return data

    encrypted = {}
    for key, value in data.items():
        if isinstance(value, str) and key in ['caption', 'description', 'filename']:
            encrypted[key] = encrypt_message(value)
        else:
            encrypted[key] = value
    return encrypted


def decrypt_dict(data: dict) -> dict:
    """Decrypt string values in a dictionary."""
    if not data:
        return data

    decrypted = {}
    for key, value in data.items():
        if isinstance(value, str) and is_encrypted(value):
            decrypted[key] = decrypt_message(value)
        else:
            decrypted[key] = value
    return decrypted
