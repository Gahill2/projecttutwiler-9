import os
import requests
from typing import List, Dict, Any

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
GEN_MODEL = os.getenv("GEN_MODEL", "llama3.1:8b")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")

def get_embedding(text: str) -> List[float]:
    """Get embedding from Ollama"""
    response = requests.post(
        f"{OLLAMA_URL}/api/embeddings",
        json={"model": EMBED_MODEL, "prompt": text},
        timeout=30
    )
    response.raise_for_status()
    return response.json()["embedding"]

def generate(prompt: str) -> Dict[str, Any]:
    """Generate response from Ollama"""
    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={"model": GEN_MODEL, "prompt": prompt, "stream": False},
        timeout=60
    )
    response.raise_for_status()
    return response.json()

