'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const darkTheme = {
  // Dark base colors matching admin
  bg: '#0a0a0a',
  bgGradient: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
  surface: '#161616',
  surfaceHover: '#1f1f1f',
  card: '#1a1a1a',
  cardHover: '#242424',
  // Muted amber/yellow accents for non-verified (vs green for admin)
  border: 'rgba(234, 179, 8, 0.2)',
  borderLight: 'rgba(234, 179, 8, 0.1)',
  borderHover: 'rgba(234, 179, 8, 0.4)',
  // Clean text colors
  text: '#fafafa',
  textMuted: '#a3a3a3',
  textSubtle: '#737373',
  // Amber/yellow accents for non-verified status
  primary: '#eab308',
  primaryGradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
  primaryHover: '#facc15',
  // Status colors
  success: '#16a34a',
  successGradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
  warning: '#eab308',
  warningGradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
  danger: '#ef4444',
  dangerGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
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
      height: '500px',
      background: darkTheme.card,
      border: `1px solid ${darkTheme.border}`,
      borderRadius: '24px',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '1.5rem',
        borderBottom: `1px solid ${darkTheme.border}`,
        background: darkTheme.surface
      }}>
        <h3 style={{ 
          fontSize: '1rem', 
          fontWeight: '700', 
          color: darkTheme.text, 
          margin: '0 0 0.25rem 0' 
        }}>
          AI Security Advisor (Limited Features)
        </h3>
        <p style={{ fontSize: '0.8125rem', color: darkTheme.textMuted, margin: 0 }}>
          Get advice on using the platform and general security guidance
        </p>
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              padding: '1rem',
              borderRadius: '16px',
              background: msg.role === 'user' 
                ? darkTheme.primaryGradient 
                : darkTheme.surface,
              color: msg.role === 'user' ? 'white' : darkTheme.text,
              fontSize: '0.875rem',
              lineHeight: '1.6',
              border: msg.role === 'assistant' ? `1px solid ${darkTheme.border}` : 'none'
            }}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            padding: '1rem',
            borderRadius: '16px',
            background: darkTheme.surface,
            color: darkTheme.textMuted,
            fontSize: '0.875rem',
            border: `1px solid ${darkTheme.border}`
          }}>
            Thinking...
          </div>
        )}
      </div>
      <form onSubmit={handleSend} style={{
        padding: '1.5rem',
        borderTop: `1px solid ${darkTheme.border}`,
        display: 'flex',
        gap: '0.75rem',
        background: darkTheme.surface
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me about security or how to use this platform..."
          disabled={loading}
          style={{
            flex: 1,
            padding: '0.875rem 1rem',
            background: darkTheme.card,
            border: `1px solid ${darkTheme.border}`,
            borderRadius: '12px',
            fontSize: '0.875rem',
            color: darkTheme.text,
            outline: 'none'
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          style={{
            padding: '0.875rem 1.5rem',
            background: (!input.trim() || loading) ? darkTheme.surfaceHover : darkTheme.primaryGradient,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: '700',
            transition: 'all 0.3s ease'
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
          padding: '1rem',
          background: 'rgba(234, 179, 8, 0.1)',
          border: `1px solid ${darkTheme.warning}`,
          borderRadius: '16px',
          color: darkTheme.warning,
          marginBottom: '1rem',
          fontSize: '0.875rem',
          fontWeight: '600'
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
          minHeight: '140px',
          padding: '1rem',
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '16px',
          fontSize: '0.9375rem',
          fontFamily: 'inherit',
          resize: 'vertical',
          marginBottom: '1rem',
          color: darkTheme.text,
          opacity: hasSubmitted ? 0.6 : 1,
          outline: 'none'
        }}
      />
      {error && (
        <div style={{
          padding: '1rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${darkTheme.danger}`,
          borderRadius: '16px',
          color: darkTheme.danger,
          marginBottom: '1rem',
          fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}
      {submitted && (
        <div style={{
          padding: '1rem',
          background: 'rgba(22, 163, 74, 0.1)',
          border: `1px solid ${darkTheme.success}`,
          borderRadius: '16px',
          color: darkTheme.success,
          marginBottom: '1rem',
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
          padding: '1rem',
          fontSize: '0.9375rem',
          fontWeight: '700',
          background: (!threatDescription.trim() || submitting || hasSubmitted) 
            ? darkTheme.surfaceHover 
            : darkTheme.primaryGradient,
          color: 'white',
          border: 'none',
          borderRadius: '16px',
          cursor: (!threatDescription.trim() || submitting || hasSubmitted) ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease'
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

  if (loading) {
    return (
      <main style={{
        minHeight: '100vh',
        background: darkTheme.bgGradient,
        padding: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: darkTheme.text
      }}>
        <div style={{ textAlign: 'center', color: darkTheme.textMuted }}>
          <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>Loading...</div>
        </div>
      </main>
    )
  }

  return (
    <main style={{
      minHeight: '100vh',
      background: darkTheme.bgGradient,
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header Banner */}
        <div style={{
          background: darkTheme.primaryGradient,
          borderRadius: '24px',
          padding: '2.5rem',
          marginBottom: '2rem',
          boxShadow: `0 8px 32px ${darkTheme.primary}20`,
          borderBottom: `1px solid ${darkTheme.border}`
        }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(0, 0, 0, 0.2)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '12px',
            fontSize: '0.75rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '1rem'
          }}>
            ⏳ NON-VERIFIED USER
          </div>
          <h1 style={{ 
            fontSize: '2rem', 
            fontWeight: '800', 
            color: 'white',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em'
          }}>
            Security Resources Dashboard
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '1rem', margin: 0 }}>
            General security information and resources
          </p>
        </div>

        {/* Status Message */}
        <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '24px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'start', gap: '1.5rem' }}>
            <div style={{ 
              fontSize: '2rem',
              background: darkTheme.warningGradient,
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>⏳</div>
            <div style={{ flex: 1 }}>
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '800',
                color: darkTheme.text,
                marginBottom: '0.75rem',
                letterSpacing: '-0.02em'
              }}>
                Your Request is Being Processed
              </h3>
              <p style={{ color: darkTheme.textMuted, fontSize: '0.9375rem', lineHeight: '1.6', margin: 0 }}>
                Thank you for submitting your security concern. Our team is reviewing your request to verify your identity and the nature of your concern. Once verified, you'll gain access to prioritized threat intelligence, real-time CVE data, and advanced security tools.
              </p>
            </div>
          </div>
        </div>

        {/* Limited Access Notice */}
        <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '24px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <span style={{ 
              fontSize: '1.5rem',
              background: darkTheme.warningGradient,
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>⚠️</span>
            <h3 style={{ fontSize: '1.125rem', fontWeight: '800', color: darkTheme.text, margin: 0 }}>
              Limited Access
            </h3>
          </div>
          <p style={{ color: darkTheme.textMuted, fontSize: '0.9375rem', lineHeight: '1.6', marginBottom: '1rem' }}>
            As a non-verified user, you have access to general security resources only. Verified users receive:
          </p>
          <ul style={{ 
            color: darkTheme.textMuted, 
            fontSize: '0.9375rem', 
            lineHeight: '1.8', 
            margin: 0, 
            paddingLeft: '1.5rem',
            listStyle: 'none'
          }}>
            {['Prioritized threat intelligence', 'Real-time CVE data and alerts', 'Advanced security reporting tools', 'AI-powered issue analysis', 'Community security issue posting'].map((item, idx) => (
              <li key={idx} style={{ marginBottom: '0.5rem', position: 'relative', paddingLeft: '1.5rem' }}>
                <span style={{ position: 'absolute', left: 0, color: darkTheme.primary }}>•</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* Threat Submission Form */}
          <div style={{
            background: darkTheme.card,
            border: `1px solid ${darkTheme.border}`,
            borderRadius: '24px',
            padding: '2rem'
          }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '800',
              color: darkTheme.text,
              marginBottom: '0.5rem',
              letterSpacing: '-0.02em'
            }}>
              Submit Security Threat
            </h2>
            <p style={{ color: darkTheme.textMuted, fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              1 Issue Limit - Low Priority
            </p>
            <ThreatSubmissionForm hasSubmitted={hasSubmittedIssue} onSubmitted={handleIssueSubmitted} />
          </div>

          {/* AI Chat Advisor */}
          <div style={{
            background: darkTheme.card,
            border: `1px solid ${darkTheme.border}`,
            borderRadius: '24px',
            padding: '2rem'
          }}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '800',
              color: darkTheme.text,
              marginBottom: '0.5rem',
              letterSpacing: '-0.02em'
            }}>
              AI Security Advisor
            </h2>
            <p style={{ color: darkTheme.textMuted, fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Limited features for non-verified users
            </p>
            <AIChatAdvisor />
          </div>
        </div>

        {/* Basic Resources */}
        <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '24px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '800',
            color: darkTheme.text,
            marginBottom: '1.5rem',
            letterSpacing: '-0.02em'
          }}>
            General Security Resources
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {[
              { title: 'CISA Cybersecurity Resources', desc: 'Comprehensive cybersecurity guidance and alerts for organizations.', link: 'https://www.cisa.gov/cybersecurity' },
              { title: 'National Vulnerability Database (NVD)', desc: 'Search and browse known security vulnerabilities maintained by NIST.', link: 'https://nvd.nist.gov/vuln/search' },
              { title: 'CISA Known Exploited Vulnerabilities', desc: 'Catalog of vulnerabilities actively exploited in the wild.', link: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog' }
            ].map((resource, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1.5rem',
                  background: darkTheme.surface,
                  border: `1px solid ${darkTheme.border}`,
                  borderRadius: '20px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = darkTheme.surfaceHover
                  e.currentTarget.style.borderColor = darkTheme.borderHover
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = darkTheme.surface
                  e.currentTarget.style.borderColor = darkTheme.border
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <h3 style={{ 
                  fontSize: '0.9375rem', 
                  fontWeight: '700',
                  color: darkTheme.text,
                  marginBottom: '0.75rem'
                }}>
                  {resource.title}
                </h3>
                <p style={{ color: darkTheme.textMuted, fontSize: '0.875rem', marginBottom: '1rem', lineHeight: '1.5' }}>
                  {resource.desc}
                </p>
                <a
                  href={resource.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: darkTheme.primary,
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  Visit →
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation Actions */}
        <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '24px',
          padding: '2rem',
          display: 'flex',
          gap: '1rem'
        }}>
          <button
            onClick={() => router.push('/dashboard/verified')}
            style={{
              flex: 1,
              padding: '1rem',
              fontSize: '0.9375rem',
              fontWeight: '700',
              background: darkTheme.successGradient,
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = `0 8px 24px ${darkTheme.success}40`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            View Verified Dashboard
          </button>
          <button
            onClick={() => router.push('/portal')}
            style={{
              flex: 1,
              padding: '1rem',
              fontSize: '0.9375rem',
              fontWeight: '700',
              background: darkTheme.surface,
              color: darkTheme.text,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '16px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = darkTheme.surfaceHover
              e.currentTarget.style.borderColor = darkTheme.borderHover
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = darkTheme.surface
              e.currentTarget.style.borderColor = darkTheme.border
            }}
          >
            Go to Portal
          </button>
        </div>
      </div>
    </main>
  )
}
