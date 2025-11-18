#!/bin/bash
# Project Tutwiler - Automated Startup Script
# This script checks for Docker and starts all services automatically

set -e

echo "========================================"
echo "Project Tutwiler - Starting Services"
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed or not in PATH"
    echo ""
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    echo ""
    exit 1
fi

# Check if Docker is running
if ! docker ps &> /dev/null; then
    echo "[INFO] Docker Desktop is not running."
    echo ""
    echo "Please start Docker Desktop manually, then run this script again."
    echo ""
    
    # Try to start Docker Desktop on Mac
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Attempting to start Docker Desktop..."
        open -a Docker
        echo "Waiting for Docker to start (this may take 30-60 seconds)..."
        
        # Wait for Docker to be ready (max 60 seconds)
        for i in {1..12}; do
            sleep 5
            if docker ps &> /dev/null; then
                echo "[OK] Docker is now running!"
                echo ""
                break
            fi
            echo "Waiting for Docker... ($i/12)"
        done
        
        if ! docker ps &> /dev/null; then
            echo "[ERROR] Docker did not start in time. Please start Docker Desktop manually and try again."
            exit 1
        fi
    else
        exit 1
    fi
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "[WARNING] .env file not found!"
    echo ""
    if [ -f .env.sample ]; then
        echo "Creating .env from .env.sample..."
        cp .env.sample .env
        echo "[OK] Created .env file. Please edit it with your configuration."
        echo ""
    else
        echo "[ERROR] .env.sample not found. Please create .env file manually."
        exit 1
    fi
fi

# Check if docker-compose is available
if ! docker compose version &> /dev/null; then
    echo "[ERROR] docker compose is not available"
    echo "Please ensure Docker Desktop is up to date."
    exit 1
fi

# Run prerequisites check first
if [ -f scripts/unix/check-prerequisites.sh ]; then
    chmod +x scripts/unix/check-prerequisites.sh
    ./scripts/unix/check-prerequisites.sh
    if [ $? -ne 0 ]; then
        exit 1
    fi
fi

echo "[INFO] Starting all services..."
echo ""
echo "This will:"
echo "  1. Build all Docker images (first time only)"
echo "  2. Start all services"
echo "  3. Pull Ollama models automatically (first time only)"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start services in background
echo "Starting Docker Compose..."
docker compose up --build -d

# Wait a bit for services to start
sleep 10

# Check if Ollama container is running and pull models
echo ""
echo "[INFO] Checking Ollama models..."
if [ -f scripts/pull-ollama-models.sh ]; then
    chmod +x scripts/pull-ollama-models.sh
    ./scripts/pull-ollama-models.sh
else
    echo "[INFO] Ollama models will be pulled automatically by the service"
fi

echo ""
echo "========================================"
echo "Services are starting!"
echo "========================================"
echo ""
echo "Access the app at:"
echo "  Frontend: http://localhost:3000"
echo "  Portal: http://localhost:3000/portal"
echo "  Admin: http://localhost:3000/admin/analytics"
echo ""
echo "View logs with: docker compose logs -f"
echo "Stop services with: docker compose down"
echo "Check status with: scripts/unix/check-status.sh"
echo ""
echo "Following logs (Ctrl+C to exit)..."
echo ""

# Follow logs
docker compose logs -f

