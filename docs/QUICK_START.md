# Quick Start Guide

## For New Developers

### Step 1: Install Docker Desktop
- Download from: https://www.docker.com/products/docker-desktop
- Install and start Docker Desktop
- Wait until Docker Desktop shows "Running" status

### Step 2: Clone the Repository
```bash
git clone <repository-url>
cd projecttutwiler-9
```

### Step 3: Run Setup (First Time Only)
**Windows:**
```bash
setup.bat
```

**Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

This will:
- Check if Docker is installed
- Create `.env` file from template
- Guide you through configuration

### Step 4: Edit Configuration
Open `.env` file and add your configuration:
- Database connection strings (if using external database)
- API keys (optional)
- Other service settings

### Step 5: Start Everything
**Windows:**
```bash
start.bat
```

**Mac/Linux:**
```bash
./start.sh
```

The script will:
- ✅ Check if Docker is running (start it if needed)
- ✅ Build all Docker images
- ✅ Start all services
- ✅ Pull Ollama models automatically
- ✅ Show you the logs

### Step 6: Access the App
Once you see "Ready" messages in the logs:
- **Frontend**: http://localhost:3000
- **Portal**: http://localhost:3000/portal
- **Admin Analytics**: http://localhost:3000/admin/analytics

---

## Troubleshooting

### Docker Not Starting
- Make sure Docker Desktop is installed
- Try starting Docker Desktop manually first
- On Windows: Check if WSL 2 is enabled

### Port Already in Use
- Stop other services using ports 3000, 7070, 8080, 9090, 9095, 9101, 9102, 11434
- Or change ports in `docker-compose.yml`

### Services Won't Start
- Check Docker Desktop is running: `docker ps`
- Check logs: `docker compose logs`
- Verify `.env` file exists and has correct values

### First Time Slow
- First run downloads Docker images (can take 5-10 minutes)
- Ollama models download automatically (can take 10-20 minutes)
- Subsequent starts are much faster

---

## What Gets Started?

The `start.bat` / `start.sh` script automatically starts:

1. **Frontend** (Next.js) - Port 3000
2. **API Gateway** (Express) - Port 7070
3. **Orchestrator** (.NET) - Port 8080
4. **AI-RAG** (FastAPI) - Port 9090
5. **CVE Ingestor** (Python) - Port 9095
6. **ETL Services** (Python) - Ports 9101, 9102
7. **Ollama** (LLM) - Port 11434

All services run in Docker containers - no need to install Node.js, .NET, Python, or any other dependencies manually!

---

## Stopping Services

Press `Ctrl+C` in the terminal where services are running, or:

```bash
docker compose down
```

To stop and remove all containers:

```bash
docker compose down -v
```

---

## Need Help?

- Check `README.md` for detailed documentation
- Check `ARCHITECTURE_ANALYSIS.md` for architecture details
- Check service logs: `docker compose logs [service-name]`

