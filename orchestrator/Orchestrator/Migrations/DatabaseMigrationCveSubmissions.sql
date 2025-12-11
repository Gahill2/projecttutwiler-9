-- CVE Submissions Table
-- Stores all CVE/issue uploads from verified and non-verified users
-- Admin can view all submissions here

CREATE TABLE IF NOT EXISTS cve_submissions (
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
    INDEX idx_user_id (user_id),
    INDEX idx_severity (severity),
    INDEX idx_status (status),
    INDEX idx_is_verified (is_verified_user),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES app_users(user_id) ON DELETE CASCADE
);

