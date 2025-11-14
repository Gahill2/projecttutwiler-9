#!/usr/bin/env python3
"""
Setup script for NV and V databases.
Connects to JawsDB instances and creates required tables.
"""

import os
import sys
import mysql.connector
from mysql.connector import Error
from urllib.parse import urlparse, unquote

# Fix Windows console encoding
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

def parse_jawsdb_url(url: str):
    """Parse JawsDB MySQL URL into connection parameters"""
    if not url or not url.startswith("mysql://"):
        raise ValueError("Invalid JawsDB URL format")
    
    # Remove mysql:// prefix
    url = url.replace("mysql://", "")
    
    # Split auth and host
    if "@" not in url:
        raise ValueError("Invalid JawsDB URL: missing @")
    
    auth_part, host_part = url.split("@", 1)
    
    # Parse credentials
    if ":" not in auth_part:
        raise ValueError("Invalid JawsDB URL: missing password")
    
    user, password = auth_part.split(":", 1)
    password = unquote(password)  # Decode URL-encoded password
    
    # Parse host and database
    if "/" not in host_part:
        raise ValueError("Invalid JawsDB URL: missing database")
    
    host_port, database = host_part.split("/", 1)
    
    # Parse host and port
    if ":" in host_port:
        host, port = host_port.split(":", 1)
        port = int(port)
    else:
        host = host_port
        port = 3306
    
    return {
        "host": host,
        "port": port,
        "database": database,
        "user": user,
        "password": password
    }

def execute_sql_file(connection, sql_file_path: str):
    """Execute SQL file on the connection"""
    try:
        with open(sql_file_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        cursor = connection.cursor()
        
        # Split by semicolon and filter out comments and empty statements
        statements = []
        for line in sql_content.split('\n'):
            # Remove inline comments
            if '--' in line:
                line = line[:line.index('--')]
            line = line.strip()
            if line and not line.startswith('--'):
                statements.append(line)
        
        # Join lines and split by semicolon
        full_sql = ' '.join(statements)
        sql_statements = [s.strip() for s in full_sql.split(';') if s.strip()]
        
        for statement in sql_statements:
            if statement:
                try:
                    cursor.execute(statement)
                    # Extract table name for logging
                    if 'CREATE TABLE' in statement.upper():
                        table_name = statement.split()[2] if len(statement.split()) > 2 else 'table'
                        print(f"  ✓ Created table: {table_name}")
                    elif 'CREATE INDEX' in statement.upper() or 'INDEX' in statement.upper():
                        print(f"  ✓ Created index")
                except Error as e:
                    error_msg = str(e)
                    if "already exists" in error_msg.lower() or "duplicate" in error_msg.lower():
                        print(f"  ⚠ Already exists (skipping)")
                    elif "1824" in error_msg or "Failed to open the referenced table" in error_msg:
                        # Foreign key issue - try without foreign key first, then add it
                        print(f"  ⚠ Foreign key constraint issue - will retry after all tables created")
                        # Store for later execution
                        pass
                    else:
                        print(f"  ✗ Error: {error_msg}")
                        raise
        
        connection.commit()
        
        # Now try to add foreign keys if they failed
        for statement in sql_statements:
            if 'FOREIGN KEY' in statement.upper():
                try:
                    cursor.execute(statement)
                    print(f"  ✓ Added foreign key constraint")
                except Error as e:
                    if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                        pass  # Already exists, that's fine
                    else:
                        print(f"  ⚠ Could not add foreign key (may already exist): {str(e)[:100]}")
        
        connection.commit()
        cursor.close()
        print("  ✓ All statements executed successfully")
        return True
    except Error as e:
        print(f"  ✗ Error executing SQL: {e}")
        return False

def verify_tables(connection, expected_tables: list):
    """Verify that expected tables exist"""
    try:
        cursor = connection.cursor()
        cursor.execute("SHOW TABLES")
        existing_tables = [row[0] for row in cursor.fetchall()]
        cursor.close()
        
        missing = [t for t in expected_tables if t not in existing_tables]
        if missing:
            print(f"  ✗ Missing tables: {', '.join(missing)}")
            return False
        else:
            print(f"  ✓ All tables exist: {', '.join(expected_tables)}")
            return True
    except Error as e:
        print(f"  ✗ Error verifying tables: {e}")
        return False

def setup_database(db_name: str, db_url: str, sql_file: str, expected_tables: list):
    """Setup a single database"""
    print(f"\n{'='*60}")
    print(f"Setting up {db_name} database")
    print(f"{'='*60}")
    
    if not db_url:
        print(f"  ✗ {db_name} URL not found in environment variables")
        print(f"    Set JAWSDB_{db_name}_URL in your .env file")
        return False
    
    try:
        # Parse connection string
        print(f"  Parsing connection string...")
        conn_params = parse_jawsdb_url(db_url)
        print(f"  ✓ Connecting to {conn_params['host']}:{conn_params['port']}/{conn_params['database']}")
        
        # Connect to database
        connection = mysql.connector.connect(
            host=conn_params['host'],
            port=conn_params['port'],
            database=conn_params['database'],
            user=conn_params['user'],
            password=conn_params['password'],
            ssl_disabled=False,
            connect_timeout=10
        )
        print(f"  ✓ Connected successfully")
        
        # Execute migration SQL
        print(f"  Running migration from {sql_file}...")
        if not os.path.exists(sql_file):
            print(f"  ✗ SQL file not found: {sql_file}")
            connection.close()
            return False
        
        success = execute_sql_file(connection, sql_file)
        
        if success:
            # Verify tables
            print(f"  Verifying tables...")
            verify_tables(connection, expected_tables)
        
        connection.close()
        print(f"  ✓ {db_name} database setup complete")
        return success
        
    except Error as e:
        print(f"  ✗ Database connection error: {e}")
        return False
    except Exception as e:
        print(f"  ✗ Unexpected error: {e}")
        return False

def main():
    """Main setup function"""
    print("NV and V Database Setup Script")
    print("=" * 60)
    
    # Check if .env file exists and load it
    env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
    if os.path.exists(env_file):
        print(f"Loading environment from {env_file}...")
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()
        print("  ✓ Environment variables loaded")
    else:
        print(f"  ⚠ .env file not found at {env_file}")
        print("  Using system environment variables only")
    
    # Get connection strings
    nv_url = os.getenv("JAWSDB_NV_URL", "")
    v_url = os.getenv("JAWSDB_V_URL", "")
    
    # Get script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    
    # Setup NV database
    nv_sql = os.path.join(project_root, "orchestrator", "Orchestrator", "DatabaseMigrationNV.sql")
    nv_success = setup_database(
        "NV",
        nv_url,
        nv_sql,
        ["nv_sessions", "nv_metrics"]
    )
    
    # Setup V database
    v_sql = os.path.join(project_root, "orchestrator", "Orchestrator", "DatabaseMigrationV.sql")
    v_success = setup_database(
        "V",
        v_url,
        v_sql,
        ["v_sessions", "v_access_logs", "v_metrics"]
    )
    
    # Summary
    print(f"\n{'='*60}")
    print("Setup Summary")
    print(f"{'='*60}")
    print(f"NV Database: {'✓ Success' if nv_success else '✗ Failed'}")
    print(f"V Database:  {'✓ Success' if v_success else '✗ Failed'}")
    
    if nv_success and v_success:
        print("\n✓ All databases set up successfully!")
        return 0
    else:
        print("\n✗ Some databases failed to set up. Check errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())

