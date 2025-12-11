-- Mock CVE Data for Demo Purposes
-- This script adds sample CVE submissions to demonstrate the admin dashboard
-- Run this after the main database migrations
--
-- Usage:
--   1. Connect to your MySQL database
--   2. Run: source DatabaseMigrationMockCveData.sql
--   3. Or execute this file through MySQL Workbench or command line
--
-- To remove mock data (optional):
--   DELETE FROM cve_submissions WHERE submission_id IN (
--     'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
--     'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
--     ... (all mock submission IDs)
--   );
--
-- Note: If you have real CVE submissions, you may want to adjust the submission_id
-- values in this script to avoid conflicts.

-- First, ensure we have some users to reference
-- Create demo users if they don't exist (using ON DUPLICATE KEY UPDATE for compatibility)
INSERT INTO app_users (user_id, status, last_verified_at, model_version)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'verified', NOW(), 'demo'),
    ('22222222-2222-2222-2222-222222222222', 'verified', NOW(), 'demo'),
    ('33333333-3333-3333-3333-333333333333', 'non_verified', NOW(), 'demo'),
    ('44444444-4444-4444-4444-444444444444', 'non_verified', NOW(), 'demo'),
    ('55555555-5555-5555-5555-555555555555', 'verified', NOW(), 'demo')
ON DUPLICATE KEY UPDATE 
    status = VALUES(status),
    model_version = VALUES(model_version);

-- Insert mock CVE submissions
-- Mix of verified and non-verified users, different severities and statuses
-- Note: If you want to re-run this script, delete existing mock data first or use INSERT IGNORE
INSERT IGNORE INTO cve_submissions (
    submission_id,
    user_id,
    description,
    severity,
    cvss_score,
    status,
    is_verified_user,
    created_at,
    updated_at
) VALUES
-- Critical CVEs from verified users
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Critical SQL injection vulnerability in authentication system allowing unauthorized access to user databases. Attackers can execute arbitrary SQL commands through the login form.',
    'Critical',
    9.8,
    'pending',
    TRUE,
    DATE_SUB(NOW(), INTERVAL 2 DAY),
    DATE_SUB(NOW(), INTERVAL 2 DAY)
),
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'Remote code execution vulnerability in web application server. Unauthenticated attackers can execute arbitrary code by sending crafted HTTP requests to the admin panel endpoint.',
    'Critical',
    9.1,
    'pending',
    TRUE,
    DATE_SUB(NOW(), INTERVAL 1 DAY),
    DATE_SUB(NOW(), INTERVAL 1 DAY)
),
-- High severity CVEs
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '11111111-1111-1111-1111-111111111111',
    'Cross-site scripting (XSS) vulnerability in user input fields. Malicious scripts can be injected and executed in the context of other users, potentially stealing session cookies.',
    'High',
    7.5,
    'pending',
    TRUE,
    DATE_SUB(NOW(), INTERVAL 3 DAY),
    DATE_SUB(NOW(), INTERVAL 3 DAY)
),
(
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '55555555-5555-5555-5555-555555555555',
    'Authentication bypass vulnerability allowing unauthorized access to admin functions. Weak session management enables privilege escalation attacks.',
    'High',
    8.2,
    'reviewed',
    TRUE,
    DATE_SUB(NOW(), INTERVAL 5 DAY),
    DATE_SUB(NOW(), INTERVAL 1 DAY)
),
-- Moderate severity CVEs
(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '33333333-3333-3333-3333-333333333333',
    'Information disclosure vulnerability in API endpoints. Sensitive user data is exposed through error messages and debug responses.',
    'Moderate',
    5.3,
    'pending',
    FALSE,
    DATE_SUB(NOW(), INTERVAL 4 DAY),
    DATE_SUB(NOW(), INTERVAL 4 DAY)
),
(
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '22222222-2222-2222-2222-222222222222',
    'Denial of service vulnerability in file upload functionality. Large file uploads can exhaust server resources and cause service unavailability.',
    'Moderate',
    6.1,
    'pending',
    TRUE,
    DATE_SUB(NOW(), INTERVAL 6 DAY),
    DATE_SUB(NOW(), INTERVAL 6 DAY)
),
-- Low severity CVEs
(
    '11111111-1111-1111-1111-111111111111',
    '44444444-4444-4444-4444-444444444444',
    'Minor security misconfiguration in web server headers. Missing security headers could allow clickjacking attacks.',
    'Low',
    3.1,
    'pending',
    FALSE,
    DATE_SUB(NOW(), INTERVAL 7 DAY),
    DATE_SUB(NOW(), INTERVAL 7 DAY)
),
(
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'Weak password policy enforcement. System allows users to set weak passwords that are easily guessable.',
    'Low',
    2.5,
    'resolved',
    FALSE,
    DATE_SUB(NOW(), INTERVAL 10 DAY),
    DATE_SUB(NOW(), INTERVAL 1 DAY)
),
-- More recent submissions
(
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'Path traversal vulnerability in file download feature. Attackers can access arbitrary files outside the intended directory.',
    'High',
    7.8,
    'pending',
    TRUE,
    DATE_SUB(NOW(), INTERVAL 12 HOUR),
    DATE_SUB(NOW(), INTERVAL 12 HOUR)
),
(
    '44444444-4444-4444-4444-444444444444',
    '44444444-4444-4444-4444-444444444444',
    'Insecure direct object reference (IDOR) vulnerability. Users can access other users data by manipulating URL parameters.',
    'Moderate',
    5.7,
    'pending',
    FALSE,
    DATE_SUB(NOW(), INTERVAL 1 HOUR),
    DATE_SUB(NOW(), INTERVAL 1 HOUR)
),
(
    '55555555-5555-5555-5555-555555555555',
    '22222222-2222-2222-2222-222222222222',
    'Server-side request forgery (SSRF) vulnerability in webhook functionality. Attackers can make the server send requests to internal services.',
    'Critical',
    9.3,
    'pending',
    TRUE,
    DATE_SUB(NOW(), INTERVAL 30 MINUTE),
    DATE_SUB(NOW(), INTERVAL 30 MINUTE)
),
(
    '66666666-6666-6666-6666-666666666666',
    '55555555-5555-5555-5555-555555555555',
    'XML external entity (XXE) injection vulnerability in document processing. Attackers can read arbitrary files from the server.',
    'High',
    8.5,
    'reviewed',
    TRUE,
    DATE_SUB(NOW(), INTERVAL 8 DAY),
    DATE_SUB(NOW(), INTERVAL 2 DAY)
);

-- Note: This script uses INSERT IGNORE for users to avoid errors if users already exist
-- For cve_submissions, you may want to delete existing mock data first or use INSERT IGNORE
-- Adjust submission_id values if you need to avoid conflicts with real data

