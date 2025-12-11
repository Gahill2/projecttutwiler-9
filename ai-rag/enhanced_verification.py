"""
Enhanced Verification Analysis Module
Provides multi-factor scoring and sophisticated verification logic
"""

import re
from typing import Dict, List, Tuple, Any
from dataclasses import dataclass

@dataclass
class VerificationFactors:
    """Factors considered in verification"""
    role_credibility: float = 0.0  # 0.0-1.0
    problem_severity: float = 0.0  # 0.0-1.0
    problem_specificity: float = 0.0  # 0.0-1.0
    technical_accuracy: float = 0.0  # 0.0-1.0
    threat_alignment: float = 0.0  # 0.0-1.0 (alignment with known threats)
    language_quality: float = 0.0  # 0.0-1.0
    urgency_indicators: float = 0.0  # 0.0-1.0
    bio_context: float = 0.0  # 0.0-1.0 (biological/biotech context)

@dataclass
class VerificationResult:
    """Enhanced verification result"""
    decision: str  # "verified" or "non_verified"
    confidence_score: float  # 0.0-1.0
    score_bin: str  # e.g., "0.75-0.85"
    reason_codes: List[str]
    factors: VerificationFactors
    risk_indicators: List[str]
    verification_level: str  # "basic", "enhanced", "premium"
    recommendations: List[str]

# High-credibility roles (biotech/security focused)
CREDIBLE_ROLES = [
    "ciso", "chief information security officer", "security officer",
    "security analyst", "security engineer", "cybersecurity",
    "biotech", "biopharmaceutical", "pharmaceutical", "genomic",
    "research", "lab manager", "principal investigator", "pi",
    "it security", "infosec", "information security", "compliance",
    "risk management", "incident response", "threat intelligence"
]

# High-severity keywords
SEVERITY_KEYWORDS = [
    "breach", "compromise", "exploit", "vulnerability", "attack",
    "malware", "ransomware", "phishing", "unauthorized access",
    "data exfiltration", "suspicious activity", "indicators of compromise",
    "ioc", "apt", "advanced persistent threat", "zero-day"
]

# Technical accuracy indicators
TECHNICAL_INDICATORS = [
    "cve", "cvss", "mitre", "att&ck", "tactics", "techniques",
    "network traffic", "log analysis", "siem", "edr", "ids", "ips",
    "firewall", "endpoint", "authentication", "authorization",
    "encryption", "certificate", "ssl", "tls", "dns", "ip address"
]

# Biological/biotech context keywords
BIO_KEYWORDS = [
    "genomic", "dna", "rna", "protein", "sequencing", "laboratory",
    "research data", "clinical trial", "patient data", "hipaa",
    "biosecurity", "biosafety", "pathogen", "sample", "culture",
    "biotech", "pharmaceutical", "fda", "regulatory"
]

# Risk/fraud indicators
RISK_INDICATORS = [
    "urgent", "asap", "immediately", "hacked", "virus", "slow computer",
    "win lottery", "nigerian prince", "click here", "free money"
]

# Student/non-field role indicators (should be non-verified if threat is vague)
STUDENT_INDICATORS = [
    "student", "undergraduate", "graduate student", "phd student",
    "intern", "internship", "trainee", "apprentice"
]

# Non-field roles (roles clearly outside security/biotech/IT)
NON_FIELD_ROLES = [
    "teacher", "professor", "educator", "artist", "musician", "writer",
    "retail", "cashier", "waiter", "waitress", "chef", "cook",
    "driver", "delivery", "sales", "marketing", "accountant", "lawyer",
    "doctor", "nurse", "dentist", "veterinarian", "therapist", "counselor"
]

