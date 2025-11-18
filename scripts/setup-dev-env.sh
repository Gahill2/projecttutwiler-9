#!/bin/bash
# Guard - Development Environment Setup Script
# This script helps developers set up their .env file for development

set -e

echo "========================================"
echo "Guard - Development Environment Setup"
echo "========================================"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
DEV_ENV_FILE="$PROJECT_ROOT/.env.development"
ENV_FILE="$PROJECT_ROOT/.env"

# Check if .env.development exists
if [ ! -f "$DEV_ENV_FILE" ]; then
    echo "[ERROR] .env.development file not found!"
    echo "Expected location: $DEV_ENV_FILE"
    echo ""
    exit 1
fi

# Check if .env already exists
if [ -f "$ENV_FILE" ]; then
    echo "[WARNING] .env file already exists!"
    echo ""
    read -p "Do you want to overwrite it? (y/N) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "[INFO] Setup cancelled. Your existing .env file is unchanged."
        echo ""
        exit 0
    fi
fi

# Copy .env.development to .env
echo "[INFO] Copying .env.development to .env..."
cp "$DEV_ENV_FILE" "$ENV_FILE"
echo "[OK] .env file created!"
echo ""

echo "========================================"
echo "Next Steps:"
echo "========================================"
echo "1. Edit .env file and update:"
echo "   - Database connection strings (JAWSDB_URL, etc.)"
echo "   - Pinecone API key (if needed)"
echo "   - Other service configurations"
echo ""
echo "2. Run the startup script:"
echo "   ./start.sh"
echo ""
echo "Note: The wizard will detect your existing .env file"
echo "      and skip the configuration step."
echo ""

