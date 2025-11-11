# Database Setup Guide

## Three Database Architecture

You have 3 separate JawsDB instances for security isolation:

1. **Main/Backend Database** (`projecttutwiler-9`)
   - Stores: `app_users`, `app_status_audit` tables
   - Used by: Orchestrator service
   - Connection string: `JAWSDB_URL`

2. **Non-Verified Database** (`projecttutwiler-9-nv`)
   - Stores: Metrics/status for non-verified users (future)
   - Used by: ETL-NV service (stubbed for now)
   - Connection string: `JAWSDB_NV_URL`

3. **Verified Database** (`projecttutwiler-9-v`)
   - Stores: Metrics/status for verified users (future)
   - Used by: ETL-V service (stubbed for now)
   - Connection string: `JAWSDB_V_URL`

## Getting Connection Strings from Heroku

For each database, get the connection string:

```bash
# Main database
heroku config:get JAWSDB_URL -a your-app-name

# NV database  
heroku config:get JAWSDB_URL -a projecttutwiler-9-nv

# V database
heroku config:get JAWSDB_URL -a projecttutwiler-9-v
```

Or from Heroku dashboard:
1. Go to each app's Settings
2. Click "Reveal Config Vars"
3. Copy the `JAWSDB_URL` value

## Update .env File

Add all three connection strings to your `.env`:

```bash
# Main/Backend Database (already set)
JAWSDB_URL=mysql://kt1mt8pirpoxzkfl:password@r4919aobtbi97j46.cbetxkdyhwsb.us-east-1.rds.amazonaws.com:3306/pa8ah0pwtssyutkg

# Non-Verified Database (NEW)
JAWSDB_NV_URL=mysql://gh1blsnircwjlq9y:password@kil9uzd3tgem3naa.cbetxkdyhwsb.us-east-1.rds.amazonaws.com:3306/database_name

# Verified Database (NEW)
JAWSDB_V_URL=mysql://iasgy84gg7w7:password@j1r4n2ztuwm0bhh5.cbetxkdyhwsb.us-east-1.rds.amazonaws.com:3306/database_name
```

**Note:** Replace `password` and `database_name` with actual values from Heroku.

## Run Database Migration

**Only run migration on the MAIN database** (where `app_users` and `app_status_audit` tables go):

1. Connect to your main JawsDB instance
2. Run the SQL from `orchestrator/Orchestrator/DatabaseMigration.sql`

Or use a MySQL client:
```bash
mysql -h r4919aobtbi97j46.cbetxkdyhwsb.us-east-1.rds.amazonaws.com -u kt1mt8pirpoxzkfl -p pa8ah0pwtssyutkg < orchestrator/Orchestrator/DatabaseMigration.sql
```

## Verify Setup

After updating `.env` and running migration:

1. Restart orchestrator: `docker compose restart orchestrator`
2. Test database connection: Visit http://localhost:3000 and click "Check Database"
3. Test verification flow: Visit http://localhost:3000/(auth) and click "Start Verification"

## Security Note

Each database has separate credentials. If one is compromised, the others remain isolated.

