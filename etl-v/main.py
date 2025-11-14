import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
import mysql.connector
from mysql.connector import Error
import json
from datetime import datetime
import uuid

app = FastAPI()

def get_db_connection():
    """Get connection to V database"""
    v_db_url = os.getenv("JAWSDB_V_URL", "")
    if not v_db_url or not v_db_url.startswith("mysql://"):
        raise Exception("JAWSDB_V_URL not configured")
    
    # Parse MySQL URL
    url = v_db_url.replace("mysql://", "")
    if "@" in url:
        auth, rest = url.split("@", 1)
        user, password = auth.split(":", 1)
        password = password.replace("%3A", ":")
        if "/" in rest:
            host_port, database = rest.split("/", 1)
            if ":" in host_port:
                host, port = host_port.split(":", 1)
                port = int(port)
            else:
                host = host_port
                port = 3306
        else:
            raise Exception("Invalid database URL format")
    else:
        raise Exception("Invalid database URL format")
    
    try:
        connection = mysql.connector.connect(
            host=host,
            port=port,
            database=database,
            user=user,
            password=password,
            ssl_disabled=False
        )
        return connection
    except Error as e:
        raise Exception(f"Database connection failed: {e}")

class SessionRequest(BaseModel):
    user_id: str
    status: str
    score_bin: Optional[str] = None
    reason_codes: list[str] = []

class AccessLogRequest(BaseModel):
    session_id: str
    access_type: str
    resource_accessed: Optional[str] = None

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/session")
async def create_session(request: SessionRequest):
    """Create a new V session"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        session_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        cursor.execute("""
            INSERT INTO v_sessions (session_id, user_id, status, score_bin, reason_codes_json, verification_timestamp, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            session_id,
            request.user_id,
            request.status,
            request.score_bin,
            json.dumps(request.reason_codes),
            now,
            now,
            now
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {"session_id": session_id, "status": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/access-log")
async def log_access(request: AccessLogRequest):
    """Log an access event"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        log_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        cursor.execute("""
            INSERT INTO v_access_logs (log_id, session_id, access_type, resource_accessed, access_timestamp)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            log_id,
            request.session_id,
            request.access_type,
            request.resource_accessed,
            now
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {"log_id": log_id, "status": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/metrics")
async def add_metric(session_id: str, metric_type: str, metric_value: Optional[float] = None, metric_data: Optional[Dict[str, Any]] = None):
    """Add a metric for a session"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        metric_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        cursor.execute("""
            INSERT INTO v_metrics (metric_id, session_id, metric_type, metric_value, metric_data_json, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            metric_id,
            session_id,
            metric_type,
            metric_value,
            json.dumps(metric_data) if metric_data else None,
            now
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {"metric_id": metric_id, "status": "created"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

