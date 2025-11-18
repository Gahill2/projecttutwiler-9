#!/bin/bash
# Convenience script - calls the organized version
if [ -f scripts/unix/check-prerequisites.sh ]; then
    chmod +x scripts/unix/check-prerequisites.sh
    ./scripts/unix/check-prerequisites.sh
else
    echo "Prerequisites checker not found. Please run from project root."
    exit 1
fi
