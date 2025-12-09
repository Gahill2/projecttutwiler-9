# Sample CVEs for Testing Verified Dashboard

Copy and paste these into the "Upload Issue/CVE" field on the verified dashboard:

## Critical Severity CVEs

**CVE-2024-12345**
```
Critical vulnerability in laboratory information management systems (LIMS) affecting DNA sequencing equipment. Remote code execution possible through unauthenticated API endpoints. Affects versions 2.1.0 through 2.3.5. CVSS Score: 9.8. Immediate patching required. Exploitation detected in the wild targeting biotech research facilities.
```

**CVE-2024-23456**
```
Authentication bypass in biopharmaceutical manufacturing control systems. Attackers can gain administrative access without credentials by manipulating session tokens. Affects all versions prior to 3.0.2. CVSS Score: 9.1. Critical for facilities handling controlled substances.
```

**CVE-2024-34567**
```
SQL injection vulnerability in genetic data storage databases. Allows unauthorized access to patient genetic information and research data. Affects database versions 5.0.0 through 5.2.1. CVSS Score: 9.3. HIPAA compliance concern.
```

## High Severity CVEs

**CVE-2024-45678**
```
Privilege escalation in laboratory equipment firmware. Local attackers can gain root access on DNA sequencers and PCR machines. Affects firmware versions 1.5.0 through 1.8.3. CVSS Score: 7.8. Physical access required but poses significant risk to data integrity.
```

**CVE-2024-56789**
```
Cross-site scripting (XSS) in biotech research collaboration platforms. Stored XSS allows persistent attacks on researchers viewing shared data. Affects web interface versions 4.2.0 through 4.5.1. CVSS Score: 7.2. Can lead to credential theft and data manipulation.
```

**CVE-2024-67890**
```
Insecure deserialization in laboratory automation software. Remote code execution possible when processing malicious configuration files. Affects versions 6.0.0 through 6.3.2. CVSS Score: 8.1. High risk for automated research facilities.
```

## Moderate Severity CVEs

**CVE-2024-78901**
```
Information disclosure in research data sharing APIs. Sensitive metadata exposed through improper error handling. Affects API versions 2.0.0 through 2.1.5. CVSS Score: 5.3. May reveal research project details and collaboration networks.
```

**CVE-2024-89012**
```
Denial of service in genetic analysis processing pipelines. Malicious input can cause system crashes and data processing delays. Affects pipeline versions 3.1.0 through 3.2.8. CVSS Score: 5.9. Impacts research productivity but no data loss.
```

## Low Severity CVEs

**CVE-2024-90123**
```
Weak password policy in laboratory equipment management portals. Minimum password length of 6 characters. Affects all versions. CVSS Score: 3.1. Low risk but should be addressed in security hardening.
```

**CVE-2024-01234**
```
Missing security headers in research collaboration web applications. No Content-Security-Policy or X-Frame-Options headers. Affects versions 1.0.0 through 1.2.3. CVSS Score: 2.5. Minor security improvement recommended.
```