def analyze_role_credibility(role: str) -> float:
    """Analyze role credibility score (0.0-1.0) - be lenient"""
    if not role:
        return 0.4  # More lenient default
    
    role_lower = role.lower()
    
    # Check for high-credibility roles
    for credible_role in CREDIBLE_ROLES:
        if credible_role in role_lower:
            return 0.9
    
    # Check for student indicators (lower credibility)
    if any(indicator in role_lower for indicator in STUDENT_INDICATORS):
        return 0.3
    
    # Check for non-field roles (lower credibility)
    if any(non_field in role_lower for non_field in NON_FIELD_ROLES):
        return 0.2
    
    # Check for organizational indicators
    org_indicators = ["at ", "inc", "corp", "labs", "research", "university", "hospital", "institute", "company"]
    has_org = any(indicator in role_lower for indicator in org_indicators)
    
    # Check for professional titles (be more lenient - accept more titles)
    professional_titles = ["director", "manager", "lead", "senior", "chief", "head", "engineer", "analyst", "specialist", "coordinator", "administrator"]
    has_title = any(title in role_lower for title in professional_titles)
    
    # Check for IT/tech roles (be lenient)
    tech_indicators = ["it", "tech", "software", "developer", "programmer", "system", "network", "database"]
    has_tech = any(indicator in role_lower for indicator in tech_indicators)
    
    if has_org and has_title:
        return 0.8  # Higher score
    elif has_org or has_title or has_tech:
        return 0.6  # Higher score
    elif has_org:
        return 0.5
    else:
        return 0.4  # More lenient default

def analyze_problem_severity(problem: str) -> float:
    """Analyze problem severity score (0.0-1.0)"""
    if not problem:
        return 0.0
    
    problem_lower = problem.lower()
    
    # Count severity keywords
    severity_count = sum(1 for keyword in SEVERITY_KEYWORDS if keyword in problem_lower)
    
    # High severity: multiple indicators
    if severity_count >= 3:
        return 0.9
    elif severity_count >= 2:
        return 0.7
    elif severity_count >= 1:
        return 0.5
    else:
        return 0.3

def analyze_problem_specificity(problem: str) -> float:
    """Analyze how specific and detailed the problem description is"""
    if not problem:
        return 0.0
    
    # Longer, more detailed descriptions score higher
    word_count = len(problem.split())
    
    if word_count >= 50:
        return 0.9
    elif word_count >= 30:
        return 0.7
    elif word_count >= 15:
        return 0.5
    else:
        return 0.3

def analyze_technical_accuracy(problem: str) -> float:
    """Analyze technical accuracy and terminology"""
    if not problem:
        return 0.0
    
    problem_lower = problem.lower()
    
    # Count technical indicators
    tech_count = sum(1 for indicator in TECHNICAL_INDICATORS if indicator in problem_lower)
    
    if tech_count >= 3:
        return 0.9
    elif tech_count >= 2:
        return 0.7
    elif tech_count >= 1:
        return 0.5
    else:
        return 0.2

def analyze_threat_alignment(matches: List[Any], problem: str) -> float:
    """Analyze alignment with known threats from CVE data"""
    if not matches:
        return 0.0
    
    # Average similarity score from vector search
    avg_score = sum(m.score for m in matches) / len(matches) if matches else 0.0
    
    # High alignment if average score > 0.7
    if avg_score > 0.7:
        return 0.9
    elif avg_score > 0.5:
        return 0.7
    elif avg_score > 0.3:
        return 0.5
    else:
        return 0.2

def analyze_language_quality(text: str) -> float:
    """Analyze language quality and professionalism"""
    if not text:
        return 0.0
    
    # Check for proper capitalization, punctuation
    has_proper_caps = any(c.isupper() for c in text)
    has_punctuation = any(c in ".!?" for c in text)
    
    # Check for excessive capitalization (shouting)
    upper_ratio = sum(1 for c in text if c.isupper()) / len(text) if text else 0
    is_shouting = upper_ratio > 0.3
    
    # Check for excessive punctuation
    exclamation_count = text.count("!")
    is_excessive = exclamation_count > 3
    
    if is_shouting or is_excessive:
        return 0.2
    
    if has_proper_caps and has_punctuation:
        return 0.8
    elif has_proper_caps or has_punctuation:
        return 0.5
    else:
        return 0.3

