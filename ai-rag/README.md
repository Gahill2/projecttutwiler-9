# AI-RAG Service

FastAPI service for document ingestion and analysis using Ollama embeddings and Pinecone retrieval.

## Endpoints

- `GET /health` - Health check
- `POST /ingest` - Ingest documents with chunking and embedding
- `POST /analyze` - Analyze text and return verification decision

## Security

Security middleware is scaffolded but disabled by default. See `main.py` for TODO comments to enable.

