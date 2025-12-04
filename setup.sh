#!/bin/bash
# Project Tutwiler - Initial Setup Script
# This script helps with first-time setup

set -e

echo "========================================"
echo "Project Tutwiler - Initial Setup"
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed"
    echo ""
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    echo "Then run this script again."
    echo ""
    exit 1
fi

# Create .env from .env.backup if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.backup ]; then
        echo "[INFO] Creating .env file from .env.backup..."
        cp .env.backup .env
        echo "[OK] .env file created!"
        echo ""
        echo "[IMPORTANT] Please edit .env file with your configuration:"
        echo "  - Database connection strings (JAWSDB_URL)"
        echo "  - API keys (if needed)"
        echo "  - Other service configurations"
        echo ""
    else
        echo "[WARNING] .env.backup not found. Creating basic .env file..."
        cat > .env << 'EOF'
# Project Tutwiler Environment Variables
# Edit these values with your configuration

# Database
JAWSDB_URL=mysql://user:pass@host:port/database

# Ollama
OLLAMA_URL=http://ollama:11434
GEN_MODEL=llama3.1:8b
EMBED_MODEL=nomic-embed-text

# Optional: API Keys
VERIFIED_API_KEYS=
ADMIN_API_KEYS=
EOF
        echo "[OK] Basic .env file created!"
        echo ""
    fi
else
    echo "[INFO] .env file already exists. Skipping..."
    echo ""
fi

# Check if Docker is running
if ! docker ps &> /dev/null; then
    echo "[WARNING] Docker Desktop is not running."
    echo "Please start Docker Desktop and run ./start.sh to start services."
    echo ""
    exit 0
fi

echo "[INFO] Ollama models will be pulled automatically when you start the services."
echo ""

echo "========================================"
echo "Setup Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Edit .env file with your configuration"
echo "  2. Run ./start.sh to start all services"
echo "  3. Access the app at http://localhost:3000"
echo ""

