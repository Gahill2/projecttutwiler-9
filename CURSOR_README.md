# Cursor AI - Project Setup Guide

This document provides clear instructions for Cursor AI to understand how to start and work with this application.

## Quick Start Commands

### Windows
```bash
# Start everything with GUI wizard
start.bat

# Or run wizard directly
powershell -ExecutionPolicy Bypass -File startup-wizard.ps1
```

### Mac/Linux
```bash
# Make scripts executable (first time only)
chmod +x *.sh

# Setup and start
./setup.sh
./start.sh
```

## Application Architecture

This is a **microservices-based application** using Docker Compose. All services run in containers.

### Services (Ports)
- **Frontend** (3000): Next.js application - Main UI
- **API Gateway** (7070): Routes requests to backend services
- **Orchestrator** (8080): .NET service - Manages verification workflow
- **AI-RAG** (9090): FastAPI service - AI analysis using Ollama
- **CVE Ingestor** (9095): Fetches and stores CVE data
- **ETL-NV** (9101): Non-verified user data pipeline
- **ETL-V** (9102): Verified user data pipeline
- **Ollama** (11434): Local LLM for embeddings and generation

### Key Files
- `docker-compose.yml` - Defines all services
- `.env.backup` - Template for environment variables (committed to git)
- `.env` - Actual environment variables (gitignored, created from .env.backup)
- `startup-wizard.ps1` - Windows GUI setup wizard
- `setup.sh` - Mac/Linux setup script
- `start.sh` - Mac/Linux start script

## Starting the Application

### Windows (Recommended)
1. **Run the GUI wizard:**
   ```bash
   start.bat
   ```
   This opens a GUI that:
   - Checks prerequisites (Docker Desktop)
   - Creates `.env` from `.env.backup`
   - Starts all Docker services
   - Pulls Ollama models automatically

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Admin Dashboard: http://localhost:3000/admin/analytics

### Mac/Linux
1. **Setup (first time):**
   ```bash
   chmod +x *.sh
   ./setup.sh
   ```

2. **Start services:**
   ```bash
   ./start.sh
   ```

3. **Manually pull Ollama models (if needed):**
   ```bash
   docker exec projecttutwiler-9-ollama-1 ollama pull llama3.1:8b
   docker exec projecttutwiler-9-ollama-1 ollama pull nomic-embed-text
   ```

## Environment Configuration

The `.env` file is created from `.env.backup` template. It contains:
- Database connection strings (JAWSDB_URL, JAWSDB_NV_URL, JAWSDB_V_URL)
- API keys (VERIFIED_API_KEYS, ADMIN_API_KEYS)
- Service URLs
- Ollama model names

**Important:** `.env` is gitignored. Each developer gets their own `.env` file.

## Demo Access Codes

For testing, use these codes in the portal:

- **DEMO_LOGIN_VERIFIED** - Routes to verified dashboard
- **DEMO_LOGIN_NON_VERIFIED** - Routes to non-verified dashboard  
- **DEMO_LOGIN_ADMIN** - Routes to admin dashboard

Or use API keys:
- **demo-verified-key-123** - Verified user API key
- **demo-admin-key-123** - Admin API key

## Common Tasks

### Restart Services
```bash
# Windows
docker-compose restart

# Mac/Linux
docker-compose restart
```

### View Logs
```bash
docker-compose logs -f [service-name]
# Example: docker-compose logs -f frontend
```

### Stop All Services
```bash
docker-compose down
```

### Rebuild After Code Changes
```bash
# Rebuild specific service
docker-compose build [service-name]
docker-compose up -d [service-name]

# Rebuild all
docker-compose build
docker-compose up -d
```

## Development Workflow

1. **Make code changes** in your IDE
2. **Rebuild the affected service:**
   ```bash
   docker-compose build [service-name]
   docker-compose up -d [service-name]
   ```
3. **For frontend changes** - Next.js hot-reloads, but you may need to restart:
   ```bash
   docker-compose restart frontend
   ```
4. **For backend changes** - Always rebuild:
   ```bash
   docker-compose build orchestrator
   docker-compose up -d orchestrator
   ```

## Troubleshooting

### Services won't start
- Check Docker Desktop is running
- Verify `.env` file exists (run setup wizard/setup.sh)
- Check logs: `docker-compose logs`

### Frontend not updating
- Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Restart frontend: `docker-compose restart frontend`

### API keys not working
- Verify keys are in `.env` file
- Restart orchestrator: `docker-compose restart orchestrator`
- Check orchestrator logs: `docker-compose logs orchestrator`

### Ollama models missing
- Models are pulled automatically by wizard
- Or manually: `docker exec projecttutwiler-9-ollama-1 ollama pull llama3.1:8b`

## Platform Compatibility

- **Windows:** Full GUI wizard support (PowerShell + Windows Forms)
- **Mac/Linux:** Command-line scripts (setup.sh, start.sh)
- **Docker:** Required on all platforms

The setup wizard (`startup-wizard.ps1`) is **Windows-only** because it uses PowerShell Windows Forms. Mac/Linux users should use `setup.sh` and `start.sh` scripts.

