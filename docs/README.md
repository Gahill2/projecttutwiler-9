# Project Tutwiler - Bio-ISAC Security Portal

A comprehensive microservices-based security verification and threat intelligence platform designed for the biological/biotech security community. Features AI-powered verification, conversational chatbot interface, and multi-tier dashboards for verified and non-verified users.

## 🎯 Overview

Project Tutwiler provides a secure, AI-driven portal where users can submit security concerns and be automatically routed to appropriate threat intelligence resources based on verification status. The system uses advanced multi-factor analysis to determine user credibility and provides tailored security resources accordingly.

## ✨ Key Features

- **Conversational Security Portal**: Chatbot interface for intuitive user interaction
- **AI-Powered Verification**: Multi-factor analysis combining role credibility, problem severity, technical accuracy, and threat intelligence
- **Multi-Tier Dashboards**: Separate dashboards for verified and non-verified users with appropriate access levels
- **CVE Threat Intelligence**: Integration with NVD, CISA KEV, and OSV for real-time vulnerability data
- **API Key Authentication**: Privileged access for trusted users (e.g., Bio-ISAC leadership)
- **Zero-Data Principle**: No PII storage - only verification status and metadata
- **Multi-Database Isolation**: Separate databases for verified/non-verified users for security
- **Easy Installation**: Automated installer with popup dialogs for user-friendly setup

## 🚀 Quick Start

### For New Users (Recommended)

**Windows:**
1. **Run the installer:**
   ```bash
   install.bat
   ```
   This will:
   - ✅ Check for required software (Docker Desktop)
   - ✅ Show popup dialogs to guide you through installation
   - ✅ Help configure your environment
   - ✅ Optionally start all services

2. **Check service status:**
   ```bash
   check-status.bat
   ```
   Shows a popup with all service statuses

3. **Start services (if not started during install):**
   ```bash
   start.bat
   ```

**Mac/Linux:**
```bash
# Make scripts executable (first time only)
chmod +x *.sh

# Run installer
./install.sh

# Check status
./check-status.sh

# Start services
./start.sh
```

### Manual Setup (Alternative)

If you prefer manual setup, see the [Detailed Setup Guide](docs/README.md).

## 📋 Prerequisites

- **Docker Desktop** - The installer will check and help you install if missing
- **Git** - For cloning the repository
- **(Optional) Database** - External MySQL/JawsDB for production use
- **(Optional) API Keys** - For enhanced features

## 🎮 Available Scripts

### Windows

| Script | Purpose |
|--------|---------|
| `install.bat` | **Start here!** Installation wizard with popup dialogs |
| `check-prerequisites.bat` | Check if all required software is installed |
| `check-status.bat` | Show popup with service status |
| `start.bat` | Start all services |
| `setup.bat` | Initial setup helper |

### Mac/Linux

| Script | Purpose |
|--------|---------|
| `install.sh` | **Start here!** Installation wizard |
| `check-prerequisites.sh` | Check if all required software is installed |
| `check-status.sh` | Show service status |
| `start.sh` | Start all services |
| `setup.sh` | Initial setup helper |

## 🏗️ Architecture

```
Frontend (Next.js) → API Gateway (Express) → Orchestrator (.NET)
                                              ↓
                                    ┌─────────┴─────────┐
                                    ↓                   ↓
                              AI-RAG (FastAPI)    ETL Services
                                    ↓                   ↓
                              Pinecone + Ollama    NV/V Databases
```

**Services:**
- **Frontend** (Port 3000): Next.js app with portal and dashboards
- **API Gateway** (Port 7070): Routes requests to backend services
- **Orchestrator** (Port 8080): .NET service managing verification workflow
- **AI-RAG** (Port 9090): FastAPI service for AI analysis using Ollama + Pinecone
- **CVE Ingestor** (Port 9095): Fetches and stores CVE data
- **ETL-NV** (Port 9101): Non-verified user data pipeline
- **ETL-V** (Port 9102): Verified user data pipeline
- **Ollama** (Port 11434): Local LLM for embeddings and generation

