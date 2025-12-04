'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070'

function ThreatSubmissionForm() {
  const [threatDescription, setThreatDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!threatDescription.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/portal/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Non-Verified User',
          role: 'General User',
          problem: threatDescription,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit threat')
      }

      setSubmitted(true)
      setThreatDescription('')
      setTimeout(() => setSubmitted(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit threat')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={threatDescription}
        onChange={(e) => setThreatDescription(e.target.value)}
        placeholder="Describe your security threat or concern..."
        disabled={submitting}
        style={{
          width: '100%',
          minHeight: '120px',
          padding: '0.75rem',
          border: '2px solid #e5e7eb',
          borderRadius: '6px',
          fontSize: '0.9375rem',
          fontFamily: 'inherit',
          resize: 'vertical',
          marginBottom: '0.75rem'
        }}
      />
      {error && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#fee2e2',
          border: '1px solid #fca5a5',
          borderRadius: '6px',
          color: '#991b1b',
          marginBottom: '0.75rem',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}
      {submitted && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#d1fae5',
          border: '1px solid #6ee7b7',
          borderRadius: '6px',
          color: '#065f46',
          marginBottom: '0.75rem',
          fontSize: '0.875rem'
        }}>
          ✓ Threat submitted successfully (low priority). Our team will review it.
        </div>
      )}
      <button
        type="submit"
        disabled={!threatDescription.trim() || submitting}
        style={{
          width: '100%',
          padding: '0.75rem',
          fontSize: '0.9375rem',
          fontWeight: '600',
          backgroundColor: (!threatDescription.trim() || submitting) ? '#9ca3af' : '#f59e0b',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: (!threatDescription.trim() || submitting) ? 'not-allowed' : 'pointer'
        }}
      >
        {submitting ? 'Submitting...' : 'Submit Threat (Low Priority)'}
      </button>
    </form>
  )
}

export default function NonVerifiedDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000)
  }, [])

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#f9fafb',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Simple Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          textAlign: 'center',
          border: '2px dashed #d1d5db'
        }}>
          <div style={{
            display: 'inline-block',
            backgroundColor: '#f3f4f6',
            color: '#6b7280',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            fontSize: '0.875rem',
            fontWeight: '600',
            marginBottom: '1rem'
          }}>
            ⏳ PENDING VERIFICATION
          </div>
          <h1 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700', 
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Security Resources Dashboard
          </h1>
          <p style={{ color: '#6b7280', fontSize: '0.9375rem', margin: 0 }}>
            General security information and resources
          </p>
        </div>

        {/* Status Message */}
        <div style={{
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid #fbbf24'
        }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '1rem' }}>
            <div style={{ fontSize: '1.5rem' }}>⏳</div>
            <div>
              <h3 style={{ 
                fontSize: '1.125rem', 
                fontWeight: '700',
                color: '#92400e',
                marginBottom: '0.5rem'
              }}>
                Your Request is Being Processed
              </h3>
              <p style={{ color: '#78350f', fontSize: '0.9375rem', lineHeight: '1.6', margin: 0 }}>
                Thank you for submitting your security concern. Our team is reviewing your request to verify your identity and the nature of your concern. Once verified, you'll gain access to prioritized threat intelligence, real-time CVE data, and advanced security tools.
              </p>
            </div>
          </div>
        </div>

        {/* Limited Access Notice */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          borderLeft: '4px solid #6b7280'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ fontSize: '1.25rem' }}>⚠️</span>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#374151', margin: 0 }}>
              Limited Access
            </h3>
          </div>
          <p style={{ color: '#6b7280', fontSize: '0.9375rem', lineHeight: '1.6', marginBottom: '1rem' }}>
            As a non-verified user, you have access to general security resources only. Verified users receive:
          </p>
          <ul style={{ color: '#6b7280', fontSize: '0.9375rem', lineHeight: '1.8', margin: 0, paddingLeft: '1.5rem' }}>
            <li>Prioritized threat intelligence</li>
            <li>Real-time CVE data and alerts</li>
            <li>Advanced security reporting tools</li>
            <li>AI-powered issue analysis</li>
            <li>Community security issue posting</li>
          </ul>
        </div>

        {/* Basic Resources */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ 
            fontSize: '1.125rem', 
            fontWeight: '700',
            color: '#374151',
            marginBottom: '1.5rem'
          }}>
            General Security Resources
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              backgroundColor: '#f9fafb'
            }}>
              <h3 style={{ 
                fontSize: '0.9375rem', 
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                CISA Cybersecurity Resources
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.75rem', lineHeight: '1.5' }}>
                Comprehensive cybersecurity guidance and alerts for organizations.
              </p>
              <a
                href="https://www.cisa.gov/cybersecurity"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                Visit CISA →
              </a>
            </div>
            <div style={{
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              backgroundColor: '#f9fafb'
            }}>
              <h3 style={{ 
                fontSize: '0.9375rem', 
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                National Vulnerability Database (NVD)
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.75rem', lineHeight: '1.5' }}>
                Search and browse known security vulnerabilities maintained by NIST.
              </p>
              <a
                href="https://nvd.nist.gov/vuln/search"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                Search NVD →
              </a>
            </div>
            <div style={{
              padding: '1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              backgroundColor: '#f9fafb'
            }}>
              <h3 style={{ 
                fontSize: '0.9375rem', 
                fontWeight: '600',
                color: '#374151',
                marginBottom: '0.5rem'
              }}>
                CISA Known Exploited Vulnerabilities
              </h3>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.75rem', lineHeight: '1.5' }}>
                Catalog of vulnerabilities actively exploited in the wild.
              </p>
              <a
                href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#3b82f6',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                View KEV Catalog →
              </a>
            </div>
          </div>
        </div>

        {/* Threat Submission Form */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ 
            fontSize: '1.125rem', 
            fontWeight: '700',
            color: '#374151',
            marginBottom: '1rem'
          }}>
            Submit Security Threat (Low Priority)
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
            You can submit security threats here. They will be marked as low priority and reviewed by our team.
          </p>
          <ThreatSubmissionForm />
        </div>

        {/* Simple Actions */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          <button
            onClick={() => router.push('/dashboard/verified')}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '0.9375rem',
              fontWeight: '600',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            View Verified Dashboard
          </button>
          <button
            onClick={() => router.push('/portal')}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '0.9375rem',
              fontWeight: '600',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Go to Portal
          </button>
        </div>
      </div>
    </main>
  )
}
