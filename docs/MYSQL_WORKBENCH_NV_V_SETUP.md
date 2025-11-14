# Setting Up NV and V Databases in MySQL Workbench

## Prerequisites

1. You have created 2 new JawsDB instances (one for NV, one for V)
2. You have the connection strings in your `.env` file:
   - `JAWSDB_NV_URL=mysql://user:pass@host:3306/database`
   - `JAWSDB_V_URL=mysql://user:pass@host:3306/database`

## Option 1: Using the Python Setup Script (Recommended)

1. Install mysql-connector-python if needed:
   ```bash
   pip install mysql-connector-python
   ```

2. Run the setup script:
   ```bash
   python scripts/setup_nv_v_databases.py
   ```

The script will:
- Read connection strings from your `.env` file
- Connect to both databases
- Create all required tables
- Verify the setup

## Option 2: Manual Setup in MySQL Workbench

### Setting Up NV Database

1. **Create Connection**
   - Open MySQL Workbench
   - Click "+" to create new connection
   - Name: `Project Tutwiler NV DB`
   - Extract connection details from `JAWSDB_NV_URL`:
     - Format: `mysql://user:password@host:port/database`
     - Example: `mysql://abc123:pass@xyz.rds.amazonaws.com:3306/nv_db`
   - Enter Hostname, Port, Username, Password, Default Schema
   - Test connection and save

2. **Run Migration**
   - Connect to the NV database
   - File → Open SQL Script → `orchestrator/Orchestrator/DatabaseMigrationNV.sql`
   - Execute (⚡ button)
   - Verify tables: `nv_sessions`, `nv_metrics`

### Setting Up V Database

1. **Create Connection**
   - Create another connection in MySQL Workbench
   - Name: `Project Tutwiler V DB`
   - Extract connection details from `JAWSDB_V_URL`
   - Enter Hostname, Port, Username, Password, Default Schema
   - Test connection and save

2. **Run Migration**
   - Connect to the V database
   - File → Open SQL Script → `orchestrator/Orchestrator/DatabaseMigrationV.sql`
   - Execute (⚡ button)
   - Verify tables: `v_sessions`, `v_access_logs`, `v_metrics`

## Verifying Setup

### NV Database Tables

- **nv_sessions**: Stores non-verified user sessions
  - Columns: session_id, user_id, status, score_bin, reason_codes_json, created_at, updated_at
  
- **nv_metrics**: Stores metrics for non-verified sessions
  - Columns: metric_id, session_id, metric_type, metric_value, metric_data_json, created_at

### V Database Tables

- **v_sessions**: Stores verified user sessions
  - Columns: session_id, user_id, status, score_bin, reason_codes_json, verification_timestamp, created_at, updated_at
  
- **v_access_logs**: Stores access logs for verified users
  - Columns: log_id, session_id, access_type, resource_accessed, access_timestamp
  
- **v_metrics**: Stores metrics for verified sessions
  - Columns: metric_id, session_id, metric_type, metric_value, metric_data_json, created_at

## Testing the Connection

After setup, test that the ETL services can connect:

1. Start your services:
   ```bash
   docker compose up
   ```

2. Test ETL-NV health:
   ```bash
   curl http://localhost:9101/health
   ```

3. Test ETL-V health:
   ```bash
   curl http://localhost:9102/health
   ```

4. Test creating a session (via portal submission):
   - Go to http://localhost:3000/portal
   - Submit a form
   - Check that session was created in appropriate database

## Troubleshooting

**Connection refused:**
- Verify connection strings in `.env` are correct
- Check that JawsDB instances are active
- Ensure firewall allows connections

**Table already exists:**
- This is fine - the migrations use `CREATE TABLE IF NOT EXISTS`
- You can safely re-run migrations

**Permission denied:**
- Verify database user has CREATE TABLE permissions
- Check that you're connecting to the correct database

