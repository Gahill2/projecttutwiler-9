import os
import hmac
import hashlib
import time
from typing import Optional

API_SIGNING_SECRET = os.getenv("API_SIGNING_SECRET", "")
RAG_SERVICE_KEY = os.getenv("RAG_SERVICE_KEY", "")

def verify_api_key(api_key: Optional[str]) -> bool:
    """Verify X-Api-Key header matches RAG_SERVICE_KEY"""
    if not RAG_SERVICE_KEY:
        return False
    return api_key == RAG_SERVICE_KEY

def verify_timestamp(timestamp: Optional[str]) -> bool:
    """Verify X-Timestamp is within 120 seconds"""
    if not timestamp:
        return False
    try:
        ts = int(timestamp)
        now = int(time.time())
        return abs(now - ts) <= 120
    except:
        return False

def verify_signature(body: bytes, signature: Optional[str], timestamp: Optional[str]) -> bool:
    """Verify X-Signature is HMAC-SHA256(raw body, API_SIGNING_SECRET)"""
    if not signature or not timestamp or not API_SIGNING_SECRET:
        return False
    expected = hmac.new(
        API_SIGNING_SECRET.encode(),
        body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

