# Project File Structure

## Root Directory

```
projecttutwiler-9/
├── .gitignore                 # Git ignore rules
├── .env                       # Environment variables (NOT in git, created from env.template)
├── env.template              # Environment template (IN git, safe to commit)
├── docker-compose.yml        # Docker Compose configuration
├── README.md                 # Main project documentation
├── CLEANUP_SUMMARY.md        # Cleanup documentation
├── PRE_GIT_CHECKLIST.md      # Pre-commit checklist
│
├── start.bat                 # Windows entry point (launches wizard)
├── startup-wizard.ps1        # Windows setup wizard (GUI)
├── start.sh                  # Unix/Mac entry point
├── setup.sh                  # Unix/Mac setup script
│
├── frontend/                 # Next.js frontend application
├── orchestrator/             # .NET orchestrator service
├── api-gateway/              # Node.js API gateway
├── ai-rag/                   # Python AI-RAG service
├── cve-ingestor/             # Python CVE ingestion service
├── etl-nv/                   # ETL service for non-verified database
├── etl-v/                    # ETL service for verified database
│
├── docs/                     # Documentation files
├── scripts/                   # Utility scripts
└── common/                   # Shared error handling code
```

## Service Directories

### Frontend (`frontend/`)
- Next.js application
- Pages: portal, dashboard (verified/non-verified), admin analytics
- Components and utilities

### Orchestrator (`orchestrator/Orchestrator/`)
- .NET 8.0 service
- Main API endpoints
- Database context and models
- Services (Analytics, Verification)
- **Migrations/** - SQL migration files (run manually)

### API Gateway (`api-gateway/`)
- Node.js/TypeScript
- Routes requests to appropriate services

### AI Services
- `ai-rag/` - AI-powered RAG service
- `cve-ingestor/` - CVE data ingestion

### ETL Services
- `etl-nv/` - ETL for non-verified database
- `etl-v/` - ETL for verified database

## Documentation (`docs/`)

- `README.md` - Main documentation index
- `QUICK_START.md` - Quick start guide
- `TEAM_SETUP.md` - Team setup instructions
- `WIZARD_GUIDE.md` - Wizard usage guide
- `TEST_GUIDE.md` - Testing instructions
- `ARCHITECTURE_ANALYSIS.md` - Architecture documentation
- `FILE_STRUCTURE.md` - This file

## Scripts (`scripts/`)

- `windows/` - Windows-specific scripts
- `unix/` - Unix/Mac-specific scripts
- `curl-tests.sh` - API testing scripts
- `pull-ollama-models.*` - Model pulling scripts

## Important Files

### Configuration
- `env.template` - **Safe to commit** - Template with placeholder values
- `.env` - **Never commit** - Actual secrets (gitignored)

### Entry Points
- `start.bat` - Windows: Launches GUI wizard
- `start.sh` - Mac/Linux: Command-line setup and start

### Database Migrations
- Located in `orchestrator/Orchestrator/Migrations/`
- Run manually on databases as needed
- Not automatically executed

## Git Status

### Committed Files
- All source code
- Configuration templates (`env.template`)
- Documentation
- Scripts
- Docker files

### Ignored Files (via .gitignore)
- `.env` - Environment variables with secrets
- `node_modules/` - Dependencies
- `.next/` - Next.js build output
- `bin/`, `obj/` - .NET build outputs
- IDE files (`.vscode/`, `.idea/`)
- OS files (`.DS_Store`, `Thumbs.db`)

## Cross-Device Setup

The project is designed to work on any device:

1. **Clone repository**
2. **Windows**: Run `start.bat` (opens GUI wizard)
3. **Mac/Linux**: Run `./setup.sh` then `./start.sh`
4. Wizard/setup script:
   - Creates `.env` from `env.template`
   - Checks prerequisites
   - Starts all services
5. Access at http://localhost:3000

No device-specific paths or configurations needed!

