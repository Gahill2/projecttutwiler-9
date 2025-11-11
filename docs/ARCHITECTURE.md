# Project Tutwiler Architecture

## Multi-Database Security Isolation

The system uses **4 isolated databases** to prevent lateral movement if one is compromised:

### 1. **AI Database (Pinecone)**
- **Purpose**: Vector embeddings for document analysis and RAG
- **Contains**: Document chunks, embeddings, metadata (no PII)
- **Access**: Only AI-RAG service
- **Isolation**: Separate API key, different namespace per document type

### 2. **Non-Verified (NV) Database**
- **Purpose**: Store status/metrics for unverified users
- **Contains**: Session IDs, verification attempts, reason codes, timestamps
- **Access**: ETL-NV service only
- **Isolation**: Separate JawsDB instance, different credentials

### 3. **Verified (V) Database**
- **Purpose**: Store status/metrics for verified users
- **Contains**: Verification status, reason codes, access logs (no PII)
- **Access**: ETL-V service only
- **Isolation**: Separate JawsDB instance, different credentials

### 4. **Backend/Main Database**
- **Purpose**: Application state, routing, orchestration
- **Contains**: Session routing, service health, system config
- **Access**: Orchestrator only
- **Isolation**: Current JawsDB instance

## Security Model

```
┌─────────────┐
│   Frontend  │
└──────┬──────┘
       │
┌──────▼──────────┐
│  API Gateway    │ (Routes based on verification status)
└──────┬──────────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌─▼────┐
│  V  │ │  NV  │ (Separate databases, no cross-access)
└─────┘ └──────┘

┌─────────────┐
│ AI-RAG      │ → Pinecone (AI Database)
└─────────────┘

┌─────────────┐
│Orchestrator │ → Backend DB (Main)
└─────────────┘
```

**If NV database is compromised:**
- Attacker cannot access V database (different credentials)
- Attacker cannot access AI database (different service)
- Attacker cannot access Backend DB (different service)

## Document Type Training

The AI learns different document types through **Pinecone namespaces**:

- `namespace: "apple-farmer"` - Agricultural documents
- `namespace: "professional"` - Corporate/company documents
- `namespace: "healthcare"` - Medical professional documents
- `namespace: "education"` - Teacher/educator documents
- etc.

Each namespace contains:
- Sample document chunks
- Verification patterns
- Common fraud indicators
- Document structure examples

## Id.me Integration Flow

1. User submits documents via chatbot
2. Frontend calls Id.me API for initial verification
3. Id.me returns verification result + document metadata
4. AI-RAG analyzes documents against trained namespaces
5. Decision: `verified` or `non_verified` with reason codes
6. Route to appropriate database and dashboard

