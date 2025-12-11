'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// API URL
const API_URL = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) 
  ? process.env.NEXT_PUBLIC_API_URL 
  : 'http://localhost:7070'

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

function VerificationRequestForm({ darkTheme }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('')
  const [organization, setOrganization] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !role.trim() || !reason.trim()) {
      setError('Please fill in all required fields')
      return
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const userId = localStorage.getItem('user_id') || localStorage.getItem('dashboard_user_id') || `temp-${Date.now()}`
      
      const requestData = {
        id: `req-${Date.now()}`,
        user_id: userId,
        name: name.trim(),
        email: email.trim(),
        role: role.trim(),
        organization: organization.trim(),
        reason: reason.trim(),
        status: 'pending',
        created_at: new Date().toISOString()
      }

      // Try backend endpoint first, fall back to localStorage if it doesn't exist
      try {
        const response = await fetch(`${API_URL}/admin/verification-requests`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        })

        if (response.ok) {
          // Backend endpoint exists and worked
          setSubmitted(true)
          setName('')
          setEmail('')
          setRole('')
          setOrganization('')
          setReason('')
          return
        }
      } catch (fetchErr) {
        // Backend endpoint doesn't exist or failed, use localStorage fallback
        console.log('Backend endpoint not available, using localStorage fallback')
      }

      // Fallback: Store in localStorage for admin to see
      const existingRequests = JSON.parse(localStorage.getItem('verification_requests') || '[]')
      existingRequests.push(requestData)
      localStorage.setItem('verification_requests', JSON.stringify(existingRequests))

      setSubmitted(true)
      setName('')
      setEmail('')
      setRole('')
      setOrganization('')
      setReason('')
    } catch (err) {
      setError(err.message || 'Failed to submit request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div style={{
        background: darkTheme.card,
        border: `1px solid ${darkTheme.border}`,
        borderRadius: '24px',
        padding: '2.5rem',
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: darkTheme.successGradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: '2rem'
        }}>
          ✓
        </div>
        <h2 style={{
          fontSize: '1.75rem',
          fontWeight: '800',
          color: darkTheme.text,
          marginBottom: '0.5rem',
          letterSpacing: '-0.02em'
        }}>
          Request Submitted!
        </h2>
        <p style={{ color: darkTheme.textMuted, fontSize: '0.9375rem', marginBottom: '2rem' }}>
          Your verification request has been submitted. An admin will review your request and you'll be notified once a decision is made.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          style={{
            padding: '0.75rem 2rem',
            background: darkTheme.primaryGradient,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '0.9375rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          Submit Another Request
        </button>
      </div>
    )
  }

  return (
    <div style={{
      background: darkTheme.card,
      border: `1px solid ${darkTheme.border}`,
      borderRadius: '24px',
      padding: '2.5rem',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{
          fontSize: '1.75rem',
          fontWeight: '800',
          color: darkTheme.text,
          marginBottom: '0.5rem',
          letterSpacing: '-0.02em'
        }}>
          Request Verification
        </h2>
        <p style={{ color: darkTheme.textMuted, fontSize: '0.9375rem' }}>
          Submit a request to become a verified user and unlock full access to advanced features
        </p>
      </div>

      <div style={{
        background: darkTheme.surface,
        border: `1px solid ${darkTheme.border}`,
        borderRadius: '20px',
        padding: '2rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '700',
          color: darkTheme.text,
          marginBottom: '1rem'
        }}>
          Benefits of Verification
        </h3>
        <ul style={{
          color: darkTheme.textMuted,
          fontSize: '0.9375rem',
          lineHeight: '1.8',
          margin: 0,
          paddingLeft: '1.5rem'
        }}>
          {[
            'Unlimited CVE submissions',
            'Prioritized threat intelligence',
            'Real-time CVE data and alerts',
            'Advanced security reporting tools',
            'AI-powered issue analysis',
            'Community security issue posting'
          ].map((item, idx) => (
            <li key={idx} style={{ marginBottom: '0.5rem' }}>{item}</li>
          ))}
        </ul>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: darkTheme.text,
            marginBottom: '0.5rem'
          }}>
            Full Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your full name"
            required
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              background: darkTheme.card,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '12px',
              color: darkTheme.text,
              fontSize: '0.9375rem',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = darkTheme.primary
              e.target.style.background = darkTheme.surface
            }}
            onBlur={(e) => {
              e.target.style.borderColor = darkTheme.border
              e.target.style.background = darkTheme.card
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: darkTheme.text,
            marginBottom: '0.5rem'
          }}>
            Email Address *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            required
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              background: darkTheme.card,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '12px',
              color: darkTheme.text,
              fontSize: '0.9375rem',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = darkTheme.primary
              e.currentTarget.style.background = darkTheme.surface
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = darkTheme.border
              e.currentTarget.style.background = darkTheme.card
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: darkTheme.text,
            marginBottom: '0.5rem'
          }}>
            Role/Title *
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g., Security Analyst, IT Manager, Researcher"
            required
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              background: darkTheme.card,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '12px',
              color: darkTheme.text,
              fontSize: '0.9375rem',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = darkTheme.primary
              e.target.style.background = darkTheme.surface
            }}
            onBlur={(e) => {
              e.target.style.borderColor = darkTheme.border
              e.target.style.background = darkTheme.card
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: darkTheme.text,
            marginBottom: '0.5rem'
          }}>
            Organization
          </label>
          <input
            type="text"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            placeholder="Your organization or company name"
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              background: darkTheme.card,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '12px',
              color: darkTheme.text,
              fontSize: '0.9375rem',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = darkTheme.primary
              e.target.style.background = darkTheme.surface
            }}
            onBlur={(e) => {
              e.target.style.borderColor = darkTheme.border
              e.target.style.background = darkTheme.card
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '600',
            color: darkTheme.text,
            marginBottom: '0.5rem'
          }}>
            Reason for Verification Request *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why you need verified access (e.g., your role, security responsibilities, research needs)"
            required
            rows={5}
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              background: darkTheme.card,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '12px',
              color: darkTheme.text,
              fontSize: '0.9375rem',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
              transition: 'all 0.3s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = darkTheme.primary
              e.target.style.background = darkTheme.surface
            }}
            onBlur={(e) => {
              e.target.style.borderColor = darkTheme.border
              e.target.style.background = darkTheme.card
            }}
          />
        </div>

        {error && (
          <div style={{
            padding: '1rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${darkTheme.danger}`,
            borderRadius: '12px',
            color: darkTheme.danger,
            fontSize: '0.875rem',
            marginBottom: '1.5rem'
          }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          style={{
            width: '100%',
            padding: '1rem 2rem',
            background: submitting ? darkTheme.surface : darkTheme.primaryGradient,
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            fontSize: '1rem',
            fontWeight: '700',
            cursor: submitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: submitting ? 'none' : '0 4px 20px rgba(234, 179, 8, 0.4)',
            opacity: submitting ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (!submitting) {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(234, 179, 8, 0.5)'
            }
          }}
          onMouseLeave={(e) => {
            if (!submitting) {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(234, 179, 8, 0.4)'
            }
          }}
        >
          {submitting ? 'Submitting...' : 'Submit Verification Request'}
        </button>
      </form>
    </div>
  )
}

function AIChatAdvisor() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I'm your security advisor. I can help you understand how to use this platform and provide general security guidance. What would you like to know?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = {
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
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const assistantMessage = {
        role: 'assistant',
        content: data.response || 'I apologize, but I could not process your request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      const errorMessage = {
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
      overflow: 'hidden',
      boxSizing: 'border-box'
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
        padding: '1rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxSizing: 'border-box'
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
              border: msg.role === 'assistant' ? `1px solid ${darkTheme.border}` : 'none',
              margin: 0,
              wordWrap: 'break-word',
              overflowWrap: 'break-word'
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
        padding: '1rem 1.5rem',
        borderTop: `1px solid ${darkTheme.border}`,
        display: 'flex',
        gap: '0.75rem',
        background: darkTheme.surface,
        boxSizing: 'border-box',
        flexShrink: 0
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

function ThreatSubmissionForm({ hasSubmitted, onSubmitted }) {
  const [threatDescription, setThreatDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
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
  const [activeTab, setActiveTab] = useState('verification')
  const [cveDescription, setCveDescription] = useState('')
  const [aiRecommendations, setAiRecommendations] = useState(null)
  const [loadingRecommendations, setLoadingRecommendations] = useState(false)
  // AI Chat state
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  // Cookie helper functions
  const getCookie = (name) => {
    if (typeof document === 'undefined') return null
    const cookies = document.cookie.split(';')
    const cookie = cookies.find(c => c.trim().startsWith(`${name}=`))
    return cookie ? cookie.split('=')[1] : null
  }

  // Check cookies on mount to route users appropriately
  useEffect(() => {
    const checkVerificationStatus = () => {
      // Check cookie first, then localStorage as fallback
      const cookieStatus = getCookie('user_verification_status')
      const localStorageStatus = typeof window !== 'undefined' ? localStorage.getItem('user_verified') : null
      
      // If user is verified, redirect to verified dashboard
      if (cookieStatus === 'verified' || localStorageStatus === 'true') {
        router.push('/dashboard/verified')
        return
      }
      
      // If no verification status found, redirect to portal
      if (!cookieStatus && !localStorageStatus) {
        router.push('/portal')
        return
      }
    }

    checkVerificationStatus()
  }, [router])

  // Safe localStorage helper
  const safeLocalStorage = {
    getItem: (key) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          return window.localStorage.getItem(key)
        } catch (e) {
          console.warn('localStorage.getItem failed:', e)
          return null
        }
      }
      return null
    },
    setItem: (key, value) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(key, value)
        } catch (e) {
          console.warn('localStorage.setItem failed:', e)
        }
      }
    }
  }

  useEffect(() => {
    const submitted = safeLocalStorage.getItem('non_verified_issue_submitted')
    if (submitted === 'true') {
      setHasSubmittedIssue(true)
    }
    setTimeout(() => setLoading(false), 1000)
  }, [])

  const handleIssueSubmitted = () => {
    setHasSubmittedIssue(true)
    safeLocalStorage.setItem('non_verified_issue_submitted', 'true')
  }

  const handleGetRecommendations = async () => {
    if (!cveDescription.trim()) return
    
    setLoadingRecommendations(true)
    setAiRecommendations(null)
    
    try {
      const response = await fetch(`${API_URL}/ai-rag/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `Please provide security recommendations for this CVE description: ${cveDescription}`,
          context: 'non_verified_advice',
          limit_features: true
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get recommendations')
      }

      const data = await response.json()
      setAiRecommendations(data.response || 'No recommendations available.')
    } catch (err) {
      let errorMsg = 'Error: Could not get recommendations. Please try again.'
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMsg = 'Request timed out. Please try again.'
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMsg = 'Network error: Unable to connect to the server. Please check your connection.'
        } else {
          errorMsg = `Error: ${err.message}`
        }
      }
      setAiRecommendations(errorMsg)
    } finally {
      setLoadingRecommendations(false)
    }
  }

  const handleChatSend = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userMessage = chatInput.trim()
    setChatInput('')
    
    // Add user message to chat
    const newUserMessage = { role: 'user', content: userMessage, timestamp: new Date() }
    setChatMessages(prev => [...prev, newUserMessage])
    setChatLoading(true)

    // Add timeout to prevent hanging
    const controller = new AbortController()
    let timeoutId = null

    try {
      // Simplified, more direct prompt
      const conversationPrompt = userMessage

      timeoutId = setTimeout(() => controller.abort(), 120000) // 120 second timeout (AI service may be slow, especially on first request)

      const response = await fetch(`${API_URL}/ai-rag/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: conversationPrompt,
          limit_features: true
        }),
        signal: controller.signal
      })

      if (timeoutId) clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      const aiMessage = { 
        role: 'assistant', 
        content: data.response || 'I apologize, but I could not generate a response. Please try again.',
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, aiMessage])
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId)
      let errorMsg = 'Sorry, I encountered an error. Please try again later.'
      if (err.name === 'AbortError') {
        errorMsg = 'Request timed out after 2 minutes. The AI service may be starting up or overloaded. Please wait a moment and try again, or check if the AI service is running.'
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        errorMsg = 'Network error: Unable to connect to the AI service. Please check if the service is running and try again.'
      } else if (err instanceof Error) {
        errorMsg = `Error: ${err.message}`
      }
      console.error('AI chat error:', err)
      const errorMessage = { 
        role: 'assistant', 
        content: errorMsg,
        timestamp: new Date()
      }
      setChatMessages(prev => [...prev, errorMessage])
    } finally {
      setChatLoading(false)
    }
  }

  // Initialize chat with welcome message
  useEffect(() => {
    if (activeTab === 'ai-chat' && chatMessages.length === 0) {
      setChatMessages([{
        role: 'assistant',
        content: 'Hello! I\'m your AI security advisor. Feel free to chat with me about anything - security threats, CVEs, general questions, or just have a conversation. I\'m here to help!\n\nYou can:\n• Ask me about security threats or CVEs\n• Get advice on security best practices\n• Learn about the platform\n• Just chat naturally\n\nWhat\'s on your mind?',
        timestamp: new Date()
      }])
    }
  }, [activeTab])

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
    <>
      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
        background: '#000000',
        color: '#f1f5f9'
      }}>
        {/* Top Header - Amber Banner with Navigation */}
        <header style={{
          background: darkTheme.primary,
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 12px rgba(234, 179, 8, 0.25)',
          flexWrap: 'nowrap',
          gap: '1rem',
          borderBottom: `1px solid ${darkTheme.borderHover}`,
          position: 'relative',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: '800', fontSize: '1.5rem', color: '#ffffff', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
              BioGate Non-Verified
            </span>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Get Verified', tab: 'verification' },
                { label: 'Submit CVE', tab: 'submit-cve' },
                { label: 'AI Chat', tab: 'ai-chat' }
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.path) {
                      router.push(item.path)
                    } else if (item.tab) {
                      setActiveTab(item.tab)
                    }
                  }}
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: (item.tab && activeTab === item.tab) ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                    color: (item.tab && activeTab === item.tab) ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9375rem',
                    fontWeight: (item.tab && activeTab === item.tab) ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!item.tab || activeTab !== item.tab) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.color = '#ffffff'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!item.tab || activeTab !== item.tab) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)'
                    }
                  }}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            <button
              onClick={() => router.push('/portal')}
              style={{
                padding: '0.625rem 1.25rem',
                background: 'rgba(0, 0, 0, 0.3)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '8px',
                fontSize: '0.9375rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)'
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Back to Portal
            </button>
          </div>
        </header>

        {/* Dashboard Content */}
        <main style={{
          flex: 1,
          padding: '2rem',
          background: '#000000',
          overflowY: 'auto'
        }}>
          {/* Page Header */}
          <div style={{ marginBottom: '2rem' }}>
            <p style={{
              color: '#94a3b8',
              fontSize: '0.9375rem',
              margin: 0
            }}>
              Limited access - Request verification for full features
            </p>
          </div>

          <div style={{ maxWidth: '1920px', margin: '0 auto' }}>
            {/* Tab Content */}
            {activeTab === 'verification' && <VerificationRequestForm darkTheme={darkTheme} />}

            {activeTab === 'submit-cve' && (
              <div style={{
                background: darkTheme.card,
                border: `1px solid ${darkTheme.border}`,
                borderRadius: '24px',
                padding: '2.5rem',
                maxWidth: '800px',
                margin: '0 auto'
              }}>
                <div style={{ marginBottom: '2rem' }}>
                  <h2 style={{
                    fontSize: '1.75rem',
                    fontWeight: '800',
                    color: darkTheme.text,
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.02em'
                  }}>
                    Submit CVE
                  </h2>
                  <p style={{ color: darkTheme.textMuted, fontSize: '0.9375rem' }}>
                    {hasSubmittedIssue 
                      ? 'You have already submitted 1 CVE. Get verified to submit unlimited CVEs.'
                      : 'Submit your security concern (1 CVE limit for non-verified users)'}
                  </p>
                </div>
                <ThreatSubmissionForm hasSubmitted={hasSubmittedIssue} onSubmitted={handleIssueSubmitted} />
              </div>
            )}

            {activeTab === 'ai-chat' && (
              <div style={{
                background: darkTheme.card,
                border: `1px solid ${darkTheme.border}`,
                borderRadius: '24px',
                padding: '0',
                maxWidth: '1000px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 200px)',
                minHeight: '600px',
                overflow: 'hidden',
                boxSizing: 'border-box'
              }}>
                {/* Chat Header */}
                <div style={{
                  padding: '1.5rem 2rem',
                  borderBottom: `1px solid ${darkTheme.border}`,
                  background: darkTheme.surface
                }}>
                  <h2 style={{
                    fontSize: '1.5rem',
                    fontWeight: '800',
                    color: darkTheme.text,
                    marginBottom: '0.25rem',
                    letterSpacing: '-0.02em'
                  }}>
                    AI Security Advisor
                  </h2>
                  <p style={{ color: darkTheme.textMuted, fontSize: '0.875rem', margin: 0 }}>
                    Ask me anything about CVEs, threats, security best practices, or how to use this platform
                  </p>
                </div>

                {/* Chat Messages */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  padding: '1rem 1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxSizing: 'border-box'
                }}>
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        alignItems: 'flex-start',
                        gap: '0.75rem'
                      }}
                    >
                      {msg.role === 'assistant' && (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: darkTheme.primaryGradient,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '0.875rem',
                          fontWeight: '700',
                          color: 'white'
                        }}>
                          AI
                        </div>
                      )}
                      <div style={{
                        maxWidth: '75%',
                        padding: '1rem 1.25rem',
                        background: msg.role === 'user' 
                          ? darkTheme.primaryGradient 
                          : darkTheme.surface,
                        borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                        color: msg.role === 'user' ? 'white' : darkTheme.text,
                        fontSize: '0.9375rem',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        wordWrap: 'break-word'
                      }}>
                        {msg.content}
                      </div>
                      {msg.role === 'user' && (
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: darkTheme.surfaceHover,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          fontSize: '0.875rem',
                          fontWeight: '700',
                          color: darkTheme.text,
                          border: `1px solid ${darkTheme.border}`
                        }}>
                          You
                        </div>
                      )}
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-start',
                      alignItems: 'flex-start',
                      gap: '0.75rem'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: darkTheme.primaryGradient,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid rgba(255,255,255,0.3)',
                          borderTopColor: 'white',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite'
                        }} />
                      </div>
                      <div style={{
                        padding: '1rem 1.25rem',
                        background: darkTheme.surface,
                        borderRadius: '16px 16px 16px 4px',
                        color: darkTheme.textMuted,
                        fontSize: '0.9375rem'
                      }}>
                        Thinking...
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <form onSubmit={handleChatSend} style={{
                  padding: '1rem 1.5rem',
                  borderTop: `1px solid ${darkTheme.border}`,
                  background: darkTheme.surface,
                  boxSizing: 'border-box',
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask me anything about CVEs, threats, or security..."
                      disabled={chatLoading}
                      style={{
                        flex: 1,
                        padding: '0.875rem 1.25rem',
                        background: darkTheme.card,
                        border: `1px solid ${darkTheme.border}`,
                        borderRadius: '16px',
                        fontSize: '0.9375rem',
                        fontFamily: 'inherit',
                        color: darkTheme.text,
                        outline: 'none',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = darkTheme.primary
                        e.target.style.background = darkTheme.surface
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = darkTheme.border
                        e.target.style.background = darkTheme.card
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim() || chatLoading}
                      style={{
                        padding: '0.875rem 1.75rem',
                        background: (!chatInput.trim() || chatLoading)
                          ? darkTheme.surfaceHover
                          : darkTheme.primaryGradient,
                        color: 'white',
                        border: 'none',
                        borderRadius: '16px',
                        fontSize: '0.9375rem',
                        fontWeight: '700',
                        cursor: (!chatInput.trim() || chatLoading) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        opacity: (!chatInput.trim() || chatLoading) ? 0.6 : 1
                      }}
                    >
                      Send
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}

