-- Verified (V) Database Migration
-- Run this SQL on your V JawsDB instance
-- Zero-data principle: Only store verification status, reason codes, access logs - NO PII

CREATE TABLE IF NOT EXISTS v_sessions (
    session_id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    status VARCHAR(16) NOT NULL,
    score_bin VARCHAR(16) NULL,
    reason_codes_json TEXT NOT NULL,
    verification_timestamp DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_verification_timestamp (verification_timestamp)
);

CREATE TABLE IF NOT EXISTS v_access_logs (
    log_id CHAR(36) PRIMARY KEY,
    session_id CHAR(36) NOT NULL,
    access_type VARCHAR(32) NOT NULL,
    resource_accessed VARCHAR(128) NULL,
    access_timestamp DATETIME NOT NULL,
    INDEX idx_session_id (session_id),
    INDEX idx_access_type (access_type),
    INDEX idx_access_timestamp (access_timestamp),
    FOREIGN KEY (session_id) REFERENCES v_sessions(session_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS v_metrics (
    metric_id CHAR(36) PRIMARY KEY,
    session_id CHAR(36) NOT NULL,
    metric_type VARCHAR(32) NOT NULL,
    metric_value DECIMAL(10, 2) NULL,
    metric_data_json TEXT NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_session_id (session_id),
    INDEX idx_metric_type (metric_type),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (session_id) REFERENCES v_sessions(session_id) ON DELETE CASCADE
);