def analyze_urgency_indicators(problem: str) -> float:
    """Analyze urgency indicators (legitimate vs. suspicious)"""
    if not problem:
        return 0.0
    
    problem_lower = problem.lower()
    
    # Legitimate urgency indicators
    legitimate_urgency = ["critical", "urgent", "immediate", "asap", "time-sensitive"]
    # Suspicious urgency (often used in scams)
    suspicious_urgency = ["act now", "limited time", "expires soon", "click immediately"]
    
    legitimate_count = sum(1 for phrase in legitimate_urgency if phrase in problem_lower)
    suspicious_count = sum(1 for phrase in suspicious_urgency if phrase in problem_lower)
    
    if suspicious_count > 0:
        return 0.1  # Low score for suspicious urgency
    elif legitimate_count > 0:
        return 0.7  # Moderate score for legitimate urgency
    else:
        return 0.5  # Neutral

def analyze_bio_context(role: str, problem: str) -> float:
    """Analyze biological/biotech context relevance"""
    combined = f"{role} {problem}".lower()
    
    bio_count = sum(1 for keyword in BIO_KEYWORDS if keyword in combined)
    
    if bio_count >= 3:
        return 0.9
    elif bio_count >= 2:
        return 0.7
    elif bio_count >= 1:
        return 0.5
    else:
        return 0.3

def detect_risk_indicators(text: str) -> List[str]:
    """Detect risk/fraud indicators"""
    risk_found = []
    text_lower = text.lower()
    
    for indicator in RISK_INDICATORS:
        if indicator in text_lower:
            risk_found.append(f"suspicious_language_{indicator}")
    
    # Check for generic/vague language
    vague_phrases = ["something wrong", "not working", "help me", "fix it"]
    if any(phrase in text_lower for phrase in vague_phrases) and len(text.split()) < 10:
        risk_found.append("vague_description")
    
    return risk_found

def calculate_verification_level(factors: VerificationFactors, confidence: float) -> str:
    """Determine verification level based on factors and confidence"""
    if confidence >= 0.85:
        return "premium"
    elif confidence >= 0.70:
        return "enhanced"
    else:
        return "basic"

def generate_recommendations(factors: VerificationFactors, risk_indicators: List[str]) -> List[str]:
    """Generate recommendations based on analysis"""
    recommendations = []
    
    if factors.role_credibility < 0.5:
        recommendations.append("Consider providing more specific role and organization details")
    
    if factors.problem_specificity < 0.5:
        recommendations.append("Provide more detailed description of the security concern")
    
    if factors.technical_accuracy < 0.5:
        recommendations.append("Include technical details such as affected systems or error messages")
    
    if risk_indicators:
        recommendations.append("Review submission for suspicious patterns")
    
    if factors.bio_context < 0.3:
        recommendations.append("Clarify biological/biotech context if applicable")
    
    return recommendations

