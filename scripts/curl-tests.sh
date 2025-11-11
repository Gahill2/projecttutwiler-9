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

echo "8. CVE Ingestor health:"
curl -s http://localhost:9095/health | jq .
echo ""

echo "9. CVE Ingestor stats (before refresh):"
curl -s http://localhost:9095/stats | jq .
echo ""

echo "10. AI-RAG ingest (test):"
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

echo "11. AI-RAG analyze (test):"
curl -s -X POST http://localhost:9090/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Test query for analysis",
    "top_k": 3
  }' | jq .
echo ""

echo "12. CVE Ingestor refresh (this may take a while):"
echo "    Note: This fetches CVE data from NVD and CISA. It may take several minutes."
curl -s -X POST http://localhost:9095/refresh | jq .
echo ""

echo "13. CVE Ingestor stats (after refresh):"
curl -s http://localhost:9095/stats | jq .
echo ""

echo "14. AI-RAG analyze CVE data (searches nvd and cisa_kev namespaces):"
curl -s -X POST http://localhost:9090/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Log4j vulnerability",
    "top_k": 5
  }' | jq .
echo ""

echo "Tests complete!"

