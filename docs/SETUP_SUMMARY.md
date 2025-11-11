# Setup Summary

## Multi-Database Architecture

You need **4 separate databases** for security isolation:

### 1. Main/Backend Database (Current)
- **Current**: `JAWSDB_URL` (already set)
- **Purpose**: Orchestration, routing, system state
- **Access**: Orchestrator service only

### 2. Non-Verified (NV) Database
- **New**: `JAWSDB_NV_URL` (create new JawsDB instance)
- **Purpose**: Store metrics/status for non-verified users
- **Access**: ETL-NV service only
- **Security**: Separate credentials, isolated from others

### 3. Verified (V) Database  
- **New**: `JAWSDB_V_URL` (create new JawsDB instance)
- **Purpose**: Store metrics/status for verified users
- **Access**: ETL-V service only
- **Security**: Separate credentials, isolated from others

### 4. AI Database (Pinecone)
- **Current**: `PINECONE_API_KEY`, `PINECONE_INDEX`
- **Purpose**: Vector embeddings for document analysis
- **Access**: AI-RAG service only
- **Security**: Separate API key, namespace isolation

## Environment Variables to Add

Add to `.env`:

```bash
# Existing
JAWSDB_URL=mysql://... (your current one)

# New - Create 2 more JawsDB instances on Heroku
JAWSDB_NV_URL=mysql://user:pass@host:3306/nv_db
JAWSDB_V_URL=mysql://user:pass@host:3306/v_db

# Id.me Integration
IDME_CLIENT_ID=your_client_id
IDME_CLIENT_SECRET=your_client_secret
IDME_REDIRECT_URI=http://localhost:3000/auth/idme/callback
IDME_SCOPE=openid profile email
IDME_BASE_URL=https://api.id.me
```

## Next Steps

1. **Create 2 more JawsDB instances** on Heroku for NV and V databases
2. **Set up Id.me developer account** (see `docs/IDME_SETUP.md`)
3. **Train AI on document types** (see `docs/AI_TRAINING.md`)
4. **Update ETL services** to connect to their respective databases

## Security Benefits

If NV database is compromised:
- ✅ Cannot access V database (different credentials)
- ✅ Cannot access Main database (different service)
- ✅ Cannot access AI database (different service/API key)

Each database is completely isolated with separate:
- Connection strings
- Credentials
- Service access
- Network isolation

