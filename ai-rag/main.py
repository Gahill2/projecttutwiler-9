import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json

# Initialize Sentry if DSN is provided
def init_sentry(service_name: str):
    """Initialize Sentry if DSN is provided"""
    sentry_dsn = os.getenv("SENTRY_DSN")
    if not sentry_dsn:
        return None
    
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.logging import LoggingIntegration
        
        sentry_sdk.init(
            dsn=sentry_dsn,
            integrations=[
                FastApiIntegration(),
                LoggingIntegration(level=None, event_level=None),
            ],
            traces_sample_rate=1.0,
            environment=os.getenv("APP_ENV", "dev"),
            release=os.getenv("GIT_SHA"),
        )
        
        sentry_sdk.set_tag("service", service_name)
        return sentry_sdk
    except ImportError:
        return None

from pinecone_client import get_index
from adapters.ollama import get_embedding, generate
# TODO: Uncomment to enable security
# from security import verify_api_key, verify_timestamp, verify_signature

# Initialize Sentry if DSN is provided
init_sentry("ai-rag")

app = FastAPI()

# TODO: Uncomment to enable CORS restrictions
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=[os.getenv("PUBLIC_WEB_ORIGIN", "http://localhost:3000")],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# TODO: Uncomment to enable security middleware
# @app.middleware("http")
# async def security_middleware(request, call_next):
#     api_key = request.headers.get("X-Api-Key")
#     signature = request.headers.get("X-Signature")
#     timestamp = request.headers.get("X-Timestamp")
#     
#     if not verify_api_key(api_key):
#         return JSONResponse({"error": "Invalid API key"}, status_code=401)
#     if not verify_timestamp(timestamp):
#         return JSONResponse({"error": "Invalid timestamp"}, status_code=401)
#     
#     body = await request.body()
#     if not verify_signature(body, signature, timestamp):
#         return JSONResponse({"error": "Invalid signature"}, status_code=401)
#     
#     request._body = body
#     response = await call_next(request)
#     return response

class DocItem(BaseModel):
    id: str
    text: str
    meta: Optional[Dict[str, Any]] = None
    namespace: Optional[str] = None

class IngestRequest(BaseModel):
    docs: List[DocItem]
    namespace: Optional[str] = None

class AnalyzeRequest(BaseModel):
    text: str
    top_k: Optional[int] = 5
    namespace: Optional[str] = None

def chunk_text(text: str, chunk_size: int = 500) -> List[str]:
    """Simple chunking by character count"""
    chunks = []
    for i in range(0, len(text), chunk_size):
        chunks.append(text[i:i + chunk_size])
    return chunks

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/ingest")
async def ingest(request: IngestRequest):
    try:
        index = get_index()
        namespace = request.namespace or "default"
        
        vectors_to_upsert = []
        for doc in request.docs:
            chunks = chunk_text(doc.text)
            for i, chunk in enumerate(chunks):
                chunk_id = f"{doc.id}_chunk_{i}"
                embedding = get_embedding(chunk)
                
                metadata = {
                    "doc_id": doc.id,
                    "chunk": chunk,
                    "chunk_index": i,
                }
                if doc.meta:
                    metadata.update(doc.meta)
                
                vectors_to_upsert.append({
                    "id": chunk_id,
                    "values": embedding,
                    "metadata": metadata
                })
        
        if vectors_to_upsert:
            index.upsert(vectors=vectors_to_upsert, namespace=namespace)
        
        return {"ingested": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze(request: AnalyzeRequest):
    try:
        index = get_index()
        top_k = request.top_k or 5
        
        # Embed query
        query_embedding = get_embedding(request.text)
        
        # If no namespace specified, search nvd and cisa_kev namespaces
        if request.namespace:
            namespaces = [request.namespace]
        else:
            namespaces = ["nvd", "cisa_kev"]
        
        # Query Pinecone across namespaces and merge results
        all_matches = []
        for ns in namespaces:
            try:
                results = index.query(
                    vector=query_embedding,
                    top_k=top_k,
                    include_metadata=True,
                    namespace=ns
                )
                all_matches.extend(results.matches)
            except Exception as e:
                # If namespace doesn't exist, continue with others
                continue
        
        # Sort by score and take top_k
        all_matches.sort(key=lambda x: x.score, reverse=True)
        results_matches = all_matches[:top_k]
        
        # Create a mock results object for compatibility
        class MockResults:
            def __init__(self, matches):
                self.matches = matches
        
        results = MockResults(results_matches)
        
        # Build context string
        context_parts = []
        for i, match in enumerate(results.matches):
            metadata = match.metadata or {}
            doc_id = metadata.get("doc_id", "unknown")
            chunk = metadata.get("chunk", "")
            score = match.score
            context_parts.append(f"- doc:{doc_id} chunk:{i} score:{score:.3f}")
        
        context_str = "\n".join(context_parts)
        
        # Generate with Ollama
        prompt = f"""Based on the following context, analyze the query and return a JSON response with:
- decision: either "verified" or "non_verified"
- score_bin: a range like "0.5-0.7"
- reason_codes: an array of short reason strings

Context:
{context_str}

Query: {request.text}

Return only valid JSON, no other text."""
        
        gen_response = generate(prompt)
        response_text = gen_response.get("response", "")
        
        # Try to parse JSON from response
        try:
            # Extract JSON if wrapped in markdown code blocks
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                response_text = response_text[start:end].strip()
            elif "```" in response_text:
                start = response_text.find("```") + 3
                end = response_text.find("```", start)
                response_text = response_text[start:end].strip()
            
            result = json.loads(response_text)
            
            # Validate structure
            if "decision" not in result:
                result["decision"] = "non_verified"
            if "score_bin" not in result:
                # Use average similarity score
                avg_score = sum(m.score for m in results.matches) / len(results.matches) if results.matches else 0.0
                result["score_bin"] = f"{avg_score:.2f}-{avg_score + 0.1:.2f}"
            if "reason_codes" not in result:
                result["reason_codes"] = ["analysis_incomplete"]
            
            # Ensure decision is valid
            if result["decision"] not in ["verified", "non_verified"]:
                result["decision"] = "non_verified"
            
            return result
        except json.JSONDecodeError:
            # Fallback: synthesize from similarity scores
            avg_score = sum(m.score for m in results.matches) / len(results.matches) if results.matches else 0.0
            decision = "verified" if avg_score > 0.7 else "non_verified"
            score_bin = f"{avg_score:.2f}-{avg_score + 0.1:.2f}"
            reason_codes = ["llm_parse_failed", "using_similarity_fallback"]
            
            return {
                "decision": decision,
                "score_bin": score_bin,
                "reason_codes": reason_codes
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

