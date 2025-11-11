# Project Tutwiler

Microservices architecture with Docker, JawsDB MySQL, Pinecone, and Ollama-powered RAG service.

## Architecture Principles

- **Zero-data principle**: Never persist raw user inputs or PII. Only store user status and coarse reason codes.
- **Two-lane verification**: NV (non verified) vs V (verified). ETLs are stubbed for MVP.
- **No dashes in UI text**: All visible UI strings use spaces, not hyphens.

## Quick Start

### Prerequisites

1. Install Docker Desktop
2. Clone this repository

### Setup

1. Copy environment template:
   ```bash
   cp .env.sample .env
   ```

2. Edit `.env` and fill in:
   - `JAWSDB_URL`: Your JawsDB MySQL connection string
   - `VERIFY_PROVIDER`: Set to `mock` (default) or `persona` when credentials are available
   - `PINECONE_API_KEY`: Your Pinecone API key
   - `PINECONE_ENVIRONMENT`: Your Pinecone environment (e.g., `us-east1-gcp`)
   - `PINECONE_INDEX`: Your Pinecone index name

3. **Create database tables** (run once on your JawsDB instance):
   ```sql
   -- See orchestrator/Orchestrator/DatabaseMigration.sql
   -- Creates app_users and app_status_audit tables
   ```

4. Choose Ollama setup:

   **Option A: Local Ollama Desktop App**
   - Install Ollama desktop app
   - Ensure `OLLAMA_URL=http://host.docker.internal:11434` in `.env`
   - Pull models locally:
     ```bash
     ollama pull llama3.1:8b
     ollama pull nomic-embed-text
     ```

   **Option B: Docker Ollama Container**
   - Ensure `OLLAMA_URL=http://ollama:11434` in `.env`
   - After starting services, pull models:
     ```bash
     docker exec -it ollama ollama pull llama3.1:8b
     docker exec -it ollama ollama pull nomic-embed-text
     ```

4. Start all services:
   ```bash
   docker compose up --build
   ```

### Service Endpoints

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost:7070/health
- **Orchestrator**: http://localhost:8080/health
- **AI-RAG**: http://localhost:9090/health
- **ETL-NV**: http://localhost:9101/health
- **ETL-V**: http://localhost:9102/health

### Identity Verification (Mock Provider)

The system uses a **Mock verification provider** by default - no external dependencies required. The adapter pattern architecture makes it easy to swap in third-party providers (Persona, Id.me, etc.) later when needed.

**Current Setup (Mock)**:
- Default provider: `VERIFY_PROVIDER=mock` (no configuration needed)
- Works immediately - no API keys or external services required
- Visit http://localhost:3000/auth and click "Start Verification"
- Returns "Verified" status via mock flow

**Future Provider Integration**:
- Architecture supports easy swap to Persona, Id.me, or other providers
- Simply implement `IVerifier` interface and update provider selection
- No changes needed to frontend or routing logic

**Routes:**
- `GET /auth/start?user_id=<uuid>` - Start verification flow
- `GET /auth/callback` - Handle provider callback
- `GET /user/{id}/status` - Get user verification status

### Testing

Run the smoke tests:
```bash
./scripts/curl-tests.sh
```

Or manually test:
- Frontend buttons: "Check API" and "Check Database"
- Identity verification: http://localhost:3000/(auth)
- Health endpoints: All services expose `/health`

## Security

Security middleware is scaffolded but **disabled by default** for development convenience. To enable:

1. Uncomment security middleware in:
   - `api-gateway/src/index.ts`
   - `ai-rag/main.py`

2. Ensure all service keys are set in `.env`:
   - `API_SIGNING_SECRET`
   - `RAG_SERVICE_KEY`
   - `NV_SERVICE_KEY`
   - `V_SERVICE_KEY`

3. Security features (when enabled):
   - `X-Api-Key` header validation
   - `X-Timestamp` validation (120 second window)
   - `X-Signature` HMAC-SHA256 verification

## Service Details

### Frontend
Next.js application with:
- Connectivity check buttons (main page)
- Identity verification flow (`/(auth)` route)
- Result display page (`/(auth)/result`)

### API Gateway
Express TypeScript service that routes requests and provides health checks.

### Orchestrator
.NET 8 minimal API that connects to JawsDB MySQL and provides:
- Database health checks
- Identity verification endpoints (`/auth/start`, `/auth/callback`)
- User status queries (`/user/{id}/status`)
- Provider-agnostic verification system (Persona, Mock, extensible to others)

### AI-RAG
FastAPI service for document ingestion and analysis using Ollama embeddings and Pinecone retrieval.

### ETL Services
Stub services for non-verified (NV) and verified (V) data processing pipelines.

## Development Notes

- All services read environment variables from `.env`
- Database is external (JawsDB on Heroku); no local DB container
- Only Ollama cache is persisted via Docker volume
- Services communicate via Docker network hostnames
