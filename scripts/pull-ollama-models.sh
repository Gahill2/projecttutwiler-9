#!/bin/bash
# Automatically pull Ollama models when container is ready

CONTAINER_NAME="projecttutwiler-9-ollama-1"
MAX_WAIT=60
WAIT_COUNT=0

echo "Waiting for Ollama container to be ready..."

# Wait for container to be running
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo "Ollama container is running!"
        break
    fi
    sleep 2
    WAIT_COUNT=$((WAIT_COUNT + 2))
    echo "Waiting... ($WAIT_COUNT/$MAX_WAIT seconds)"
done

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
    echo "ERROR: Ollama container did not start in time"
    exit 1
fi

# Wait a bit more for Ollama service to be ready
sleep 5

echo "Pulling Ollama models..."
echo "This may take 10-20 minutes on first run..."

# Pull models
docker exec $CONTAINER_NAME ollama pull llama3.1:8b || echo "Warning: Failed to pull llama3.1:8b"
docker exec $CONTAINER_NAME ollama pull nomic-embed-text || echo "Warning: Failed to pull nomic-embed-text"

echo "Done! Models are ready."

