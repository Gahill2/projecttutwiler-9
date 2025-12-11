# Full Stack CVE Submission Flow

This document explains how CVE submissions flow from the frontend dashboards to the admin dashboard.

## Overview

The system now supports **full stack CVE submissions** where:
1. **Non-verified users** can submit CVEs from `/dashboard/non-verified`
2. **Verified users** can submit CVEs from `/dashboard/verified` or `/dashboard`
3. **All submissions** appear in the **Admin Dashboard** at `/admin/analytics`

## Flow Diagram

```
┌─────────────────────────┐
│ Non-Verified Dashboard  │
│  /dashboard/non-verified│
│                         │
│  Submit CVE Form        │
└───────────┬─────────────┘
            │
            │ POST /portal/submit
            │ { name, role, problem }
            ▼
┌─────────────────────────┐
│   Orchestrator API      │
│   /portal/submit        │
│                         │
│ 1. Process Portal       │
│    Submission           │
│ 2. Create User Record  │
│ 3. Create Audit Record │
│ 4. Create CVE Record   │ ← NEW!
└───────────┬─────────────┘
            │
            │ Store in MySQL
            ▼
┌─────────────────────────┐
│   MySQL Database         │
│   cve_submissions table  │
│                         │
│ - submission_id         │
│ - user_id               │
│ - description           │
│ - severity              │
│ - status                │
│ - is_verified_user      │
└───────────┬─────────────┘
            │
            │ GET /admin/cves?api_key=...
            ▼
┌─────────────────────────┐
│   Admin Dashboard       │
│   /admin/analytics      │
│                         │
│  - CVEs Tab             │
│  - AI Scanner Tab       │
│  - Filter by severity   │
│  - Filter by status     │
│  - Filter by user type  │
└─────────────────────────┘
```

## Endpoints

### 1. Portal Submission (Non-Verified Users)
**Endpoint:** `POST /portal/submit`

**Request:**
```json
{
  "name": "Non-Verified User",
  "role": "General User",
  "problem": "CVE description here..."
}
```

**Response:**
```json
{
  "userId": "guid-here",
  "status": "non_verified",
  "submissionId": "guid-here"  // NEW: CVE submission ID
}
```

**What it does:**
1. Creates user record in `app_users` table
2. Creates audit record in `status_audits` table
3. **Creates CVE submission in `cve_submissions` table** (NEW!)
4. Returns user ID and submission ID

### 2. CVE Submission (Verified Users)
**Endpoint:** `POST /cve/submit`

**Request:**
```json
{
  "userId": "guid-here",
  "description": "CVE description...",
  "cvssScore": 7.5,
  "similarCves": [...]
}
```

**Response:**
```json
{
  "submission_id": "guid-here",
  "severity": "High",
  "is_verified": true,
  "message": "CVE submission stored successfully"
}
```

**What it does:**
1. Creates or finds user record
2. Determines severity from CVSS score
3. Creates CVE submission in `cve_submissions` table

### 3. Admin CVE Listing
**Endpoint:** `GET /admin/cves?api_key=...`

**Query Parameters:**
- `severity`: Filter by severity (Critical, High, Moderate, Low)
- `status`: Filter by status (pending, reviewed, resolved)
- `user_type`: Filter by user type (verified, non_verified)
- `sort_by`: Sort field (created_at, severity, cvss_score, status)
- `sort_order`: Sort direction (asc, desc)
- `limit`: Number of results (default: 100)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "total": 15,
  "offset": 0,
  "limit": 100,
  "cves": [
    {
      "submission_id": "guid",
      "user_id": "guid",
      "description": "...",
      "severity": "Critical",
      "cvss_score": 9.8,
      "status": "pending",
      "is_verified_user": true,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

## Database Schema

### `cve_submissions` Table
```sql
CREATE TABLE cve_submissions (
    submission_id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(16) NOT NULL,
    cvss_score DECIMAL(4,2) NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'pending',
    is_verified_user BOOLEAN NOT NULL,
    similar_cves_json TEXT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES app_users(user_id)
);
```

## Mock Data for Demo

A SQL script is provided to add mock CVE data for demonstration:

**File:** `orchestrator/Orchestrator/DatabaseMigrationMockCveData.sql`

**To use:**
```bash
# Connect to MySQL
mysql -u root -p your_database

# Run the script
source orchestrator/Orchestrator/DatabaseMigrationMockCveData.sql
```

**What it adds:**
- 5 demo users (3 verified, 2 non-verified)
- 12 mock CVE submissions with:
  - Various severities (Critical, High, Moderate, Low)
  - Various statuses (pending, reviewed, resolved)
  - Mix of verified and non-verified users
  - Realistic CVE descriptions
  - Different timestamps (recent to older)

## Testing the Full Stack Flow

### Test 1: Non-Verified User Submission
1. Go to `http://localhost:3000/dashboard/non-verified`
2. Click "Submit CVE" tab
3. Enter a CVE description
4. Submit the form
5. Go to `http://localhost:3000/admin/analytics`
6. Click "CVEs" tab
7. **Verify:** Your submission appears in the list

### Test 2: Verified User Submission
1. Go to `http://localhost:3000/dashboard/verified`
2. Enter a CVE description
3. Submit the form
4. Go to `http://localhost:3000/admin/analytics`
5. Click "CVEs" tab
6. **Verify:** Your submission appears in the list

### Test 3: Filtering
1. In Admin Dashboard → CVEs tab
2. Filter by:
   - **Severity:** Critical
   - **Status:** Pending
   - **User Type:** Non-Verified
3. **Verify:** Only matching CVEs are shown

### Test 4: AI Scanner
1. In Admin Dashboard → AI Scanner tab
2. Click "Scan All CVEs"
3. **Verify:** CVEs are analyzed and flagged threats appear

## Changes Made

### Backend Changes
1. **Modified `/portal/submit` endpoint** (`orchestrator/Orchestrator/Program.cs`)
   - Now creates CVE submission records in addition to user/audit records
   - Returns `submissionId` in response

2. **Updated `PortalSubmissionResult` class** (`orchestrator/Orchestrator/Services/VerificationService.cs`)
   - Added `SubmissionId` property

### Frontend Changes
- No changes needed! The non-verified dashboard already calls `/portal/submit`
- Admin dashboard already fetches from `/admin/cves`

### Database Changes
- Created mock data script: `DatabaseMigrationMockCveData.sql`
- No schema changes (uses existing `cve_submissions` table)

## Troubleshooting

### CVEs not appearing in admin dashboard
1. Check that `/portal/submit` is creating CVE records:
   ```sql
   SELECT * FROM cve_submissions ORDER BY created_at DESC LIMIT 10;
   ```

2. Check admin API key is valid:
   ```bash
   curl http://localhost:7070/admin/cves?api_key=your-key
   ```

3. Check browser console for errors

### Mock data not loading
1. Ensure database migrations have run
2. Check user IDs exist:
   ```sql
   SELECT * FROM app_users WHERE user_id LIKE '11111111%';
   ```
3. Check for duplicate key errors (adjust submission IDs if needed)

## Future Enhancements

- [ ] Real-time updates (WebSocket) when new CVEs are submitted
- [ ] Email notifications to admins for new critical CVEs
- [ ] CVE status update workflow
- [ ] Bulk operations (approve/reject multiple CVEs)
- [ ] Export CVEs to CSV/PDF
- [ ] CVE assignment to security analysts

