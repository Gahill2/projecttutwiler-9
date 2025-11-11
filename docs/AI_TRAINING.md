# AI Document Type Training Guide

## Overview

The AI needs to recognize and verify different types of professional documents. We use **Pinecone namespaces** to organize document types.

## Document Types to Support

1. **Apple Farmers / Agricultural Workers**
   - Farm licenses
   - Agricultural certifications
   - USDA documents
   - Crop insurance papers

2. **Company Professionals**
   - Business licenses
   - Professional certifications
   - Employment verification
   - Corporate documents

3. **Healthcare Professionals**
   - Medical licenses
   - Nursing certifications
   - Healthcare facility credentials

4. **Educators**
   - Teaching licenses
   - Educational certifications
   - School district credentials

5. **Other Professional Categories**
   - Add as needed

## Training Process

### Step 1: Ingest Sample Documents

Use the `/ingest` endpoint with appropriate namespace:

```bash
curl -X POST http://localhost:9090/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "docs": [
      {
        "id": "apple-farmer-sample-1",
        "text": "USDA Organic Certification for Apple Farm...",
        "meta": {
          "doc_type": "organic_cert",
          "category": "agricultural"
        },
        "namespace": "apple-farmer"
      }
    ],
    "namespace": "apple-farmer"
  }'
```

### Step 2: Ingest Multiple Document Types

Create training sets for each category:

**Apple Farmers:**
```json
{
  "namespace": "apple-farmer",
  "docs": [
    {"id": "farm-license-1", "text": "...", "meta": {"type": "license"}},
    {"id": "usda-cert-1", "text": "...", "meta": {"type": "certification"}},
    {"id": "crop-insurance-1", "text": "...", "meta": {"type": "insurance"}}
  ]
}
```

**Professionals:**
```json
{
  "namespace": "professional",
  "docs": [
    {"id": "business-license-1", "text": "...", "meta": {"type": "license"}},
    {"id": "cert-1", "text": "...", "meta": {"type": "certification"}},
    {"id": "employment-1", "text": "...", "meta": {"type": "employment"}}
  ]
}
```

### Step 3: Test Analysis

Query the AI with a document to verify:

```bash
curl -X POST http://localhost:9090/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "User submitted document text here...",
    "top_k": 5,
    "namespace": "apple-farmer"
  }'
```

The AI will:
1. Embed the query
2. Search similar documents in the namespace
3. Return decision: `verified` or `non_verified`
4. Provide reason codes

## Document Metadata Structure

Each document should include:

```json
{
  "id": "unique-doc-id",
  "text": "full document text",
  "meta": {
    "doc_type": "license|certification|employment|insurance",
    "category": "agricultural|professional|healthcare|education",
    "verification_level": "verified|non_verified",
    "common_fraud_indicators": ["missing_seal", "expired_date"],
    "required_fields": ["name", "date", "issuer", "number"]
  },
  "namespace": "apple-farmer|professional|healthcare|education"
}
```

## Fraud Detection Patterns

Train the AI to recognize:

1. **Missing Elements:**
   - Expired dates
   - Missing seals/stamps
   - Incomplete information

2. **Inconsistencies:**
   - Name mismatches
   - Date conflicts
   - Invalid issuer information

3. **Document Quality:**
   - Poor image quality
   - Altered text
   - Suspicious formatting

## Namespace Strategy

- **One namespace per document type** (apple-farmer, professional, etc.)
- **Separate namespaces for verified vs non-verified samples** (optional)
- **Cross-namespace search** when document type is unknown

## Continuous Learning

1. **Collect real verification results** (without PII)
2. **Ingest successful verifications** as positive examples
3. **Ingest failed verifications** as negative examples
4. **Update namespaces** regularly with new patterns

## Zero-Data Principle

- **Never store raw user documents** in Pinecone
- **Only store document structure patterns** and verification indicators
- **Use anonymized examples** for training
- **Store only metadata** about document types, not actual user data

