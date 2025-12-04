#!/bin/bash
# Project Tutwiler - Installation Wizard
# Cross-platform version for Mac/Linux

set -e

echo "========================================"
echo "Project Tutwiler - Installation Wizard"
echo "========================================"
echo ""

# Welcome message
echo "Welcome to Project Tutwiler Installation Wizard!"
echo ""
echo "This wizard will help you install and configure all required software."
echo ""
read -p "Press Enter to continue..."

# Check prerequisites
echo ""
echo "Checking prerequisites..."
if [ -f scripts/unix/check-prerequisites.sh ]; then
    chmod +x scripts/unix/check-prerequisites.sh
    ./scripts/unix/check-prerequisites.sh
else
    echo "[WARNING] Prerequisites checker not found"
fi

if [ $? -ne 0 ]; then
    echo "Installation incomplete. Please install missing prerequisites and run again."
    exit 1
fi

# Ask about .env configuration
if [ -f .env ]; then
    read -p ".env file found. Would you like to open it for editing? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ${EDITOR:-nano} .env
    fi
else
    echo ".env file not found. Please configure it before starting services."
    if [ -f .env.backup ]; then
        cp .env.backup .env
        echo "Created .env from .env.backup"
        read -p "Would you like to edit it now? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ${EDITOR:-nano} .env
        fi
    fi
fi

# Final message
echo ""
echo "Installation complete!"
echo ""
read -p "Would you like to start all services now? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting services..."
    chmod +x start.sh
    ./start.sh
else
    echo ""
    echo "To start services later, run: ./start.sh"
    echo "To check service status, run: scripts/unix/check-status.sh"
fi

