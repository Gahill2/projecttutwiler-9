# Architecture Analysis: Frontend-Backend Separation

## 1. Current Architecture Assessment

### ✅ **Frontend Only Talks to Backend: YES**

**Evidence:**
- All frontend API calls use `API_URL` (defaults to `http://localhost:7070`) which is the **API Gateway**
- Frontend files that make API calls:
  - `frontend/lib/api.ts` - Centralized API client
  - `frontend/app/portal/page.tsx` - Calls `/portal/submit` and `/portal/validate-api-key`
  - `frontend/app/dashboard/verified/page.tsx` - Calls `/cve-ingestor/cves/recent`
  - `frontend/app/page.tsx` - Calls `/health` and `/db/ping`
  - `frontend/app/auth/page.tsx` - Calls `/auth/start`

**All requests flow through:**
```
Frontend → API Gateway (port 7070) → Orchestrator/Other Services
```

### ✅ **No Direct Third-Party Service Calls: CONFIRMED**

**What the frontend calls:**
- `/portal/submit` → Proxied to Orchestrator
- `/portal/validate-api-key` → Proxied to Orchestrator  
- `/cve-ingestor/cves/recent` → Proxied to CVE Ingestor service
- `/health` → Proxied to Orchestrator
- `/db/ping` → Proxied to Orchestrator (which then queries MySQL)

**What stays hidden:**
- ✅ MySQL databases - Only accessible via Orchestrator backend
- ✅ Docker services - All internal, frontend never sees them
- ✅ Pinecone - Only AI-RAG service accesses it
- ✅ Ollama - Only AI-RAG and CVE-Ingestor access it
- ✅ External APIs (NVD, CISA, OSV) - Only CVE-Ingestor accesses them

## 2. How Services Stay Hidden

### MySQL Database
- **Location**: Behind Orchestrator service
- **Access**: Only via `.NET` backend using Entity Framework
- **Frontend**: Never sees connection strings or database structure
- **Future**: Power BI would connect to MySQL via backend API, not directly

### Docker Services
- **Internal Network**: All services communicate via Docker internal network
- **Port Exposure**: Only frontend (3000) and API Gateway (7070) are exposed
- **User Experience**: Users only interact with `localhost:3000`

### Power BI Integration (Future)
**Recommended Approach:**
1. Create backend endpoint: `GET /admin/analytics/data`
2. Power BI connects to this endpoint (not MySQL directly)
3. Backend aggregates/transforms data from MySQL
4. Frontend admin page can also use same endpoint
5. **Benefit**: Single source of truth, easy to swap Power BI for another tool

## 3. Current Issues & Recommendations

### Issue 1: Hardcoded Stats in Verified Dashboard
**Location**: `frontend/app/dashboard/verified/page.tsx` (lines 12-18)
```typescript
const [stats, setStats] = useState({
  totalThreats: 1247,      // ❌ Hardcoded
  criticalAlerts: 23,      // ❌ Hardcoded
  verifiedUsers: 156,      // ❌ Hardcoded
  activeIssues: 8,         // ❌ Hardcoded
  resolvedIssues: 142      // ❌ Hardcoded
})
```

**Fix**: Fetch from backend endpoint (see implementation below)

### Issue 2: No Admin Authentication
**Current**: API keys exist but only for "verified" users, not admins
**Recommendation**: Use same API key system but check for admin role

### Issue 3: No Admin Analytics Page
**Missing**: Admin-only dashboard for analytics
**Solution**: Create `/admin/analytics` page (see implementation below)

## 4. Proposed Changes

### Change 1: Backend Analytics Endpoint
**File**: `orchestrator/Orchestrator/Program.cs`
- Add `GET /admin/analytics` endpoint
- Query MySQL for real stats
- Return JSON with aggregated data
- **Extension Point**: Easy to add Power BI later (same endpoint)

### Change 2: Admin Analytics Service
**File**: `orchestrator/Orchestrator/Services/AnalyticsService.cs` (new)
- Aggregates data from `AppUsers` and `StatusAudits` tables
- Calculates metrics: total users, verified vs non-verified, recent activity
- **Extension Point**: Can add more complex queries later

### Change 3: Frontend Admin Page
**File**: `frontend/app/admin/analytics/page.tsx` (new)
- Admin-only route
- Fetches data from `/admin/analytics`
- Displays charts/stats
- **Extension Point**: Can embed Power BI iframe later (same data source)

### Change 4: Admin API Key Check
**File**: `orchestrator/Orchestrator/Program.cs`
- Add middleware to check for admin API key
- Use `ADMIN_API_KEYS` environment variable (separate from `VERIFIED_API_KEYS`)

## 5. Extension Points for Power BI

### Option A: Backend API (Recommended)
```
Power BI → GET /admin/analytics/data → Orchestrator → MySQL
```
- ✅ Same endpoint as frontend
- ✅ Backend controls data access
- ✅ Easy to add authentication
- ✅ Can transform/aggregate data

### Option B: Embedded iframe (Alternative)
```
Frontend Admin Page → Power BI Embedded → Power BI Service → Backend API
```
- ✅ Visual Power BI dashboards
- ✅ Still goes through backend API
- ⚠️ Requires Power BI Embedded setup

### Option C: Direct Database (NOT Recommended)
```
Power BI → MySQL (direct connection)
```
- ❌ Bypasses backend
- ❌ Exposes database structure
- ❌ Harder to secure
- ❌ Not seamless

## 6. File Structure After Changes

```
orchestrator/Orchestrator/
├── Program.cs                    # Add /admin/analytics endpoint
├── Services/
│   ├── VerificationService.cs    # Existing
│   └── AnalyticsService.cs       # NEW - aggregates stats
└── Models/                       # Existing

api-gateway/src/
└── index.ts                      # Add /admin/analytics proxy route

frontend/app/
├── admin/
│   └── analytics/
│       └── page.tsx              # NEW - admin analytics page
└── dashboard/
    └── verified/
        └── page.tsx              # UPDATE - fetch stats from backend
```

## 7. Security Considerations

### Admin Access Control
- Use `ADMIN_API_KEYS` environment variable
- Check API key in request header: `X-Admin-API-Key`
- Return 401 if invalid

### Data Privacy
- Analytics endpoint should NOT expose PII
- Only aggregate counts and metrics
- No user IDs or personal information

### Rate Limiting (Future)
- Add rate limiting to `/admin/analytics` endpoint
- Prevent abuse of analytics queries

