import os
import requests
from typing import List, Dict, Any
from functools import lru_cache
import hashlib

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
# Use smaller, faster models to reduce CPU usage
GEN_MODEL = os.getenv("GEN_MODEL", "llama3.2:3b")  # Smaller 3B model for most tasks
GEN_MODEL_LARGE = os.getenv("GEN_MODEL_LARGE", "llama3.1:8b")  # Larger model for complex tasks
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")

# Simple in-memory cache for embeddings (to reduce CPU usage)
_embedding_cache = {}
_generation_cache = {}

def get_embedding(text: str) -> List[float]:
    """Get embedding from Ollama with caching to reduce CPU usage"""
    # Cache key based on text hash
    cache_key = hashlib.md5(text.encode()).hexdigest()
    
    if cache_key in _embedding_cache:
        return _embedding_cache[cache_key]
    
    response = requests.post(
        f"{OLLAMA_URL}/api/embeddings",
        json={
            "model": EMBED_MODEL, 
            "prompt": text,
            "options": {
                "num_ctx": 512,  # Smaller context for embeddings = faster
                "num_thread": 8,  # Maximum threads for 8 CPU cores (maximum parallelization)
            },
            "keep_alive": "5m"  # Keep embedding model loaded
        },
        timeout=10  # Very short timeout - embeddings should be instant
    )
    response.raise_for_status()
    embedding = response.json()["embedding"]
    
    # Cache the result (limit cache size to prevent memory issues)
    if len(_embedding_cache) < 1000:
        _embedding_cache[cache_key] = embedding
    
    return embedding

def generate(prompt: str, use_cache: bool = True, use_large_model: bool = False) -> Dict[str, Any]:
    """Generate response from Ollama with caching and optimized settings
    
    Args:
        prompt: The prompt to generate a response for
        use_cache: Whether to use caching (default: True)
        use_large_model: Whether to use the larger model for complex tasks (default: False)
    """
    # Select model based on complexity
    model = GEN_MODEL_LARGE if use_large_model else GEN_MODEL
    
    # For very similar prompts, use cache
    cache_key = None
    if use_cache and len(prompt) < 500:  # Only cache shorter prompts
        cache_key = hashlib.md5((prompt + model).encode()).hexdigest()
        if cache_key in _generation_cache:
            return _generation_cache[cache_key]
    
    # Use optimized generation parameters to reduce CPU usage
    # Smaller model gets more aggressive optimization
    options = {
        "temperature": 0.7,  # Lower temperature for faster, more deterministic responses
        "top_p": 0.9,  # Nucleus sampling for faster generation
        "num_ctx": 2048,  # Smaller context window = faster generation (reduced from default 4096)
        "num_thread": 8,  # Maximum threads for 8 CPU cores (maximum parallelization)
        "keep_alive": "5m",  # Keep model loaded for 5 minutes after request (reduces reload time)
    }
    
    if use_large_model:
        # Large model: allow longer responses for complex tasks
        options["num_predict"] = 400  # Reduced from 800
        timeout = 60  # Reduced from 120
    else:
        # Small model: VERY short responses for speed
        options["num_predict"] = 150  # Further reduced from 200 - ultra fast
        options["temperature"] = 0.3  # Lower temperature for faster, more deterministic generation
        options["top_k"] = 20  # Limit vocabulary for faster generation
        options["repeat_penalty"] = 1.1  # Slight penalty to prevent repetition (helps finish faster)
        timeout = 40  # Increased to 40s - Docker networking + Ollama generation may need more time
    
    response = requests.post(
        f"{OLLAMA_URL}/api/generate",
        json={
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": options,
            "keep_alive": "5m"  # Keep model loaded for 5 minutes (reduces reload time on next request)
        },
        timeout=timeout
    )
    response.raise_for_status()
    result = response.json()
    
    # Cache the result if it's a short prompt
    if cache_key and len(_generation_cache) < 100:
        _generation_cache[cache_key] = result
    
    return result

