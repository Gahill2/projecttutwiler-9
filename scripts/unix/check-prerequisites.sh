#!/bin/bash
# Project Tutwiler - Prerequisites Checker
# Cross-platform version for Mac/Linux

set -e

echo "========================================"
echo "Project Tutwiler - Prerequisites Check"
echo "========================================"
echo ""

MISSING_PREREQS=0
PREREQ_LIST=""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    MISSING_PREREQS=$((MISSING_PREREQS + 1))
    PREREQ_LIST="${PREREQ_LIST}Docker Desktop\n"
fi

# Check if Docker is running
if [ $MISSING_PREREQS -eq 0 ]; then
    if ! docker ps &> /dev/null; then
        DOCKER_NOT_RUNNING=1
    fi
fi

# Show results
if [ $MISSING_PREREQS -gt 0 ]; then
    echo "[WARNING] Missing prerequisites detected!"
    echo ""
    echo "Missing:"
    echo -e "$PREREQ_LIST"
    echo ""
    
    # Ask user to install
    read -p "Would you like to open the Docker Desktop download page? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Opening Docker Desktop download page..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open https://www.docker.com/products/docker-desktop
        else
            xdg-open https://www.docker.com/products/docker-desktop 2>/dev/null || echo "Please visit: https://www.docker.com/products/docker-desktop"
        fi
    fi
    
    echo "Please install the missing prerequisites and run this script again."
    exit 1
fi

if [ ! -z "$DOCKER_NOT_RUNNING" ]; then
    echo "[INFO] Docker Desktop is not running."
    echo ""
    
    read -p "Would you like to start Docker Desktop now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Attempting to start Docker Desktop..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            open -a Docker
            echo "Waiting for Docker to start (this may take 30-60 seconds)..."
            
            # Wait for Docker
            count=0
            while [ $count -lt 12 ]; do
                sleep 5
                if docker ps &> /dev/null; then
                    echo "[OK] Docker is now running!"
                    break
                fi
                count=$((count + 1))
                echo "Waiting for Docker... [$count/12]"
            done
            
            if ! docker ps &> /dev/null; then
                echo "[ERROR] Docker did not start in time. Please start Docker Desktop manually and try again."
                exit 1
            fi
        else
            echo "Please start Docker Desktop manually and run this script again."
            exit 1
        fi
    else
        echo "Please start Docker Desktop manually and run this script again."
        exit 1
    fi
fi

# Check if .env file exists (relative to project root)
cd ../..
if [ ! -f .env ]; then
    if [ -f .env.sample ]; then
        read -p ".env file not found. Create it from .env.sample? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp .env.sample .env
            echo "[OK] Created .env file. Please edit it with your configuration."
        fi
    fi
fi

# All checks passed
echo ""
echo "[SUCCESS] All prerequisites are met!"
echo ""
echo "You can now run ./start.sh to start all services."

exit 0