## 📖 User Flow

### 1. Portal Access
- User visits `/portal`
- Conversational chatbot guides through verification process
- User can optionally provide API key for immediate verified access

### 2. Verification Process
- User provides: Name, Role/Organization, Security Concern
- AI analyzes submission using multi-factor scoring:
  - Role credibility
  - Problem severity
  - Technical accuracy
  - Threat alignment
  - Language quality
  - Bio context relevance

### 3. Routing
- **Verified Users** → `/dashboard/verified`
  - Access to prioritized threat intelligence
  - Recent CVE data
  - Advanced security resources
  - Quick action buttons

- **Non-Verified Users** → `/dashboard/non-verified`
  - General security resources
  - CISA, NVD links
  - Information about verification process

## 🔐 Security Features

### API Key Authentication
Privileged users (e.g., Bio-ISAC CEO) can use API keys to skip verification:
```bash
# Set in .env
VERIFIED_API_KEYS=your-secure-key-here
ADMIN_API_KEYS=admin-key-here
```

**Usage:**
1. Visit portal
2. When asked about API key, type "yes"
3. Enter your API key
4. Immediate verified access granted

### Zero-Data Principle
- No PII stored in databases
- Only verification status, timestamps, and reason codes
- Complete audit trail without sensitive data

### Multi-Database Isolation
- Separate databases for verified/non-verified users
- Prevents lateral movement if one database is compromised
- Isolated ETL pipelines

## 📊 API Endpoints

### Portal
- `POST /portal/submit` - Submit security concern
- `POST /portal/validate-api-key` - Validate API key

### Admin
- `GET /admin/analytics` - Get analytics data (requires admin API key)

### Health Checks
- `GET /health` - All services expose health endpoint

### CVE Data
- `GET /cve-ingestor/cves/recent?limit=10` - Get recent CVEs

## 🆘 Troubleshooting

### Services won't start
- Run `check-prerequisites.bat` to verify Docker is installed and running
- Check Docker Desktop is running: `docker ps`
- Verify environment variables are set in `.env`
- Check port conflicts (3000, 7070, 8080, 9090, 9095, 9101, 9102, 11434)

### Database connection errors
- Verify database connection strings in `.env`
- Check network connectivity
- Ensure migrations have been run

### AI analysis not working
- Verify Ollama models are pulled: `docker exec -it projecttutwiler-9-ollama-1 ollama list`
- Check Ollama service is accessible
- Review AI-RAG service logs: `docker compose logs ai-rag`

### Check Service Status
Run `check-status.bat` to see a popup with all service statuses, or:
```bash
docker compose ps
```

All services should show "Up" status.

## 📁 Project Structure

```
projecttutwiler-9/
├── frontend/              # Next.js frontend
│   └── app/
│       ├── page.tsx      # Landing page
│       ├── portal/       # Security portal
│       ├── dashboard/    # User dashboards
│       └── admin/        # Admin analytics
├── api-gateway/          # Express API gateway
├── orchestrator/         # .NET orchestrator
├── ai-rag/              # AI-RAG service
├── cve-ingestor/        # CVE data ingestion
├── etl-nv/              # Non-verified ETL
├── etl-v/               # Verified ETL
├── docker-compose.yml   # Service orchestration
├── install.bat          # Installation wizard (Windows)
├── install.sh           # Installation wizard (Mac/Linux)
├── check-status.bat     # Status checker (Windows)
├── check-status.sh      # Status checker (Mac/Linux)
├── start.bat            # Start services (Windows)
├── start.sh             # Start services (Mac/Linux)
└── scripts/             # Utility scripts
```

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test thoroughly using the test data provided
4. Submit a pull request

## 📞 Support

For issues or questions, please open an issue in the repository.

---

**Built for Bio-ISAC** - Securing the biological/biotech community through intelligent threat intelligence and verification.

