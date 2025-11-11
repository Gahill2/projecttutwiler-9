# Running Database Migration in MySQL Workbench

## Step 1: Connect to Your Main Database

1. Open MySQL Workbench
2. Click the "+" button to create a new connection (or use existing)
3. Enter connection details:
   - **Connection Name**: `Project Tutwiler Main DB`
   - **Hostname**: `r4919aobtbi97j46.cbetxkdyhwsb.us-east-1.rds.amazonaws.com`
   - **Port**: `3306`
   - **Username**: `kt1mt8pirpoxzkfl`
   - **Password**: `vykj724nlpi3y3qb` (click "Store in Vault" to save)
   - **Default Schema**: `pa8ah0pwtssyutkg`
4. Click "Test Connection" to verify
5. Click "OK" to save
6. Double-click the connection to connect

## Step 2: Open the Migration File

1. In MySQL Workbench, go to **File → Open SQL Script**
2. Navigate to: `orchestrator/Orchestrator/DatabaseMigration.sql`
3. Click "Open"

## Step 3: Select the Database

1. In the SQL editor, make sure you're using the correct database
2. You can either:
   - Click the database dropdown at the top and select `pa8ah0pwtssyutkg`
   - Or add this line at the top of your SQL script:
     ```sql
     USE pa8ah0pwtssyutkg;
     ```

## Step 4: Run the Migration

1. Review the SQL in the editor (should show CREATE TABLE statements)
2. Click the **lightning bolt icon** (⚡) or press `Ctrl+Shift+Enter` to execute
3. You should see:
   - "2 row(s) affected" messages
   - Success messages in the output panel

## Step 5: Verify Tables Were Created

1. In the left sidebar, expand your database (`pa8ah0pwtssyutkg`)
2. Expand "Tables"
3. You should see:
   - `app_users`
   - `app_status_audit`
4. Right-click each table → "Select Rows" to verify structure

## Alternative: Copy-Paste Method

If opening the file doesn't work:

1. Open `orchestrator/Orchestrator/DatabaseMigration.sql` in a text editor
2. Copy all the SQL
3. In MySQL Workbench, create a new SQL tab
4. Paste the SQL
5. Make sure the correct database is selected
6. Execute (⚡ button)

## What Gets Created

- **app_users**: Stores user verification status (user_id, status, timestamps)
- **app_status_audit**: Stores audit trail of verification attempts

Both tables follow zero-data principle - no PII stored, only status and reason codes.

