# Project Tutwiler - Bio-ISAC Security Portal

A comprehensive microservices-based security verification and threat intelligence platform designed for the biological/biotech security community. Features AI-powered verification, conversational chatbot interface, and multi-tier dashboards for verified and non-verified users.

## 🎯 Overview

Project Tutwiler provides a secure, AI-driven portal where users can submit security concerns and be automatically routed to appropriate threat intelligence resources based on verification status. The system uses advanced multi-factor analysis to determine user credibility and provides tailored security resources accordingly.

## ✨ Key Features

- **Conversational Security Portal**: Chatbot interface for intuitive user interaction
- **AI Verification**: Verifies users are human (not bots) and have legitimate threats (not spam)
- **Multi-Tier Dashboards**: 
  - **Verified Users**: Can post threats with AI analysis and recommendations
  - **Non-Verified Users**: Can post threats (low priority, no AI analysis)
- **AI Threat Analysis**: Verified users get AI-powered recommendations on how to handle threats
- **CVE Threat Intelligence**: Integration with NVD, CISA KEV, and OSV for real-time vulnerability data
- **Admin Dashboard**: Bio-ISAC administrators can manage all users and threats in one place (API key protected)
- **API Key Authentication**: 
  - Verified API keys for trusted users
  - Admin API keys for Bio-ISAC management
- **Zero-Data Principle**: No PII storage - only verification status and metadata
- **Multi-Database Isolation**: Separate databases for verified/non-verified users for security
- **One-Command Setup**: Single GUI wizard handles everything - Docker, configuration, and service startup

## 📋 Prerequisites

**IMPORTANT: Docker Desktop must be installed before running the setup wizard.**

### Required Software