def enhanced_verification_analysis(
    name: str,
    role: str,
    problem: str,
    cve_matches: List[Any] = None
) -> VerificationResult:
    """
    Perform enhanced multi-factor verification analysis
    
    Args:
        name: User's name
        role: User's role/organization
        problem: Problem description
        cve_matches: CVE vector search matches (optional)
    
    Returns:
        VerificationResult with detailed analysis
    """
    cve_matches = cve_matches or []
    
    # Analyze all factors
    factors = VerificationFactors(
        role_credibility=analyze_role_credibility(role),
        problem_severity=analyze_problem_severity(problem),
        problem_specificity=analyze_problem_specificity(problem),
        technical_accuracy=analyze_technical_accuracy(problem),
        threat_alignment=analyze_threat_alignment(cve_matches, problem),
        language_quality=analyze_language_quality(f"{role} {problem}"),
        urgency_indicators=analyze_urgency_indicators(problem),
        bio_context=analyze_bio_context(role, problem)
    )
    
    # Detect risk indicators
    risk_indicators = detect_risk_indicators(f"{role} {problem}")
    
    # Calculate weighted confidence score
    # Weights can be adjusted based on importance
    weights = {
        'role_credibility': 0.20,
        'problem_severity': 0.15,
        'problem_specificity': 0.15,
        'technical_accuracy': 0.15,
        'threat_alignment': 0.15,
        'language_quality': 0.10,
        'urgency_indicators': 0.05,
        'bio_context': 0.05
    }
    
    confidence = (
        factors.role_credibility * weights['role_credibility'] +
        factors.problem_severity * weights['problem_severity'] +
        factors.problem_specificity * weights['problem_specificity'] +
        factors.technical_accuracy * weights['technical_accuracy'] +
        factors.threat_alignment * weights['threat_alignment'] +
        factors.language_quality * weights['language_quality'] +
        factors.urgency_indicators * weights['urgency_indicators'] +
        factors.bio_context * weights['bio_context']
    )
    
    # Penalize for risk indicators
    if risk_indicators:
        confidence *= 0.7  # Reduce confidence by 30% if risk indicators found
    
    # Ensure confidence is in valid range
    confidence = max(0.0, min(1.0, confidence))
    
    # Determine decision threshold - be more lenient
    # If they have a real threat and a professional role, verify them
    has_real_threat = factors.problem_severity >= 0.5 or factors.problem_specificity >= 0.5
    has_professional_role = factors.role_credibility >= 0.5
    
    # Check if student or non-field role with vague threat
    role_lower = role.lower() if role else ""
    is_student = any(indicator in role_lower for indicator in STUDENT_INDICATORS) if role_lower else False
    is_non_field = any(non_field in role_lower for non_field in NON_FIELD_ROLES) if role_lower else False
    vague_threat = factors.problem_severity < 0.4 and factors.problem_specificity < 0.4
    
    # Non-verify only if: student/non-field role AND vague/unimportant threat
    if (is_student or is_non_field) and vague_threat:
        decision = "non_verified"
    # Verify if: real threat AND professional role
    elif has_real_threat and has_professional_role:
        decision = "verified"
    # Verify if: real threat (even without strong role)
    elif has_real_threat and confidence >= 0.5:
        decision = "verified"
    # Default threshold lowered
    else:
        decision = "verified" if confidence >= 0.55 else "non_verified"
    
    # Generate score bin
    score_low = max(0.0, confidence - 0.05)
    score_high = min(1.0, confidence + 0.05)
    score_bin = f"{score_low:.2f}-{score_high:.2f}"
    
    # Generate reason codes
    reason_codes = []
    if factors.role_credibility >= 0.7:
        reason_codes.append("credible_role")
    if factors.problem_severity >= 0.7:
        reason_codes.append("high_severity_concern")
    if factors.technical_accuracy >= 0.7:
        reason_codes.append("technical_accuracy")
    if factors.threat_alignment >= 0.7:
        reason_codes.append("threat_alignment")
    if factors.bio_context >= 0.7:
        reason_codes.append("bio_context_relevant")
    if risk_indicators:
        reason_codes.append("risk_indicators_detected")
    if not reason_codes:
        reason_codes.append("standard_verification")
    
    # Determine verification level
    verification_level = calculate_verification_level(factors, confidence)
    
    # Generate recommendations
    recommendations = generate_recommendations(factors, risk_indicators)
    
    return VerificationResult(
        decision=decision,
        confidence_score=confidence,
        score_bin=score_bin,
        reason_codes=reason_codes,
        factors=factors,
        risk_indicators=risk_indicators,
        verification_level=verification_level,
        recommendations=recommendations
    )

