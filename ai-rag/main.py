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
    include_identity: Optional[bool] = True

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
        top_k = request.top_k or 5
        
        # Embed query
        query_embedding = get_embedding(request.text)
        
        # Try to query Pinecone, but handle gracefully if not available
        all_matches = []
        try:
            index = get_index()
            
            # If no namespace specified, search nvd and cisa_kev namespaces
            if request.namespace:
                namespaces = [request.namespace]
            else:
                namespaces = ["nvd", "cisa_kev"]
            
            # Query Pinecone across namespaces and merge results
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
        except Exception as e:
            # Pinecone not available or not configured - continue without vector search
            # This allows the system to work even if Pinecone isn't set up yet
            print(f"Pinecone query failed (continuing without vector search): {e}")
            all_matches = []
        
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
        for i, match in enumerate(results_matches):
            metadata = match.metadata or {}
            doc_id = metadata.get("doc_id", "unknown")
            chunk = metadata.get("chunk", "")
            score = match.score
            context_parts.append(f"- doc:{doc_id} chunk:{i} score:{score:.3f}")
        
        context_str = "\n".join(context_parts) if context_parts else "No CVE context available (Pinecone not configured or empty)"
        
        # Generate with Ollama (use small model for verification - it's now mostly heuristic-based anyway)
        # Enhanced prompt that considers user identity and problem description
        if all_matches:
            context_instruction = f"Context from CVE databases:\n{context_str}\n\n"
        else:
            context_instruction = "Note: CVE database context is not available. Base your decision on the user's description and role.\n\n"
        
        prompt = f"""You are a security verification system. Your purpose is to determine if a user should be VERIFIED or NON-VERIFIED.

VERIFICATION RULES (be lenient - default to verified if criteria are met):
- VERIFY if: User has a REAL security threat AND a professional role in security/biotech/IT/research field
- VERIFY if: User has a legitimate security concern with specific details, even if role is generic
- NON-VERIFY if: User is a student OR has a role clearly outside security/biotech field (e.g., "teacher", "artist", "retail worker") AND the threat is obviously not important or vague
- NON-VERIFY if: Threat is clearly spam, test input, or not a real security concern

Key Principles:
1. If someone has a real threat AND a real professional role title (security, biotech, IT, research, lab manager, etc.), they should be VERIFIED
2. Students or non-field roles with vague/unimportant threats should be NON-VERIFIED
3. Be lenient - when in doubt, verify if there's a legitimate security concern
4. Only reject if clearly spam, test input, or student/non-field role with trivial concern

{context_instruction}User Query (includes identity and problem):
{request.text}

Return only valid JSON with:
- decision: either "verified" or "non_verified"
- score_bin: a range like "0.5-0.7" representing confidence
- reason_codes: an array of short reason strings explaining the decision (e.g., "real_threat_and_professional_role", "student_with_vague_threat", "legitimate_security_concern", "spam_detected")

Return only valid JSON, no other text. Example format:
{{"decision": "verified", "score_bin": "0.75-0.85", "reason_codes": ["real_threat_and_professional_role", "legitimate_security_concern"]}}"""
        
        # Use small model for verification (now mostly heuristic-based, AI is backup)
        gen_response = generate(prompt, use_large_model=False)
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
                avg_score = sum(m.score for m in results_matches) / len(results_matches) if results_matches else 0.0
                result["score_bin"] = f"{avg_score:.2f}-{avg_score + 0.1:.2f}"
            if "reason_codes" not in result:
                result["reason_codes"] = ["analysis_incomplete"]
            
            # Ensure decision is valid
            if result["decision"] not in ["verified", "non_verified"]:
                result["decision"] = "non_verified"
            
            # Add similar CVEs for comparison
            similar_cves = []
            for match in results_matches[:5]:  # Top 5 similar CVEs
                metadata = match.metadata or {}
                doc_id = metadata.get("doc_id", "unknown")
                chunk = metadata.get("chunk", "")
                similar_cves.append({
                    "id": doc_id,
                    "score": match.score,
                    "description": chunk[:200] + "..." if len(chunk) > 200 else chunk
                })
            
            result["similar_cves"] = similar_cves
            
            return result
        except json.JSONDecodeError:
            # Fallback: synthesize from similarity scores
            avg_score = sum(m.score for m in results_matches) / len(results_matches) if results_matches else 0.0
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

