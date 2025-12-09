'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

function AIChatAdvisor() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your security advisor. I can help you understand how to use this platform and provide general security guidance. What would you like to know?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Call AI-RAG service for chat (limited to advice/guidance)
      const response = await fetch(`${API_URL}/ai-rag/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          context: 'non_verified_advice',
          limit_features: true
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'I apologize, but I could not process your request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again later.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '400px',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      backgroundColor: 'white'
    }}>
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
        borderTopLeftRadius: '8px',
        borderTopRightRadius: '8px'
      }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#374151', margin: 0 }}>
          AI Security Advisor (Limited Features)
        </h3>
        <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
          Get advice on using the platform and general security guidance
        </p>
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: msg.role === 'user' ? '#3b82f6' : '#f3f4f6',
              color: msg.role === 'user' ? 'white' : '#374151',
              fontSize: '0.875rem',
              lineHeight: '1.5'
            }}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            padding: '0.75rem',
            borderRadius: '8px',
            backgroundColor: '#f3f4f6',
            color: '#6b7280',
            fontSize: '0.875rem'
          }}>
            Thinking...
          </div>
        )}
      </div>
      <form onSubmit={handleSend} style={{
        padding: '1rem',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        gap: '0.5rem'
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me about security or how to use this platform..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '0.625rem',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '0.875rem'
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          style={{
            padding: '0.625rem 1rem',
            backgroundColor: (!input.trim() || loading) ? '#9ca3af' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: '600'
          }}
        >
          Send
        </button>
      </form>
    </div>
  )
}

function ThreatSubmissionForm({ hasSubmitted, onSubmitted }: { hasSubmitted: boolean; onSubmitted: () => void }) {
  const [threatDescription, setThreatDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!threatDescription.trim() || hasSubmitted) return

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
      onSubmitted()
      setTimeout(() => setSubmitted(false), 5000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit threat')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {hasSubmitted && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '6px',
          color: '#92400e',
          marginBottom: '0.75rem',
          fontSize: '0.875rem'
        }}>
          ⚠️ You have already submitted 1 issue. As a non-verified user, you can only submit 1 issue. Get verified to submit unlimited issues.
        </div>
      )}
      <textarea
        value={threatDescription}
        onChange={(e) => setThreatDescription(e.target.value)}
        placeholder="Describe your security threat or concern..."
        disabled={submitting || hasSubmitted}
        style={{
          width: '100%',
          minHeight: '120px',
          padding: '0.75rem',
          border: '2px solid #e5e7eb',
          borderRadius: '6px',
          fontSize: '0.9375rem',
          fontFamily: 'inherit',
          resize: 'vertical',
          marginBottom: '0.75rem',
          opacity: hasSubmitted ? 0.6 : 1
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
        disabled={!threatDescription.trim() || submitting || hasSubmitted}
        style={{
          width: '100%',
          padding: '0.75rem',
          fontSize: '0.9375rem',
          fontWeight: '600',
          backgroundColor: (!threatDescription.trim() || submitting || hasSubmitted) ? '#9ca3af' : '#f59e0b',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: (!threatDescription.trim() || submitting || hasSubmitted) ? 'not-allowed' : 'pointer'
        }}
      >
        {hasSubmitted ? 'Limit Reached (1/1)' : submitting ? 'Submitting...' : 'Submit Threat (Low Priority)'}
      </button>
    </form>
  )
}

export default function NonVerifiedDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [hasSubmittedIssue, setHasSubmittedIssue] = useState(false)

  useEffect(() => {
    // Check if user has already submitted an issue (stored in localStorage)
    const submitted = localStorage.getItem('non_verified_issue_submitted')
    if (submitted === 'true') {
      setHasSubmittedIssue(true)
    }
    setTimeout(() => setLoading(false), 1000)
  }, [])

  const handleIssueSubmitted = () => {
    setHasSubmittedIssue(true)
    localStorage.setItem('non_verified_issue_submitted', 'true')
  }

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
            Submit Security Threat (Low Priority) - 1 Issue Limit
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
            As a non-verified user, you can submit 1 security threat. It will be marked as low priority and reviewed by our team. Get verified to submit unlimited issues with AI analysis.
          </p>
          <ThreatSubmissionForm hasSubmitted={hasSubmittedIssue} onSubmitted={handleIssueSubmitted} />
        </div>

        {/* AI Chat Advisor */}
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
            AI Security Advisor
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
            Chat with our AI advisor to get guidance on using the platform and general security advice. Features are limited for non-verified users.
          </p>
          <AIChatAdvisor />
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