1. **Docker Desktop** (Required)
   - **Windows**: Download from [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
   - **Mac**: Download from [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
   - **Linux**: Install Docker Engine and Docker Compose
     ```bash
     # Ubuntu/Debian
     sudo apt-get update
     sudo apt-get install docker.io docker-compose
     sudo systemctl start docker
     sudo systemctl enable docker
     ```

2. **Git** (Optional, for cloning the repository)
   - Usually pre-installed on Mac/Linux
   - Windows: Download from [https://git-scm.com/downloads](https://git-scm.com/downloads)

### System Requirements

- **RAM**: Minimum 8GB (16GB recommended for Ollama models)
- **Disk Space**: At least 10GB free (for Docker images and Ollama models)
- **OS**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+, Debian 11+, etc.)

### What the Wizard Does NOT Install

The wizard **cannot** automatically install Docker Desktop. You must:
1. ✅ Install Docker Desktop manually first
2. ✅ Start Docker Desktop (the wizard can start it if it's installed but not running)
3. ✅ Then run the setup wizard

The wizard **will**:
- ✅ Detect if Docker is installed
- ✅ Start Docker Desktop if it's installed but not running
- ✅ Create/update `.env` file from `env.template`
- ✅ Check all prerequisites
- ✅ Start all services
- ✅ Pull Ollama models automatically

## 🚀 Quick Start

### Step 1: Install Docker Desktop

**Before running the wizard, ensure Docker Desktop is installed:**

- **Windows/Mac**: Download and install from [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- **Linux**: Install Docker Engine (see Prerequisites above)

### Step 2: Run the Setup Wizard

**Windows:**
```bash
start.bat
```
This opens a GUI wizard that:
- ✅ Checks if Docker Desktop is installed (will guide you if missing)
- ✅ Automatically starts Docker Desktop if needed
- ✅ Creates/updates `.env` file from `env.template` template
- ✅ Checks all prerequisites (Docker, Docker Compose)
- ✅ Starts all services (Frontend, API Gateway, Orchestrator, AI-RAG, CVE Ingestor, ETL services, Ollama)
- ✅ Automatically pulls Ollama models
- ✅ Shows real-time status of all services
- ✅ Provides links to open Frontend and Admin pages
- ✅ Professional Windows installer interface

**Mac/Linux:**
```bash
# Make scripts executable (first time only)
chmod +x *.sh

# Run setup (creates .env from env.template)
./setup.sh

# Start services
./start.sh

# Check status
./check-status.sh
```

**Note:** The GUI wizard (`startup-wizard.ps1`) is **Windows-only** (uses PowerShell Windows Forms). Mac/Linux users use the command-line scripts above. Both methods create the same `.env` file and start the same Docker services.

### What Happens If Docker Is Not Installed?

**Windows Wizard:**
- The wizard will detect that Docker Desktop is missing
- It will show a clear error message
- It will provide a button to open the Docker Desktop download page
- **You must install Docker Desktop manually, then run the wizard again**

**Mac/Linux Scripts:**
- Scripts will check for Docker and show an error if missing
- You must install Docker Engine/Docker Desktop manually
- Then run the scripts again

**Important:** The wizard/scripts **cannot** install Docker automatically. Docker Desktop must be installed as a separate step before running the setup.

## 🎮 Available Scripts

### Windows

| Script | Purpose |
|--------|---------|
| `start.bat` | **THE ONLY SCRIPT YOU NEED!** Launches GUI wizard that handles setup, configuration, and starting all services |
| `scripts\windows\check-status.bat` | Check service status (command line) |
| `scripts\generate-admin-key.ps1` | Generate admin API key (GUI) |

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

## 📖 User Flow & Architecture

### AI Verification Purpose
The AI verification system verifies:
1. **Human Verification**: Confirms the user is a real human (not a bot)
2. **Threat Legitimacy**: Confirms the user has a legitimate security threat (not spam or fake)

The AI uses the same analysis for all users - it doesn't change based on verification status.

### 1. Portal Access
- User visits `/portal`
- Conversational chatbot guides through verification process
- User can optionally provide API key for immediate verified access
- AI verifies: human vs bot, real threat vs spam

### 2. Verification Process
- User provides: Name, Role/Organization, Security Concern
- AI analyzes submission to verify:
  - Is this a real human? (bot detection)
  - Is this a legitimate threat? (spam detection)
  - Role credibility and threat severity

### 3. User Routing & Capabilities

- **Verified Users** → `/dashboard/verified`
  - ✅ Can submit threats with **AI analysis and recommendations**
  - ✅ Access to prioritized threat intelligence
  - ✅ Recent CVE data
  - ✅ AI-powered threat analysis (tells you what to do with threats)
  - ✅ High priority threat handling

- **Non-Verified Users** → `/dashboard/non-verified`
  - ✅ Can submit threats (marked as **low priority**)
  - ✅ General security resources
  - ✅ CISA, NVD links
  - ❌ No AI analysis provided
  - ⚠️ Threats are low priority

### 4. Admin Dashboard (Bio-ISAC Only)
- **Protected by API key** - only Bio-ISAC administrators can access
- View both verified and non-verified users
- Manage all threats in one place
- System-wide analytics and metrics
- Threat prioritization and management

## 🔐 Security Features

### API Key Authentication

**Verified User API Keys:**
- Allows users to skip verification and get verified access
- Grants access to AI threat analysis features
- Set in `.env`: `VERIFIED_API_KEYS=key1,key2,key3`

**Admin API Keys (Bio-ISAC Only):**
- Required to access `/admin/analytics` dashboard
- Allows managing all users and threats
- Set in `.env`: `ADMIN_API_KEYS=admin-key-here`

**Demo API Keys (For Testing):**
- `demo-verified-key-123` - Verified user access
- `demo-admin-key-123` - Admin dashboard access
- These are set in `env.template` for team testing
- **Important:** Change these in production!

**Usage:**
1. Visit portal at `http://localhost:3000/portal`
2. Use demo login codes:
   - Type `DEMO_LOGIN_VERIFIED` → Verified dashboard
   - Type `DEMO_LOGIN_NON_VERIFIED` → Non-verified dashboard
   - Type `DEMO_LOGIN_ADMIN` → Admin dashboard
3. Or use API keys:
   - When asked about API key, type "yes"
   - Enter your API key
   - Immediate access granted

**Admin Access:**
1. Visit `/admin/analytics` or use `DEMO_LOGIN_ADMIN` in portal
2. Enter admin API key (or use demo key)
3. Access unified management dashboard

### Zero-Data Principle
- No PII stored in databases
- Only verification status, timestamps, and reason codes
- Complete audit trail without sensitive data

### Multi-Database Isolation
- Separate databases for verified/non-verified users
- Prevents lateral movement if one database is compromised
- Isolated ETL pipelines

## 🖥️ Platform Compatibility

### Windows
- ✅ **Full GUI wizard support** (`startup-wizard.ps1`)
- ✅ Automatic Docker Desktop startup detection and launch
- ✅ One-click setup with `start.bat`
- ✅ Professional installer-style interface
- ✅ Real-time service status monitoring
- ✅ Works on any Windows 10/11 machine with PowerShell (included)
- ⚠️ **Requires Docker Desktop to be installed first** (wizard will guide you if missing)

### Mac/Linux
- ✅ **Command-line scripts** (`setup.sh`, `start.sh`)
- ✅ Same functionality as Windows wizard (CLI instead of GUI)
- ✅ Manual Docker startup required (Docker Desktop must be running)
- ⚠️ GUI wizard is Windows-only (uses PowerShell Windows Forms)
- ⚠️ **Requires Docker Engine/Docker Desktop to be installed first**

**Important:** All platforms use the **same Docker containers**, so the application behavior is identical. Only the setup/startup process differs:
- **Windows:** GUI wizard handles everything automatically (after Docker is installed)
- **Mac/Linux:** Scripts do the same thing via command line (after Docker is installed)

**Setup Requirements:**
- Docker Desktop installed (Windows/Mac) or Docker Engine (Linux)
- PowerShell 5.1+ (Windows only, included with Windows 10/11)
- No other dependencies needed - everything else runs in Docker containers

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

## 🔧 Error Handling

The application includes comprehensive error handling:
- **Frontend**: All API calls have try-catch blocks with user-friendly error messages
- **Backend**: All endpoints have exception handling with proper HTTP status codes
- **Network Errors**: Automatic retry logic and timeout handling
- **AI Service**: Graceful degradation when AI services are unavailable

## 🌍 Cross-Device Compatibility

The project is designed to work on any device:
- ✅ Uses relative paths (no hardcoded Windows/Mac paths)
- ✅ Docker Compose ensures consistent environments
- ✅ All scripts work on Windows, Mac, and Linux
- ✅ Environment variables for all configuration
- ✅ No platform-specific dependencies

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test thoroughly using the test data provided
4. Submit a pull request

## 📞 Support

For issues or questions, please open an issue in the repository.

---

**Built for Bio-ISAC** - Securing the biological/biotech community through intelligent threat intelligence and verification.

