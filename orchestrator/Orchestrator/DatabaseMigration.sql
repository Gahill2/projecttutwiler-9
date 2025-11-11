-- Run this SQL on your JawsDB instance to create the required tables
-- Zero-data principle: Only store user_id, status, timestamps, reason codes - NO PII

CREATE TABLE IF NOT EXISTS app_users (
    user_id CHAR(36) PRIMARY KEY,
    status VARCHAR(16) NOT NULL,
    last_verified_at DATETIME NULL,
    attestation_ref VARCHAR(64) NULL,
    model_version VARCHAR(16) NULL,
    INDEX idx_status (status),
    INDEX idx_last_verified (last_verified_at)
);

CREATE TABLE IF NOT EXISTS app_status_audit (
    audit_id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    status VARCHAR(16) NOT NULL,
    reason_codes_json TEXT NOT NULL,
    score_bin VARCHAR(16) NULL,
    created_at DATETIME NOT NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES app_users(user_id) ON DELETE CASCADE
);

