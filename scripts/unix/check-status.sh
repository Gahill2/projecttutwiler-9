#!/bin/bash
# Project Tutwiler - Service Status Checker
# Cross-platform version for Mac/Linux

set -e

echo "========================================"
echo "Project Tutwiler - Service Status Check"
echo "========================================"
echo ""

# Check if Docker is running
if ! docker ps &> /dev/null; then
    echo "[ERROR] Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if docker-compose is available
if ! docker compose version &> /dev/null; then
    echo "[ERROR] Docker Compose is not available. Please ensure Docker Desktop is up to date."
    exit 1
fi

# Get service status
echo "Checking service status..."
echo ""

RUNNING_COUNT=0
TOTAL_COUNT=0
STATUS_MSG="Service Status:\n\n"

# Check each service (relative to project root)
cd ../..
for service in frontend api-gateway orchestrator ai-rag cve-ingestor etl-nv etl-v ollama; do
    TOTAL_COUNT=$((TOTAL_COUNT + 1))
    if docker compose ps $service --format "{{.Status}}" 2>/dev/null | grep -q "Up"; then
        RUNNING_COUNT=$((RUNNING_COUNT + 1))
        STATUS_MSG="${STATUS_MSG}✓ $service: Running\n"
    else
        STATUS_MSG="${STATUS_MSG}✗ $service: Not Running\n"
    fi
done

# Show status
echo -e "$STATUS_MSG"
echo ""

if [ $RUNNING_COUNT -eq 0 ]; then
    echo "[WARNING] No services are currently running."
    echo "Run ./start.sh to start all services."
elif [ $RUNNING_COUNT -eq $TOTAL_COUNT ]; then
    echo "[SUCCESS] All services are running! ($RUNNING_COUNT/$TOTAL_COUNT)"
    echo ""
    echo "Access the app at:"
    echo "  • Frontend: http://localhost:3000"
    echo "  • Portal: http://localhost:3000/portal"
    echo "  • Admin: http://localhost:3000/admin/analytics"
else
    echo "[WARNING] Some services are not running ($RUNNING_COUNT/$TOTAL_COUNT)"
    echo "Run ./start.sh to start all services."
fi

echo ""
echo "Detailed status:"
docker compose ps

