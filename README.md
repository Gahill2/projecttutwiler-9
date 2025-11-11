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
- **CVE Ingestor**: http://localhost:9095/health
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

### CVE Ingestor
FastAPI service that ingests CVE data from public feeds (NVD, CISA KEV, OSV) and stores embeddings in Pinecone. See [CVE Data Feeds](#cve-data-feeds) section below.

### ETL Services
Stub services for non-verified (NV) and verified (V) data processing pipelines.

## CVE Data Feeds

The CVE Ingestor service automatically fetches vulnerability data from official public sources and makes it searchable via the AI-RAG service.

### Setup

1. **Ensure Pinecone and Ollama are configured** in `.env`:
   ```bash
   PINECONE_API_KEY=your_key
   PINECONE_INDEX=your_index
   OLLAMA_URL=http://ollama:11434
   EMBED_MODEL=nomic-embed-text
   ```

2. **Configure CVE sources** (optional, defaults work):
   ```bash
   NVD_API_BASE=https://services.nvd.nist.gov/rest/json/cves/2.0
   NVD_API_KEY=  # Optional: raises rate limits from 5 to 50 req/30s
   CISA_KEV_JSON=https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json
   CVE_REFRESH_WINDOW_DAYS=3
   CVE_AUTORUN=true  # Auto-refresh every 6 hours
   ```

3. **Start the stack**:
   ```bash
   docker compose up --build
   ```

4. **Seed initial data** (first time):
   ```bash
   curl -X POST http://localhost:9095/refresh
   ```

5. **Check ingestion stats**:
   ```bash
   curl http://localhost:9095/stats
   ```

### Querying CVE Data

The AI-RAG service automatically searches CVE namespaces when no namespace is specified:

```bash
curl -X POST http://localhost:9090/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Log4j vulnerability", "top_k": 5}'
```

This searches both `nvd` and `cisa_kev` namespaces by default. To search a specific namespace, include it in the request:

```bash
curl -X POST http://localhost:9090/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Log4j vulnerability", "namespace": "nvd", "top_k": 5}'
```

### Data Sources

- **NVD (National Vulnerability Database)**: Official CVE data with CVSS scores, CWE mappings, and vendor/product information
- **CISA KEV (Known Exploited Vulnerabilities)**: Catalog of vulnerabilities actively exploited in the wild
- **OSV.dev** (optional): Open source vulnerability database (enable with `OSV_ENABLED=true`)

All data is normalized to a common schema and stored in Pinecone with embeddings for semantic search.

## Error Logging

Optional Sentry integration for error tracking across all services.

### Setup

1. **Get a Sentry DSN** from [sentry.io](https://sentry.io) (free tier available)

2. **Set environment variable**:
   ```bash
   SENTRY_DSN=https://your-dsn@sentry.io/project-id
   APP_ENV=dev  # or production, staging, etc.
   GIT_SHA=  # Optional: commit SHA for release tracking
   ```

3. **For frontend**, also set:
   ```bash
   NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```

### Services with Error Logging

All services support optional Sentry integration:

- **Frontend**: Initializes on client-side if `NEXT_PUBLIC_SENTRY_DSN` is set
- **API Gateway**: Initializes on startup if `SENTRY_DSN` is set
- **Orchestrator**: Initializes on startup if `SENTRY_DSN` is set
- **AI-RAG**: Initializes on startup if `SENTRY_DSN` is set
- **CVE Ingestor**: Initializes on startup if `SENTRY_DSN` is set

If `SENTRY_DSN` is not set, all services run normally without error tracking (no-op).

### Event Tagging

All Sentry events are automatically tagged with:
- `service`: Service name (e.g., "ai-rag", "cve-ingestor")
- `environment`: From `APP_ENV` (default: "dev")
- `release`: From `GIT_SHA` if available
- `request_id`: From request headers if available

## Development Notes

- All services read environment variables from `.env`
- Database is external (JawsDB on Heroku); no local DB container
- Only Ollama cache is persisted via Docker volume
- Services communicate via Docker network hostnames
