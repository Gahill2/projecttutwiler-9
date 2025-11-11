# Team Setup Guide for Project Tutwiler

## Quick Start for Team Members

### Prerequisites
- Docker Desktop installed and running
- Git installed
- Access to the repository

### Initial Setup (5 minutes)

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd projecttutwiler-9
   ```

2. **Create your `.env` file:**
   
   **Option A: Use shared .env file (if team is using same credentials)**
   - Get the `.env` file from your team lead (via secure sharing method)
   - Copy it to the project root: `cp /path/to/shared/.env .env`
   
   **Option B: Create from template (if using individual credentials)**
   ```bash
   cp .env.sample .env
   # Then edit .env and add your Pinecone API key
   ```

4. **Start all services:**
   ```bash
   docker compose up --build
   ```
   Wait 1-2 minutes for all services to start.

5. **Verify everything is running:**
   ```bash
   # Check all services
   docker compose ps
   
   # Test endpoints
   curl http://localhost:7070/health
   curl http://localhost:9090/health
   curl http://localhost:9095/health
   ```

6. **Seed CVE data (first time only):**
   ```bash
   curl -X POST http://localhost:9095/refresh
   ```
   ⚠️ This takes 5-10 minutes the first time. You can check progress with:
   ```bash
   curl http://localhost:9095/stats
   ```

## Daily Usage

### Access the Frontend
- Open your browser: **http://localhost:3000**
- You should see the Project Tutwiler homepage

### Check CVE Data Status
```bash
curl http://localhost:9095/stats
```

### Search for Vulnerabilities
```bash
curl -X POST http://localhost:9090/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Log4j vulnerability", "top_k": 5}'
```

### Refresh CVE Data
Data auto-refreshes every 6 hours. To refresh manually:
```bash
curl -X POST http://localhost:9095/refresh
```

## Service Endpoints

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Frontend | 3000 | http://localhost:3000 | Web UI |
| API Gateway | 7070 | http://localhost:7070 | Routes requests |
| Orchestrator | 8080 | http://localhost:8080 | Database & auth |
| AI-RAG | 9090 | http://localhost:9090 | **Search CVEs** |
| CVE Ingestor | 9095 | http://localhost:9095 | Manage CVE data |
| ETL-NV | 9101 | http://localhost:9101 | Internal |
| ETL-V | 9102 | http://localhost:9102 | Internal |

## Common Tasks

### Task 1: Find CVEs for a specific product
```bash
curl -X POST http://localhost:9090/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "Apache Log4j vulnerabilities", "top_k": 10}'
```

### Task 2: Check if data is up to date
```bash
curl http://localhost:9095/stats
```
Look at `last_refresh_at` timestamps.

### Task 3: Search only critical vulnerabilities (CISA KEV)
```bash
curl -X POST http://localhost:9090/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "critical remote code execution", "namespace": "cisa_kev", "top_k": 5}'
```

## Troubleshooting

### Services won't start
```bash
# Check Docker is running
docker ps

# Restart services
docker compose restart

# View logs
docker compose logs [service-name]
```

### No CVE data
```bash
# Check stats
curl http://localhost:9095/stats

# If empty, refresh
curl -X POST http://localhost:9095/refresh
```

### Frontend shows error
```bash
# Check frontend logs
docker logs projecttutwiler-9-frontend-1

# Restart frontend
docker compose restart frontend
```

### Pinecone connection errors
- Verify `PINECONE_API_KEY` is set in `.env`
- Make sure the API key is valid
- Check that `PINECONE_INDEX=cve-index` matches your Pinecone index name

## Team Collaboration

### Sharing Configuration

**Option 1: Shared .env File (Simplest - Recommended for teams)**
- Team lead creates a complete `.env` file with all credentials
- Share the `.env` file securely (password manager, encrypted file share, secure team chat)
- Each team member copies the shared `.env` file to their project root
- Everyone uses the same Pinecone API key, database, etc.
- ✅ Simplest setup
- ✅ Everyone has identical configuration
- ⚠️ If one person changes it, others need to update

**Option 2: Shared API Key Only**
- Team lead shares just the Pinecone API key securely
- Each person creates their own `.env` from `.env.sample`
- Everyone adds the same API key
- ✅ More flexible (can customize other settings)
- ⚠️ More setup steps

**Option 3: Individual Keys**
- Each team member creates their own Pinecone account
- Each person has their own API key
- Can share the same index name or use separate indexes
- ✅ Most control and isolation
- ⚠️ More complex setup

### Important: Security
- **NEVER commit `.env` to git** - it contains API keys
- Make sure `.env` is in `.gitignore`
- Share API keys through secure channels only

## Environment Variables Reference

### Required
- `PINECONE_API_KEY` - Your Pinecone API key
- `PINECONE_INDEX` - Index name (usually `cve-index`)

### Optional (have defaults)
- `OLLAMA_URL` - Default: `http://ollama:11434`
- `EMBED_MODEL` - Default: `nomic-embed-text`
- `CVE_REFRESH_WINDOW_DAYS` - Default: `3`
- `CVE_AUTORUN` - Default: `false` (set to `true` for auto-refresh)

### Database (if using)
- `JAWSDB_URL` - MySQL connection string
- `VERIFY_PROVIDER` - Default: `mock`

## Quick Commands Cheat Sheet

```bash
# Start everything
docker compose up -d

# Stop everything
docker compose down

# View logs
docker compose logs -f [service-name]

# Restart a service
docker compose restart [service-name]

# Check service status
docker compose ps

# Health checks
curl http://localhost:7070/health
curl http://localhost:9090/health
curl http://localhost:9095/health

# CVE operations
curl http://localhost:9095/stats
curl -X POST http://localhost:9095/refresh

# Search CVEs
curl -X POST http://localhost:9090/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "your query", "top_k": 5}'
```

## Need Help?

1. Check service logs: `docker compose logs [service-name]`
2. Verify `.env` file has correct values
3. Ensure Docker Desktop is running
4. Check that ports 3000, 7070, 8080, 9090, 9095 are not in use by other applications

