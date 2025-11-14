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

## 🚀 Quick Start

### Prerequisites

- Docker Desktop installed and running
- Git
- (Optional) Pinecone account for CVE data
- (Optional) JawsDB MySQL instance for main database

### Setup Steps

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd projecttutwiler-9
   ```

2. **Create environment file**:
   ```bash
   cp .env.sample .env
   ```

3. **Configure environment variables** in `.env`:
   ```bash
   # Required for basic functionality
   JAWSDB_URL=mysql://user:pass@host:port/database
   OLLAMA_URL=http://ollama:11434
   GEN_MODEL=llama3.1:8b
   EMBED_MODEL=nomic-embed-text
   
   # Optional - for CVE intelligence
   PINECONE_API_KEY=your_pinecone_key
   PINECONE_ENVIRONMENT=us-east1-gcp
   PINECONE_INDEX=cve-index
   
   # Optional - for API key authentication
   VERIFIED_API_KEYS=key1,key2,key3
   ```

4. **Set up main database** (run SQL migration):
   ```sql
   -- Run orchestrator/Orchestrator/DatabaseMigration.sql on your JawsDB instance
   -- Creates app_users and app_status_audit tables
   ```

5. **Start all services**:
   ```bash
   docker compose up --build
   ```

6. **Pull Ollama models** (first time only):
   ```bash
   docker exec -it projecttutwiler-9-ollama-1 ollama pull llama3.1:8b
   docker exec -it projecttutwiler-9-ollama-1 ollama pull nomic-embed-text
   ```

7. **Access the application**:
   - Frontend: http://localhost:3000
   - Portal: http://localhost:3000/portal
   - Verified Dashboard: http://localhost:3000/dashboard/verified
   - Non-Verified Dashboard: http://localhost:3000/dashboard/non-verified

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

## 🧪 Testing

### Test Data for Verified Users

**Test Case 1 - High Credibility CISO:**
- **Name**: Dr. Sarah Chen
- **Role**: Chief Information Security Officer at Genomic Research Labs
- **Problem**: We've detected unusual network traffic patterns from our lab equipment that's connected to our research data servers. The equipment is running outdated firmware and we're concerned about potential vulnerabilities that could expose sensitive genomic research data. We need guidance on how to assess and remediate these risks without disrupting ongoing critical research.

**Test Case 2 - Security Analyst:**
- **Name**: Michael Rodriguez
- **Role**: Security Analyst at BioPharm Industries
- **Problem**: Our incident response team has identified indicators of compromise on systems that handle clinical trial data. We suspect a potential data breach and need immediate threat intelligence on known attack vectors targeting biotech infrastructure. We've seen suspicious login attempts and unusual data access patterns over the past 48 hours.

**Test Case 3 - Lab Manager:**
- **Name**: Dr. Jennifer Park
- **Role**: Lab Manager at University Research Facility
- **Problem**: We've received phishing emails targeting our staff that appear to be related to grant funding, but the links look suspicious. Given that we handle sensitive biological research data, we're concerned this could be a targeted attack. We need guidance on how to verify the legitimacy of these communications and protect our research infrastructure.

### Test Data for Non-Verified Users

**Test Case 1 - Generic User:**
- **Name**: John Smith
- **Role**: Student
- **Problem**: I think my computer might have a virus. Can you help me?

**Test Case 2 - Vague Concern:**
- **Name**: Jane Doe
- **Role**: User
- **Problem**: Something is wrong with my system. It's not working properly.

**Test Case 3 - Non-Technical:**
- **Name**: Bob Johnson
- **Role**: Employee
- **Problem**: I got an email that says I won a prize. Is this real?

## 🔐 Security Features

### API Key Authentication
Privileged users (e.g., Bio-ISAC CEO) can use API keys to skip verification:
```bash
# Set in .env
VERIFIED_API_KEYS=your-secure-key-here
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

### Health Checks
- `GET /health` - All services expose health endpoint

### CVE Data
- `GET /cve-ingestor/cves/recent?limit=10` - Get recent CVEs

## 📁 Project Structure

```
projecttutwiler-9/
├── frontend/              # Next.js frontend
│   └── app/
│       ├── page.tsx      # Landing page
│       ├── portal/       # Security portal
│       └── dashboard/    # User dashboards
├── api-gateway/          # Express API gateway
├── orchestrator/         # .NET orchestrator
├── ai-rag/              # AI-RAG service
├── cve-ingestor/        # CVE data ingestion
├── etl-nv/              # Non-verified ETL
├── etl-v/               # Verified ETL
├── docker-compose.yml   # Service orchestration
└── scripts/             # Utility scripts
```

## 🔧 Configuration

### Required Environment Variables

- `JAWSDB_URL` - Main database connection string
- `OLLAMA_URL` - Ollama service URL (default: `http://ollama:11434`)
- `GEN_MODEL` - LLM model name (default: `llama3.1:8b`)
- `EMBED_MODEL` - Embedding model name (default: `nomic-embed-text`)

### Optional Environment Variables

- `PINECONE_API_KEY` - For CVE intelligence
- `PINECONE_ENVIRONMENT` - Pinecone environment
- `PINECONE_INDEX` - Pinecone index name
- `VERIFIED_API_KEYS` - Comma-separated API keys for privileged access
- `JAWSDB_NV_URL` - Non-verified database (optional)
- `JAWSDB_V_URL` - Verified database (optional)

### Database Setup

**Main Database (Required):**
Run `orchestrator/Orchestrator/DatabaseMigration.sql` on your JawsDB instance.

**Optional Databases:**
- NV Database: Run `orchestrator/Orchestrator/DatabaseMigrationNV.sql`
- V Database: Run `orchestrator/Orchestrator/DatabaseMigrationV.sql`

## 🚢 Deployment

### Development
```bash
docker compose up --build
```

### Production Considerations
- Set `APP_ENV=production`
- Configure proper CORS origins
- Enable security middleware
- Set up proper secrets management
- Configure rate limiting
- Set up monitoring/logging

## 🆘 Troubleshooting

### Services won't start
- Check Docker Desktop is running
- Verify environment variables are set
- Check port conflicts (3000, 7070, 8080, 9090, 9095, 9101, 9102, 11434)

### Database connection errors
- Verify JawsDB connection strings
- Check network connectivity
- Ensure migrations have been run

### AI analysis not working
- Verify Ollama models are pulled: `docker exec -it projecttutwiler-9-ollama-1 ollama list`
- Check Ollama service is accessible
- Review AI-RAG service logs: `docker compose logs ai-rag`

### Portal routing issues
- Check browser console for errors
- Verify API Gateway is running: `docker compose ps`
- Check orchestrator logs: `docker compose logs orchestrator`

### Check Service Status
```bash
docker compose ps
```

All services should show "Up" status.

## 🤝 Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Test thoroughly using the test data provided above
4. Submit a pull request

## 📞 Support

For issues or questions, please open an issue in the repository.

---

**Built for Bio-ISAC** - Securing the biological/biotech community through intelligent threat intelligence and verification.