class ChatRequest(BaseModel):
    message: str
    context: Optional[str] = None
    limit_features: Optional[bool] = False
    issue_id: Optional[str] = None

@app.post("/chat")
async def chat(request: ChatRequest):
    """Chat endpoint for user questions and advice - OPTIMIZED FOR SPEED"""
    try:
        # Template responses for common questions (INSTANT, no AI needed)
        message_lower = request.message.lower().strip()
        common_responses = {
            "hello": "Hello! I'm your AI security advisor. How can I help you today?",
            "hi": "Hi! I'm here to help with your security questions. What would you like to know?",
            "help": "I can help you with security best practices, threat analysis, and CVE information. What specific question do you have?",
            "what can you do": "I can provide security advice, analyze threats, and help you understand CVEs. What would you like to know?",
            "what is a cve": "A CVE (Common Vulnerabilities and Exposures) is a unique identifier for publicly known cybersecurity vulnerabilities. CVEs help security professionals track, share, and address security issues across systems.",
            "what is cve": "A CVE (Common Vulnerabilities and Exposures) is a unique identifier for publicly known cybersecurity vulnerabilities. CVEs help security professionals track, share, and address security issues across systems.",
            "cve meaning": "CVE stands for Common Vulnerabilities and Exposures. It's a system for identifying and cataloging cybersecurity vulnerabilities with unique identifiers like CVE-2024-1234.",
            "thanks": "You're welcome! Feel free to ask if you need anything else.",
            "thank you": "You're welcome! Happy to help.",
        }
        
        # Check for exact matches first (instant response)
        if message_lower in common_responses:
            return {
                "response": common_responses[message_lower],
                "context_used": False
            }
        
        # Check for partial matches (common patterns) - also instant
        if "what is" in message_lower and "cve" in message_lower:
            return {
                "response": "A CVE (Common Vulnerabilities and Exposures) is a unique identifier for publicly known cybersecurity vulnerabilities. CVEs help security professionals track, share, and address security issues across systems.",
                "context_used": False
            }
        if "explain" in message_lower and "cve" in message_lower:
            return {
                "response": "CVEs are standardized identifiers for security vulnerabilities. Each CVE has a unique ID (like CVE-2024-1234) and includes details about the vulnerability, affected systems, and potential impact.",
                "context_used": False
            }
        
        # More template responses to skip Ollama entirely (INSTANT responses)
        if "security" in message_lower and "best practice" in message_lower:
            return {
                "response": "Security best practices include: keeping software updated, using strong passwords, enabling multi-factor authentication, regular backups, and monitoring for suspicious activity. For specific threats, verified access provides detailed analysis.",
                "context_used": False
            }
        if "how do i" in message_lower and "verify" in message_lower:
            return {
                "response": "To get verified access, submit a request through the portal with your name, role, and a description of your security concern. Verified users get access to detailed CVE analysis and threat intelligence.",
                "context_used": False
            }
        if len(message_lower.split()) <= 3 and "?" in request.message:
            # Very short questions - likely simple queries, skip Ollama
            return {
                "response": "I can help with security questions, CVE information, and threat analysis. Could you provide more details about what you'd like to know?",
                "context_used": False
            }
        
        # More template responses to skip Ollama entirely
        if "security" in message_lower and "best practice" in message_lower:
            return {
                "response": "Security best practices include: keeping software updated, using strong passwords, enabling multi-factor authentication, regular backups, and monitoring for suspicious activity. For specific threats, verified access provides detailed analysis.",
                "context_used": False
            }
        if "how do i" in message_lower and "verify" in message_lower:
            return {
                "response": "To get verified access, submit a request through the portal with your name, role, and a description of your security concern. Verified users get access to detailed CVE analysis and threat intelligence.",
                "context_used": False
            }
        if len(message_lower.split()) <= 3 and "?" in request.message:
            # Very short questions - likely simple queries
            return {
                "response": "I can help with security questions, CVE information, and threat analysis. Could you provide more details about what you'd like to know?",
                "context_used": False
            }
        
        # For non-verified users, provide limited guidance (use small, fast model, NO embeddings, NO Pinecone)
        if request.limit_features:
            # Skip AI entirely for very simple questions - use templates
            simple_questions = {
                "how do i": "I can help you understand how to use the platform. For verified access, submit a request through the portal. What specific feature are you interested in?",
                "how to": "I can provide general guidance. For detailed security analysis and CVE information, you'll need verified access. What would you like to know?",
                "what should i": "For general security questions, I recommend following best practices like keeping systems updated and using strong passwords. For specific threat analysis, verified access is required.",
            }
            
            for pattern, response in simple_questions.items():
                if pattern in message_lower:
                    return {
                        "response": response,
                        "context_used": False
                    }
            
            # Ultra-short prompt for speed - only if no template match
            prompt = f"Q: {request.message[:150]}\n\nA (2 sentences max):"
            # Use small model, no embeddings, no Pinecone, very short timeout
            try:
                gen_response = generate(prompt, use_large_model=False, use_cache=True)
                response_text = gen_response.get("response", "I can help with general security guidance. What specific question do you have?")
                # Extract just the answer part if model includes question
                if "A:" in response_text:
                    response_text = response_text.split("A:")[-1].strip()
                return {
                    "response": response_text[:250],  # Limit response length
                    "context_used": False
                }
            except Exception as e:
                # If Ollama fails, return helpful fallback
                return {
                    "response": "I can help with general security guidance. For detailed analysis, please request verified access. What specific question do you have?",
                    "context_used": False
                }
        else:
            # For verified users - ONLY use Pinecone/embeddings if issue_id is present (skip for general chat)
            context_parts = []
            context_str = "No specific CVE context available."
            
            # ONLY do expensive Pinecone lookup for issue-specific queries
            if request.issue_id:
                try:
                    query_embedding = get_embedding(request.message[:200])  # Limit embedding size
                    index = get_index()
                    namespaces = ["nvd", "cisa_kev"]
                    
                    for ns in namespaces:
                        try:
                            results = index.query(
                                vector=query_embedding,
                                top_k=2,  # Reduced from 3
                                include_metadata=True,
                                namespace=ns
                            )
                            for match in results.matches:
                                metadata = match.metadata or {}
                                chunk = metadata.get("chunk", "")
                                if chunk:
                                    context_parts.append(f"- {chunk[:150]}...")  # Shorter chunks
                        except:
                            continue
                    
                    if context_parts:
                        context_str = "\n".join(context_parts[:2])  # Max 2 chunks
                except:
                    pass  # Skip Pinecone if it fails
            
            # Ultra-short prompts for speed
            if request.issue_id:
                prompt = f"Security expert. Issue: {request.issue_id}\nContext: {context_str}\nQuestion: {request.message[:200]}\n\nBrief advice (3-4 sentences):"
            else:
                # General chat - NO embeddings, NO Pinecone for speed
                # Ultra-minimal prompt
                prompt = f"Q: {request.message[:150]}\n\nA (2-3 sentences):"
        
        # ALWAYS use small model for speed (never use large model)
        try:
            gen_response = generate(prompt, use_large_model=False, use_cache=True)
            response_text = gen_response.get("response", "I can help with security questions. What would you like to know?")
            # Extract answer if model includes question
            if "A:" in response_text:
                response_text = response_text.split("A:")[-1].strip()
            elif "Answer:" in response_text:
                response_text = response_text.split("Answer:")[-1].strip()
        except Exception as e:
            # Fallback if Ollama fails
            response_text = "I can help with security questions. Please try rephrasing your question or try again in a moment."
        
        return {
            "response": response_text[:350],  # Limit response length for speed
            "context_used": len(context_parts) > 0
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class AnalyzeThreatRequest(BaseModel):
    text: str
    context: Optional[str] = None
    top_k: Optional[int] = 5

@app.post("/analyze-threat")
async def analyze_threat(request: AnalyzeThreatRequest):
    """Analyze threat endpoint for CVE analysis and categorization"""
    try:
        # Use the existing analyze endpoint logic
        query_embedding = get_embedding(request.text)
        
        # Try to get relevant context from Pinecone
        all_matches = []
        try:
            index = get_index()
            namespaces = ["nvd", "cisa_kev"]
            
            for ns in namespaces:
                try:
                    results = index.query(
                        vector=query_embedding,
                        top_k=request.top_k or 5,
                        include_metadata=True,
                        namespace=ns
                    )
                    all_matches.extend(results.matches)
                except:
                    continue
        except:
            pass
        
        # Sort by score and take top_k
        all_matches.sort(key=lambda x: x.score, reverse=True)
        results_matches = all_matches[:request.top_k or 5]
        
        # Calculate average similarity score
        avg_score = sum(m.score for m in results_matches) / len(results_matches) if results_matches else 0.0
        
        # Determine if it's a real threat based on similarity and content
        is_real_threat = avg_score > 0.3 or len(request.text) > 50
        
        # Flag suspicious content
        suspicious_keywords = ['test', 'fake', 'spam', 'lol', 'haha', 'asdf', 'qwerty']
        text_lower = request.text.lower()
        is_flagged = any(keyword in text_lower for keyword in suspicious_keywords) or len(request.text) < 20
        
        # Calculate confidence based on similarity score
        confidence = min(avg_score * 1.2, 1.0) if results_matches else 0.5
        
        # Extract flags/reason codes
        flags = []
        if not is_real_threat:
            flags.append("low_similarity")
        if is_flagged:
            flags.append("suspicious_content")
        if avg_score > 0.7:
            flags.append("high_similarity")
        if len(results_matches) == 0:
            flags.append("no_cve_matches")
        
        # Generate analysis text using LLM - OPTIMIZED FOR SPEED
        context_str = "\n".join([f"- {m.metadata.get('chunk', '')[:100]}..." for m in results_matches[:2]]) if results_matches else "No similar CVEs."
        
        # Ultra-short prompt for speed
        prompt = f"Security threat: {request.text[:150]}\nContext: {context_str}\n\nBrief analysis (1-2 sentences):"
        
        try:
            # Use small model, aggressive caching
            gen_response = generate(prompt, use_large_model=False, use_cache=True)
            analysis_text = gen_response.get("response", "Threat analyzed.")[:200]  # Limit length
        except:
            # Fallback to simple analysis
            analysis_text = f"{'High' if avg_score > 0.5 else 'Low'} similarity to known CVEs (score: {avg_score:.2f})."
        
        # Calculate risk score (0-1 scale)
        risk_score = min(avg_score * 1.1, 1.0) if results_matches else 0.5
        if is_flagged:
            risk_score *= 0.5  # Reduce risk score for flagged content
        
        return {
            "is_real_threat": is_real_threat,
            "is_flagged": is_flagged,
            "confidence": confidence,
            "flags": flags,
            "analysis": analysis_text,
            "risk_score": risk_score,
            "similar_cves": [
                {
                    "id": m.metadata.get("doc_id", "unknown"),
                    "score": m.score,
                    "description": m.metadata.get("chunk", "")[:200] + "..." if len(m.metadata.get("chunk", "")) > 200 else m.metadata.get("chunk", "")
                }
                for m in results_matches[:5]
            ],
            "score_bin": f"{avg_score:.2f}-{min(avg_score + 0.1, 1.0):.2f}" if results_matches else "0.0-0.1"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

