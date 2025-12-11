-- Enhanced Verification Database Schema
-- Adds support for detailed verification metrics, rate limiting, and fraud detection
-- Note: If columns already exist, you may see errors - this is safe to ignore

-- Add new columns to app_users table
ALTER TABLE app_users 
ADD COLUMN verification_level VARCHAR(16) DEFAULT 'basic',
ADD COLUMN reputation_score DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN verification_count INT DEFAULT 0,
ADD COLUMN last_verification_ip VARCHAR(45) NULL,
ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Add indexes (ignore errors if they already exist)
ALTER TABLE app_users 
ADD INDEX idx_verification_level (verification_level),
ADD INDEX idx_reputation_score (reputation_score);

-- Enhanced audit table with more metrics
ALTER TABLE app_status_audit
ADD COLUMN confidence_score DECIMAL(3,2) NULL,
ADD COLUMN verification_level VARCHAR(16) NULL,
ADD COLUMN ip_address VARCHAR(45) NULL,
ADD COLUMN user_agent TEXT NULL,
ADD COLUMN risk_indicators_json TEXT NULL,
ADD COLUMN factors_json TEXT NULL,
ADD COLUMN recommendations_json TEXT NULL;

-- Add indexes (ignore errors if they already exist)
ALTER TABLE app_status_audit
ADD INDEX idx_confidence_score (confidence_score),
ADD INDEX idx_ip_address (ip_address(15)),
ADD INDEX idx_verification_level_audit (verification_level);

-- Rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
    rate_limit_id CHAR(36) PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,  -- IP address or user_id
    identifier_type VARCHAR(16) NOT NULL,  -- 'ip' or 'user'
    request_count INT DEFAULT 1,
    window_start DATETIME NOT NULL,
    window_end DATETIME NOT NULL,
    blocked_until DATETIME NULL,
    INDEX idx_identifier (identifier, identifier_type),
    INDEX idx_window (window_start, window_end),
    INDEX idx_blocked (blocked_until)
);

-- Fraud detection patterns
CREATE TABLE IF NOT EXISTS fraud_patterns (
    pattern_id CHAR(36) PRIMARY KEY,
    pattern_type VARCHAR(32) NOT NULL,  -- 'ip', 'user_agent', 'behavior'
    pattern_value VARCHAR(255) NOT NULL,
    severity VARCHAR(16) NOT NULL,  -- 'low', 'medium', 'high', 'critical'
    detection_count INT DEFAULT 1,
    first_detected DATETIME NOT NULL,
    last_detected DATETIME NOT NULL,
    is_blocked BOOLEAN DEFAULT FALSE,
    INDEX idx_pattern (pattern_type, pattern_value),
    INDEX idx_severity (severity),
    INDEX idx_blocked_patterns (is_blocked)
);

-- Verification reputation tracking
CREATE TABLE IF NOT EXISTS verification_reputation (
    reputation_id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    metric_name VARCHAR(64) NOT NULL,  -- 'success_rate', 'response_time', 'report_accuracy'
    metric_value DECIMAL(5,2) NOT NULL,
    recorded_at DATETIME NOT NULL,
    INDEX idx_user_metric (user_id, metric_name),
    INDEX idx_recorded_at (recorded_at),
    FOREIGN KEY (user_id) REFERENCES app_users(user_id) ON DELETE CASCADE
);

