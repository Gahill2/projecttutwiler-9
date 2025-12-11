'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070'

// BioGate theme - Dark Stripe Dashboard + Forest Green Cyber Accents
const darkTheme = {
  // Stripe-inspired dark base colors
  bg: '#0a0a0a',
  bgGradient: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
  surface: '#161616',
  surfaceHover: '#1f1f1f',
  card: '#1a1a1a',
  cardHover: '#242424',
  border: 'rgba(22, 163, 74, 0.2)',
  borderLight: 'rgba(22, 163, 74, 0.1)',
  borderHover: 'rgba(22, 163, 74, 0.4)',
  // Clean text colors
  text: '#fafafa',
  textMuted: '#a3a3a3',
  textSubtle: '#737373',
  // Forest green accents (tactical, cybersecurity feel)
  primary: '#16a34a',
  primaryGradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
  primaryHover: '#22c55e',
  // Status colors
  success: '#16a34a',
  successGradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
  warning: '#eab308',
  warningGradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
  danger: '#ef4444',
  dangerGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
  green: '#16a34a',
  greenGradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
}

function AIChatAdvisor({ isVerified }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: isVerified 
        ? "Hello! I'm your security advisor. I can help you analyze threats and provide detailed security guidance."
        : "Hello! I'm your security advisor. I can help you understand how to use this platform and provide general security guidance. What would you like to know?",
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
    setMessages((prev) => [...prev, userMessage])
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
          context: isVerified ? 'verified' : 'non_verified_advice',
          limit_features: !isVerified
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      const assistantMessage = {
        role: 'assistant',
        content: data.response || 'I apologize, but I could not process your request.',
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, assistantMessage])
    } catch (err) {
      const errorMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again later.',
        timestamp: new Date()
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '400px',
      background: darkTheme.surface,
      border: `1px solid ${darkTheme.border}`,
      borderRadius: '20px',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '1rem 1.25rem',
        borderBottom: `1px solid ${darkTheme.border}`,
        background: darkTheme.card,
      }}>
        <h3 style={{
          fontSize: '0.9375rem',
          fontWeight: '700',
          color: darkTheme.text,
          margin: 0,
          letterSpacing: '-0.01em'
        }}>
          AI Security Advisor {!isVerified && '(Limited)'}
        </h3>
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        background: 'rgba(255, 255, 255, 0.01)'
      }}>
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '1rem 1.25rem',
              borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
              background: msg.role === 'user' 
                ? darkTheme.primaryGradient
                : 'rgba(255, 255, 255, 0.08)',
              color: msg.role === 'user' ? 'white' : darkTheme.text,
              fontSize: '0.9375rem',
              lineHeight: '1.6',
              fontWeight: msg.role === 'user' ? '500' : '400',
              boxShadow: msg.role === 'user' ? '0 4px 20px rgba(99, 102, 241, 0.3)' : '0 2px 10px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              if (msg.role !== 'user') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }
            }}
            onMouseLeave={(e) => {
              if (msg.role !== 'user') {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.transform = 'translateY(0)'
              }
            }}
          >
            {msg.content}
          </div>
        ))}
        {loading && (
          <div style={{
            alignSelf: 'flex-start',
            padding: '1rem 1.25rem',
            borderRadius: '20px 20px 20px 4px',
            background: darkTheme.cardHover,
            border: `1px solid ${darkTheme.border}`,
            color: darkTheme.textMuted,
            fontSize: '0.9375rem',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              border: `2px solid ${darkTheme.primary}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            Thinking...
          </div>
        )}
      </div>
      <form onSubmit={handleSend} style={{
        padding: '1rem 1.25rem',
        borderTop: `1px solid ${darkTheme.border}`,
        background: darkTheme.card,
        display: 'flex',
        gap: '0.75rem'
      }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isVerified ? "Ask about security threats..." : "Ask about the platform..."}
          disabled={loading}
          style={{
            flex: 1,
            padding: '0.875rem 1rem',
            border: `1px solid ${darkTheme.border}`,
            borderRadius: '16px',
            fontSize: '0.9375rem',
            background: darkTheme.card,
            color: darkTheme.text,
            fontWeight: '500',
            transition: 'all 0.3s ease',
            outline: 'none'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = darkTheme.primary
            e.target.style.background = 'rgba(255, 255, 255, 0.08)'
            e.target.style.transform = 'scale(1.02)'
            e.target.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.2)'
          }}
          onBlur={(e) => {
            e.target.style.borderColor = darkTheme.border
            e.target.style.background = 'rgba(255, 255, 255, 0.05)'
            e.target.style.transform = 'scale(1)'
            e.target.style.boxShadow = 'none'
          }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          style={{
            padding: '0.875rem 1.5rem',
            background: (!input.trim() || loading) 
              ? 'rgba(255, 255, 255, 0.05)' 
              : darkTheme.primaryGradient,
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
            fontSize: '0.9375rem',
            fontWeight: '700',
            transition: 'all 0.3s ease',
            boxShadow: (!input.trim() || loading) ? 'none' : '0 4px 20px rgba(99, 102, 241, 0.4)',
            whiteSpace: 'nowrap'
          }}
          onMouseEnter={(e) => {
            if (input.trim() && !loading) {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.5)'
            }
          }}
          onMouseLeave={(e) => {
            if (input.trim() && !loading) {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4)'
            }
          }}
        >
          {loading ? 'Sending...' : 'Send →'}
        </button>
      </form>
    </div>
  )
}

function IssueUploadForm({ 
  onIssueUploaded, 
  isVerified, 
  hasSubmitted, 
  onSubmitted 
}) {
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description.trim() || (!isVerified && hasSubmitted)) return

    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`${API_URL}/portal/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: isVerified ? 'Verified User' : 'Non-Verified User',
          role: isVerified ? 'Verified Security Professional' : 'General User',
          problem: description,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit issue')
      }

      const data = await response.json()
      
      // Store user_id from backend if returned (from portal submission)
      // Backend returns 'UserId' (capital U) in JSON
      const userIdFromResponse = data.user_id || data.userId || data.UserId
      if (userIdFromResponse) {
        localStorage.setItem('user_id', userIdFromResponse)
        localStorage.setItem('dashboard_user_id', userIdFromResponse)
        // Note: setUserId is handled in the parent component's useEffect
      }
      
      let severity = 'Low'
      let cvssScore
      let similarCves = []

      if (isVerified) {
        const analysisResponse = await fetch(`${API_URL}/ai-rag/analyze-threat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: description,
            top_k: 5
          }),
        })

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json()
          
          if (analysisData.score_bin) {
            const scoreRange = analysisData.score_bin.split('-').map(parseFloat)
            const avgScore = (scoreRange[0] + scoreRange[1]) / 2
            cvssScore = avgScore * 10
            
            if (cvssScore >= 9.0) severity = 'Critical'
            else if (cvssScore >= 7.0) severity = 'High'
            else if (cvssScore >= 4.0) severity = 'Moderate'
            else severity = 'Low'
          }

          if (analysisData.similar_cves) {
            similarCves = analysisData.similar_cves
          }
        }
      }

      // Store CVE in database for admin viewing (only for verified users)
      if (isVerified) {
        try {
          // Get userId from localStorage (set above if returned from portal)
          const storedUserId = userIdFromResponse || localStorage.getItem('user_id') || localStorage.getItem('dashboard_user_id')
          
          if (storedUserId) {
            // Convert user ID to GUID format for backend
            // Handle different ID formats: GUID, temp-*, user-*
            let userIdGuid = null
            
            // If it's already a GUID format (from portal), use it directly
            if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storedUserId)) {
              userIdGuid = storedUserId
            } else if (storedUserId.startsWith('temp-') || storedUserId.startsWith('user-')) {
              // Temporary or legacy ID - backend will create new user
              userIdGuid = null
            } else {
              // Try to extract GUID if it's embedded
              const guidMatch = storedUserId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
              userIdGuid = guidMatch ? guidMatch[0] : null
            }
            
            await fetch(`${API_URL}/cve/submit`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: userIdGuid || undefined, // Backend will create new user if null
                description,
                cvssScore: cvssScore,
                similarCves: similarCves.map(cve => ({
                  id: cve.id,
                  score: cve.score,
                  description: cve.description
                }))
              }),
            })
          }
        } catch (err) {
          console.error('Failed to store CVE in database:', err)
          // Continue anyway - don't block the UI
        }
      }

      const newIssue = {
        id: `issue-${Date.now()}`,
        description,
        severity,
        cvssScore,
        submittedAt: new Date(),
        similarCves
      }

      onIssueUploaded(newIssue)
      setDescription('')
      if (!isVerified) {
        onSubmitted()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit issue')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {!isVerified && hasSubmitted && (
        <div style={{
          padding: '1rem',
          background: 'rgba(245, 158, 11, 0.1)',
          border: `1px solid rgba(245, 158, 11, 0.3)`,
          borderRadius: '16px',
          color: darkTheme.warning,
          fontSize: '0.875rem',
          fontWeight: '600'
        }}>
          Limit reached (1/1). Get verified for unlimited uploads.
        </div>
      )}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder={isVerified ? "Describe the security issue or CVE..." : "Describe your security threat..."}
        disabled={submitting || (!isVerified && hasSubmitted)}
        style={{
          width: '100%',
          minHeight: '120px',
          padding: '1rem 1.25rem',
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '16px',
          fontSize: '0.9375rem',
          fontFamily: 'inherit',
          resize: 'vertical',
          background: darkTheme.card,
          color: darkTheme.text,
          fontWeight: '500',
          opacity: (!isVerified && hasSubmitted) ? 0.6 : 1,
          transition: 'all 0.3s ease',
          outline: 'none'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = darkTheme.primary
          e.target.style.background = 'rgba(255, 255, 255, 0.08)'
          e.target.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.2)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = darkTheme.border
          e.target.style.background = 'rgba(255, 255, 255, 0.05)'
          e.target.style.boxShadow = 'none'
        }}
      />
      {error && (
        <div style={{
          padding: '1rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: `1px solid rgba(239, 68, 68, 0.3)`,
          borderRadius: '16px',
          color: darkTheme.danger,
          fontSize: '0.875rem',
          fontWeight: '500',
          animation: 'slideIn 0.3s ease'
        }}>
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={!description.trim() || submitting || (!isVerified && hasSubmitted)}
        style={{
          width: '100%',
          padding: '1rem 1.5rem',
          fontSize: '0.9375rem',
          fontWeight: '700',
          background: (!description.trim() || submitting || (!isVerified && hasSubmitted))
            ? 'rgba(255, 255, 255, 0.05)'
            : (isVerified ? darkTheme.successGradient : darkTheme.warningGradient),
          color: 'white',
          border: 'none',
          borderRadius: '16px',
          cursor: (!description.trim() || submitting || (!isVerified && hasSubmitted)) ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: (!description.trim() || submitting || (!isVerified && hasSubmitted))
            ? 'none'
            : '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}
        onMouseEnter={(e) => {
          if (description.trim() && !submitting && !(!isVerified && hasSubmitted)) {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.4)'
          }
        }}
        onMouseLeave={(e) => {
          if (description.trim() && !submitting && !(!isVerified && hasSubmitted)) {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)'
          }
        }}
      >
        {!isVerified && hasSubmitted ? 'Limit Reached (1/1)' : submitting ? 'Submitting...' : isVerified ? 'Upload Issue/CVE →' : 'Submit Threat (Low Priority) →'}
      </button>
    </form>
  )
}

const IssueCard = ({ 
  issue, 
  isVerified,
  onChatClick, 
  onRequestAdmin 
}) => {
  const severityStyles = {
    Critical: { 
      bg: 'rgba(239, 68, 68, 0.15)', 
      border: 'rgba(239, 68, 68, 0.4)', 
      badge: darkTheme.dangerGradient,
      text: '#fca5a5'
    },
    High: { 
      bg: 'rgba(245, 158, 11, 0.15)', 
      border: 'rgba(245, 158, 11, 0.4)', 
      badge: darkTheme.warningGradient,
      text: '#fbbf24'
    },
    Moderate: { 
      bg: 'rgba(5, 150, 105, 0.15)', 
      border: 'rgba(5, 150, 105, 0.4)', 
      badge: darkTheme.primaryGradient,
      text: '#6ee7b7'
    },
    Low: { 
      bg: 'rgba(100, 116, 139, 0.15)', 
      border: 'rgba(100, 116, 139, 0.4)', 
      badge: 'rgba(100, 116, 139, 0.3)',
      text: darkTheme.textMuted
    }
  }

  const style = severityStyles[issue.severity]

  return (
    <div style={{
      padding: '1.5rem',
      border: `1px solid ${style.border}`,
      borderRadius: '20px',
      background: darkTheme.surface,
      marginBottom: '1rem',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
      e.currentTarget.style.borderColor = style.border.replace('0.4', '0.6')
      e.currentTarget.style.transform = 'translateY(-4px)'
      e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.3)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
      e.currentTarget.style.borderColor = style.border
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)'
    }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{
            padding: '0.5rem 1rem',
            borderRadius: '12px',
            background: style.badge,
            color: 'white',
            fontSize: '0.75rem',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
          }}>
            {issue.severity}
          </span>
          {issue.cvssScore && (
            <span style={{ 
              padding: '0.5rem 1rem',
              fontSize: '0.8125rem', 
              fontWeight: '600',
              color: darkTheme.text,
              background: darkTheme.card,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '12px'
            }}>
              CVSS: {issue.cvssScore.toFixed(1)}
            </span>
          )}
        </div>
        <div style={{ 
          fontSize: '0.75rem', 
          color: darkTheme.textMuted, 
          fontFamily: 'monospace',
          padding: '0.5rem 0.75rem',
          background: darkTheme.surface,
          borderRadius: '8px'
        }}>
          {issue.id}
        </div>
      </div>
      <div style={{ 
        fontSize: '0.9375rem', 
        color: darkTheme.text, 
        lineHeight: '1.7',
        marginBottom: '1rem',
        fontWeight: '500'
      }}>
        {issue.description}
      </div>
      <div style={{ 
        fontSize: '0.8125rem', 
        color: darkTheme.textMuted,
        marginBottom: issue.similarCves && issue.similarCves.length > 0 ? '1rem' : '0'
      }}>
        {issue.submittedAt.toLocaleString()}
      </div>
      {issue.similarCves && issue.similarCves.length > 0 && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${darkTheme.border}` }}>
          <div style={{ fontSize: '0.8125rem', fontWeight: '700', color: darkTheme.text, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Similar CVEs
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {issue.similarCves?.map((cve, idx) => (
              <div key={idx} style={{
                padding: '0.75rem 1rem',
                background: darkTheme.surface,
                border: `1px solid ${darkTheme.border}`,
                borderRadius: '12px',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                e.currentTarget.style.borderColor = darkTheme.borderHover
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                e.currentTarget.style.borderColor = darkTheme.border
              }}
              >
                <div style={{ fontWeight: '700', color: darkTheme.text, fontSize: '0.8125rem', marginBottom: '0.25rem' }}>{cve.id}</div>
                <div style={{ color: darkTheme.textMuted, fontSize: '0.75rem', lineHeight: '1.5', marginBottom: '0.25rem' }}>{cve.description}</div>
                <div style={{ color: darkTheme.primary, fontSize: '0.75rem', fontWeight: '600' }}>
                  Similarity: {(cve.score * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {isVerified && (
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${darkTheme.border}` }}>
          <button
            onClick={() => onChatClick(issue.id)}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '700',
              background: darkTheme.primaryGradient,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 15px rgba(22, 163, 74, 0.25)'
            }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(22, 163, 74, 0.35)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(5, 150, 105, 0.3)'
        }}
          >
            Chat with AI
          </button>
          <button
            onClick={() => onRequestAdmin(issue.id)}
            style={{
              padding: '0.75rem 1.5rem',
              fontSize: '0.875rem',
              fontWeight: '700',
              background: darkTheme.card,
              color: darkTheme.text,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.borderColor = darkTheme.primary + '40'
              e.currentTarget.style.transform = 'translateY(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.borderColor = darkTheme.border
              e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Request Admin
          </button>
        </div>
      )}
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


export default function UnifiedDashboard() {
  const router = useRouter()
  const [isVerified, setIsVerified] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadedIssues, setUploadedIssues] = useState([])
  const [filterSeverity, setFilterSeverity] = useState('All')

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
      
      // Route based on verification status
      if (cookieStatus === 'verified' || localStorageStatus === 'true') {
        router.push('/dashboard/verified')
        return
      } else if (cookieStatus === 'non-verified' || localStorageStatus === 'false') {
        router.push('/dashboard/non-verified')
        return
      } else {
        // If no verification status found, redirect to portal
        router.push('/portal')
        return
      }
    }

    checkVerificationStatus()
  }, [router])
  const [chatIssueId, setChatIssueId] = useState(null)
  const [adminRequestIssueId, setAdminRequestIssueId] = useState(null)
  const [hasSubmittedIssue, setHasSubmittedIssue] = useState(false)
  const [recentCves, setRecentCves] = useState([])
  const [userId, setUserId] = useState(null)
  const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    // Check verification status (simplified - in real app, check from backend)
    const checkVerification = () => {
      // Check localStorage or make API call
      const verified = localStorage.getItem('user_verified') === 'true'
      setIsVerified(verified)
      
      // Get user ID from portal submission, or create a new one if visiting dashboard directly
      // Priority: user_id (from portal) > dashboard_user_id (legacy) > generate new
      let storedUserId = localStorage.getItem('user_id') || localStorage.getItem('dashboard_user_id')
      if (!storedUserId) {
        // If no user ID exists, user hasn't gone through portal yet
        // Generate a temporary ID that will be replaced when they submit through portal
        storedUserId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        localStorage.setItem('dashboard_user_id', storedUserId)
      }
      setUserId(storedUserId)
      
      const submitted = localStorage.getItem('non_verified_issue_submitted')
      if (submitted === 'true') {
        setHasSubmittedIssue(true)
      }
    }
    
    checkVerification()
    
    const fetchData = async () => {
      try {
        const cveResponse = await fetch(`${API_URL}/cve-ingestor/cves/recent?limit=5`)
        if (cveResponse.ok) {
          const cveData = await cveResponse.json()
          setRecentCves(cveData.cves || [])
        }
      } catch (err) {
        console.error('Error fetching CVE data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleIssueUploaded = (issue) => {
    setUploadedIssues((prev) => [issue, ...prev])
  }

  const handleIssueSubmitted = () => {
    setHasSubmittedIssue(true)
    localStorage.setItem('non_verified_issue_submitted', 'true')
  }

  const filteredIssues = filterSeverity === 'All' 
    ? uploadedIssues 
    : uploadedIssues.filter((issue) => issue.severity === filterSeverity)

    const severityCounts = {
    Critical: uploadedIssues.filter((i) => i.severity === 'Critical').length,
    High: uploadedIssues.filter((i) => i.severity === 'High').length,
    Moderate: uploadedIssues.filter((i) => i.severity === 'Moderate').length,
    Low: uploadedIssues.filter((i) => i.severity === 'Low').length
  }

  if (loading) {
    return <main style={{
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
  }

  return (
    <>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#000000',
      color: '#f1f5f9'
    }}>
        {/* Top Header - Green Banner with Navigation */}
        <header style={{
          background: darkTheme.primary,
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 12px rgba(22, 163, 74, 0.25)',
          borderBottom: `1px solid ${darkTheme.borderHover}`,
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <span style={{ fontWeight: '800', fontSize: '1.5rem', color: '#ffffff', letterSpacing: '-0.02em' }}>
              {isVerified ? 'BioGate Verified' : 'BioGate Non-Verified'}
            </span>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {[
                ...(isVerified ? [
                  { label: 'Dashboard', tab: 'dashboard' },
                  { label: 'Issues', tab: 'issues' },
                  { label: 'AI Advisor', tab: 'ai-advisor' }
                ] : [
                  { label: 'Dashboard', tab: 'dashboard' },
                  { label: 'Submit Threat', tab: 'issues' },
                  { label: 'AI Advisor', tab: 'ai-advisor' }
                ])
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.tab) {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              onClick={() => router.push('/portal')}
              style={{
                padding: '0.625rem 1.25rem',
                background: isVerified ? 'rgba(22, 163, 74, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                color: isVerified ? '#16a34a' : '#eab308',
                border: `1px solid ${isVerified ? 'rgba(22, 163, 74, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`,
                borderRadius: '8px',
                fontSize: '0.9375rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = isVerified ? 'rgba(22, 163, 74, 0.3)' : 'rgba(234, 179, 8, 0.3)'
                e.currentTarget.style.borderColor = isVerified ? 'rgba(22, 163, 74, 0.6)' : 'rgba(234, 179, 8, 0.6)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isVerified ? 'rgba(22, 163, 74, 0.2)' : 'rgba(234, 179, 8, 0.2)'
                e.currentTarget.style.borderColor = isVerified ? 'rgba(22, 163, 74, 0.4)' : 'rgba(234, 179, 8, 0.4)'
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
              {isVerified ? 'Full access with AI analysis and threat intelligence' : 'Limited access - 1 issue upload'}
            </p>
          </div>

          <div style={{ maxWidth: '1920px', margin: '0 auto' }}>
          {/* Tab Content */}
          {activeTab === 'dashboard' && (
            <>
          {/* Key Metrics Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {/* Critical Threats Card */}
            <div style={{
              background: darkTheme.card,
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '2rem',
              borderRadius: '24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(239, 68, 68, 0.3)'
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)'
            }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '120px',
                height: '120px',
                background: 'radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, transparent 70%)',
                borderRadius: '50%',
                transform: 'translate(30%, -30%)'
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontSize: '0.75rem',
                  color: darkTheme.textMuted,
                  fontWeight: '700',
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Critical Threats
                </div>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: '800',
                  background: darkTheme.dangerGradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '0.5rem',
                  lineHeight: 1,
                  letterSpacing: '-0.03em'
                }}>
                  {severityCounts.Critical}
                </div>
                <div style={{
                  fontSize: '0.8125rem',
                  color: darkTheme.textMuted,
                  fontWeight: '600'
                }}>
                  Requires immediate attention
                </div>
              </div>
            </div>
            {/* High Threats Card */}
            <div style={{
              background: darkTheme.card,
              border: '1px solid rgba(245, 158, 11, 0.3)',
              padding: '2rem',
              borderRadius: '24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(245, 158, 11, 0.3)'
              e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)'
              e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)'
            }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '120px',
                height: '120px',
                background: 'radial-gradient(circle, rgba(245, 158, 11, 0.2) 0%, transparent 70%)',
                borderRadius: '50%',
                transform: 'translate(30%, -30%)'
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontSize: '0.75rem',
                  color: darkTheme.textMuted,
                  fontWeight: '700',
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  High Threats
                </div>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: '800',
                  background: darkTheme.warningGradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '0.5rem',
                  lineHeight: 1,
                  letterSpacing: '-0.03em'
                }}>
                  {severityCounts.High}
                </div>
                <div style={{
                  fontSize: '0.8125rem',
                  color: darkTheme.textMuted,
                  fontWeight: '600'
                }}>
                  High priority items
                </div>
              </div>
            </div>

            {/* Total Issues Card */}
            <div style={{
              background: darkTheme.card,
              border: `1px solid ${darkTheme.border}`,
              padding: '2rem',
              borderRadius: '24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(22, 163, 74, 0.25)'
              e.currentTarget.style.borderColor = darkTheme.primary + '40'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)'
              e.currentTarget.style.borderColor = darkTheme.border
            }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '120px',
                height: '120px',
                background: `radial-gradient(circle, rgba(22, 163, 74, 0.12) 0%, transparent 70%)`,
                borderRadius: '50%',
                transform: 'translate(30%, -30%)'
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontSize: '0.75rem',
                  color: darkTheme.textMuted,
                  fontWeight: '700',
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Total Issues
                </div>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: '800',
                  background: darkTheme.primaryGradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '0.5rem',
                  lineHeight: 1,
                  letterSpacing: '-0.03em'
                }}>
                  {uploadedIssues.length}
                </div>
                <div style={{
                  fontSize: '0.8125rem',
                  color: darkTheme.textMuted,
                  fontWeight: '600'
                }}>
                  All tracked issues
                </div>
              </div>
            </div>

            {/* Operations Card */}
            <div style={{
              background: darkTheme.card,
              border: `1px solid ${darkTheme.border}`,
              padding: '2rem',
              borderRadius: '24px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(22, 163, 74, 0.25)'
              e.currentTarget.style.borderColor = darkTheme.primary + '40'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)'
              e.currentTarget.style.borderColor = darkTheme.border
            }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '120px',
                height: '120px',
                background: `radial-gradient(circle, rgba(22, 163, 74, 0.12) 0%, transparent 70%)`,
                borderRadius: '50%',
                transform: 'translate(30%, -30%)'
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  fontSize: '0.75rem',
                  color: darkTheme.textMuted,
                  fontWeight: '700',
                  marginBottom: '1rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Operations
                </div>
                <div style={{
                  fontSize: '3rem',
                  fontWeight: '800',
                  background: darkTheme.primaryGradient,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '0.5rem',
                  lineHeight: 1,
                  letterSpacing: '-0.03em'
                }}>
                  {severityCounts.Moderate + severityCounts.Low}
                </div>
                <div style={{
                  fontSize: '0.8125rem',
                  color: darkTheme.textMuted,
                  fontWeight: '600'
                }}>
                  Moderate & Low priority
                </div>
              </div>
            </div>
          </div>

          {/* Bento Grid Layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {/* Issue Upload */}
            <div style={{
              background: darkTheme.card,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '24px',
              padding: '2rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.3s ease'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '800',
                color: darkTheme.text,
                marginBottom: '1.5rem',
                letterSpacing: '-0.02em'
              }}>
                {isVerified ? 'Upload Issue/CVE' : 'Submit Threat (1 Limit)'}
              </h2>
              <IssueUploadForm 
                onIssueUploaded={handleIssueUploaded}
                isVerified={isVerified}
                hasSubmitted={hasSubmittedIssue}
                onSubmitted={handleIssueSubmitted}
              />
            </div>

            {/* AI Chat */}
            <div style={{
              background: darkTheme.card,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '24px',
              padding: '2rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
              transition: 'all 0.3s ease'
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: '800',
                color: darkTheme.text,
                marginBottom: '1.5rem',
                letterSpacing: '-0.02em'
              }}>
                AI Advisor {!isVerified && '(Limited)'}
              </h2>
              <AIChatAdvisor isVerified={isVerified} />
            </div>
          </div>

          {/* Issues List */}
          {uploadedIssues.length > 0 && (
            <div style={{
              background: darkTheme.card,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '24px',
              padding: '2rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
              marginBottom: '1.5rem'
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ 
                fontSize: '1.5rem', 
                fontWeight: '800', 
                color: darkTheme.text, 
                margin: 0,
                letterSpacing: '-0.02em'
              }}>
                Your Issues
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {['All', 'Critical', 'High', 'Moderate', 'Low'].map(severity => (
                  <button
                    key={severity}
                    onClick={() => setFilterSeverity(severity)}
                    style={{
                      padding: '0.625rem 1.25rem',
                      fontSize: '0.8125rem',
                      fontWeight: '700',
                      background: filterSeverity === severity ? darkTheme.primaryGradient : 'rgba(255, 255, 255, 0.05)',
                      color: filterSeverity === severity ? 'white' : darkTheme.textMuted,
                      border: filterSeverity === severity ? 'none' : `1px solid ${darkTheme.border}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: filterSeverity === severity ? '0 4px 15px rgba(22, 163, 74, 0.25)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (filterSeverity !== severity) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                        e.currentTarget.style.borderColor = darkTheme.borderHover
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (filterSeverity !== severity) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                        e.currentTarget.style.borderColor = darkTheme.border
                      }
                    }}
                  >
                    {severity}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ maxHeight: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
              {filteredIssues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  isVerified={isVerified}
                  onChatClick={setChatIssueId}
                  onRequestAdmin={setAdminRequestIssueId}
                />
              ))}
            </div>
          </div>
        )}

          {/* Recent CVEs */}
          {isVerified && recentCves.length > 0 && (
            <div style={{
              background: darkTheme.card,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '24px',
              padding: '2rem',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
            }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: darkTheme.text,
                marginBottom: '1.5rem',
                letterSpacing: '-0.02em'
              }}>
                Recent CVEs
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {recentCves.map((cve, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '1rem 1.25rem',
                      border: `1px solid ${darkTheme.border}`,
                      borderRadius: '16px',
                      background: darkTheme.surface,
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                      e.currentTarget.style.borderColor = darkTheme.borderHover
                      e.currentTarget.style.transform = 'translateX(4px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                      e.currentTarget.style.borderColor = darkTheme.border
                      e.currentTarget.style.transform = 'translateX(0)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ fontWeight: '700', color: darkTheme.text, fontSize: '0.9375rem' }}>
                        {cve.id || `CVE-${idx + 1}`}
                      </div>
                      {cve.cvss_score && (
                        <span style={{
                          padding: '0.5rem 1rem',
                          borderRadius: '12px',
                          background: cve.cvss_score >= 7 ? darkTheme.dangerGradient : darkTheme.warningGradient,
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                        }}>
                          CVSS {cve.cvss_score}
                        </span>
                      )}
                    </div>
                    <div style={{ color: darkTheme.textMuted, fontSize: '0.875rem', lineHeight: '1.6', fontWeight: '500' }}>
                      {cve.description || cve.summary || 'No description'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
            </>
          )}

          {activeTab === 'issues' && (
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <div style={{
                background: darkTheme.card,
                border: `1px solid ${darkTheme.border}`,
                borderRadius: '24px',
                padding: '2rem',
                marginBottom: '2rem'
              }}>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: darkTheme.text,
                  marginBottom: '1rem',
                  letterSpacing: '-0.02em'
                }}>
                  {isVerified ? 'Your Security Issues' : 'Submit Security Threat'}
                </h2>
                {isVerified ? (
                  <div>
                    <p style={{ color: darkTheme.textMuted, marginBottom: '1.5rem' }}>
                      View and manage your submitted security issues
                    </p>
                    {uploadedIssues.length === 0 ? (
                      <div style={{
                        padding: '3rem',
                        textAlign: 'center',
                        color: darkTheme.textMuted
                      }}>
                        <p style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>No issues submitted yet</p>
                        <p style={{ fontSize: '0.9375rem' }}>Submit your first security issue to get started</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {uploadedIssues.map((issue) => (
                          <IssueCard
                            key={issue.id}
                            issue={issue}
                            isVerified={isVerified}
                            onChatClick={setChatIssueId}
                            onRequestAdmin={setAdminRequestIssueId}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <ThreatSubmissionForm hasSubmitted={hasSubmittedIssue} onSubmitted={handleIssueSubmitted} />
                )}
              </div>
            </div>
          )}

          {activeTab === 'ai-advisor' && (
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              <AIChatAdvisor isVerified={isVerified} />
            </div>
          )}
          </div>
        </main>
      </div>
    </>
  )
}

