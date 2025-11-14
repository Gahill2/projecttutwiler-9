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
    """Get connection to NV database"""
    nv_db_url = os.getenv("JAWSDB_NV_URL", "")
    if not nv_db_url or not nv_db_url.startswith("mysql://"):
        raise Exception("JAWSDB_NV_URL not configured")
    
    # Parse MySQL URL
    url = nv_db_url.replace("mysql://", "")
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

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/session")
async def create_session(request: SessionRequest):
    """Create a new NV session"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        session_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        cursor.execute("""
            INSERT INTO nv_sessions (session_id, user_id, status, score_bin, reason_codes_json, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            session_id,
            request.user_id,
            request.status,
            request.score_bin,
            json.dumps(request.reason_codes),
            now,
            now
        ))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {"session_id": session_id, "status": "created"}
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
            INSERT INTO nv_metrics (metric_id, session_id, metric_type, metric_value, metric_data_json, created_at)
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

