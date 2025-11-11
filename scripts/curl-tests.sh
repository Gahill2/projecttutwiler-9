#!/bin/bash

echo "Testing Project Tutwiler services..."
echo ""

echo "1. Frontend (via API Gateway health):"
curl -s http://localhost:7070/health | jq .
echo ""

echo "2. API Gateway health:"
curl -s http://localhost:7070/health | jq .
echo ""

echo "3. Orchestrator health:"
curl -s http://localhost:8080/health | jq .
echo ""

echo "4. Database ping (via API Gateway):"
curl -s http://localhost:7070/db/ping | jq .
echo ""

echo "5. AI-RAG health:"
curl -s http://localhost:9090/health | jq .
echo ""

echo "6. ETL-NV health:"
curl -s http://localhost:9101/health | jq .
echo ""

echo "7. ETL-V health:"
curl -s http://localhost:9102/health | jq .
echo ""

echo "8. AI-RAG ingest (test):"
curl -s -X POST http://localhost:9090/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "docs": [
      {
        "id": "test-1",
        "text": "This is a test document for ingestion."
      }
    ]
  }' | jq .
echo ""

echo "9. AI-RAG analyze (test):"
curl -s -X POST http://localhost:9090/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Test query for analysis",
    "top_k": 3
  }' | jq .
echo ""

echo "Tests complete!"

