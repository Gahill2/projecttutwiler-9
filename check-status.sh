#!/bin/bash
# Convenience script - calls the organized version
if [ -f scripts/unix/check-status.sh ]; then
    chmod +x scripts/unix/check-status.sh
    ./scripts/unix/check-status.sh
else
    echo "Status checker not found. Please run from project root."
    exit 1
fi
