'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070'

interface UploadedIssue {
  id: string
  description: string
  severity: 'Critical' | 'High' | 'Moderate' | 'Low'
  cvssScore?: number
  submittedAt: Date
  similarCves?: Array<{
    id: string
    score: number
    description: string
  }>
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// BioGate theme - Green and Black
const darkTheme = {
  bg: '#000000',
  bgGradient: 'linear-gradient(135deg, #000000 0%, #0a1a0a 50%, #000000 100%)',
  surface: 'rgba(16, 32, 16, 0.6)',
  surfaceHover: 'rgba(16, 32, 16, 0.8)',
  glass: 'rgba(16, 185, 129, 0.1)',
  glassBorder: 'rgba(16, 185, 129, 0.2)',
  border: 'rgba(16, 185, 129, 0.3)',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
    primary: '#059669',
    primaryGradient: '#059669',
    success: '#059669',
    successGradient: '#059669',
  warning: '#f59e0b',
  warningGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  danger: '#ef4444',
  dangerGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    green: '#059669',
    greenGradient: '#059669'
}

function AIChatAdvisor({ isVerified }: { isVerified: boolean }) {
  const [messages, setMessages] = useState<Message[]>([
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
          context: isVerified ? 'verified' : 'non_verified_advice',
          limit_features: !isVerified
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response || 'I apologize, but I could not process your request.',
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
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: `1px solid ${darkTheme.glassBorder}`,
      borderRadius: '20px',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '1rem 1.25rem',
        borderBottom: `1px solid ${darkTheme.glassBorder}`,
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)'
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
              backdropFilter: msg.role !== 'user' ? 'blur(10px)' : 'none',
              WebkitBackdropFilter: msg.role !== 'user' ? 'blur(10px)' : 'none',
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
            background: 'rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: `1px solid ${darkTheme.glassBorder}`,
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
        borderTop: `1px solid ${darkTheme.glassBorder}`,
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
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
            border: `1px solid ${darkTheme.glassBorder}`,
            borderRadius: '16px',
            fontSize: '0.9375rem',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
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
            e.target.style.borderColor = darkTheme.glassBorder
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
}: { 
  onIssueUploaded: (issue: UploadedIssue) => void
  isVerified: boolean
  hasSubmitted: boolean
  onSubmitted: () => void
}) {
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
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
        setUserId(userIdFromResponse)
      }
      
      let severity: 'Critical' | 'High' | 'Moderate' | 'Low' = 'Low'
      let cvssScore: number | undefined
      let similarCves: Array<{ id: string; score: number; description: string }> = []

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
      if (isVerified && userId) {
        try {
          // Convert user ID to GUID format for backend
          // Handle different ID formats: GUID, temp-*, user-*
          let userIdGuid: string | null = null
          
          // If it's already a GUID format (from portal), use it directly
          if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
            userIdGuid = userId
          } else if (userId.startsWith('temp-') || userId.startsWith('user-')) {
            // Temporary or legacy ID - backend will create new user
            userIdGuid = null
          } else {
            // Try to extract GUID if it's embedded
            const guidMatch = userId.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)
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
        } catch (err) {
          console.error('Failed to store CVE in database:', err)
          // Continue anyway - don't block the UI
        }
      }

      const newIssue: UploadedIssue = {
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
          border: `1px solid ${darkTheme.glassBorder}`,
          borderRadius: '16px',
          fontSize: '0.9375rem',
          fontFamily: 'inherit',
          resize: 'vertical',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
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
          e.target.style.borderColor = darkTheme.glassBorder
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

function IssueCard({ 
  issue, 
  isVerified,
  onChatClick, 
  onRequestAdmin 
}: { 
  issue: UploadedIssue
  isVerified: boolean
  onChatClick: (issueId: string) => void
  onRequestAdmin: (issueId: string) => void
}) {
  const severityColors = {
    Critical: { bg: '#7f1d1d', border: darkTheme.danger, text: '#fca5a5' },
    High: { bg: '#78350f', border: darkTheme.warning, text: '#fbbf24' },
    Moderate: { bg: '#1e3a8a', border: darkTheme.primary, text: '#93c5fd' },
    Low: { bg: '#1e293b', border: darkTheme.border, text: darkTheme.textMuted }
  }

  const color = severityColors[issue.severity]

  return (
    <div style={{
      padding: '1rem',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      background: 'white',
      marginBottom: '0.75rem',
      transition: 'all 0.2s ease',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background = '#f8fafc'
      e.currentTarget.style.borderColor = '#cbd5e1'
      e.currentTarget.style.transform = 'translateY(-2px)'
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'white'
      e.currentTarget.style.borderColor = '#e2e8f0'
      e.currentTarget.style.transform = 'translateY(0)'
      e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.05)'
    }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '6px',
              backgroundColor: issue.severity === 'Critical' ? '#fef2f2' : issue.severity === 'High' ? '#fef3c7' : issue.severity === 'Moderate' ? '#dbeafe' : '#f1f5f9',
              color: issue.severity === 'Critical' ? '#dc2626' : issue.severity === 'High' ? '#d97706' : issue.severity === 'Moderate' ? '#2563eb' : '#64748b',
              fontSize: '0.75rem',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              {issue.severity}
            </span>
            {issue.cvssScore && (
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                CVSS: {issue.cvssScore.toFixed(1)}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {issue.submittedAt.toLocaleString()}
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
          {issue.id}
        </div>
      </div>
      <div style={{ 
        fontSize: '0.875rem', 
        color: '#1a202c', 
        lineHeight: '1.6',
        marginBottom: '0.75rem'
      }}>
        {issue.description}
      </div>
      {issue.similarCves && issue.similarCves.length > 0 && (
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: darkTheme.text, marginBottom: '0.25rem' }}>
            Similar CVEs:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {issue.similarCves.map((cve, idx) => (
              <div key={idx} style={{
                padding: '0.5rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.75rem'
              }}>
                <div style={{ fontWeight: '600', color: '#1a202c' }}>{cve.id}</div>
                <div style={{ color: '#64748b', fontSize: '0.6875rem' }}>{cve.description}</div>
                <div style={{ color: '#64748b', fontSize: '0.6875rem', marginTop: '0.25rem' }}>
                  Similarity: {(cve.score * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {isVerified && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => onChatClick(issue.id)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.8125rem',
              fontWeight: '600',
              backgroundColor: darkTheme.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(99, 102, 241, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Chat with AI
          </button>
          <button
            onClick={() => onRequestAdmin(issue.id)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.8125rem',
              fontWeight: '600',
              backgroundColor: darkTheme.purple,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(139, 92, 246, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            Request Admin
          </button>
        </div>
      )}
    </div>
  )
}

export default function UnifiedDashboard() {
  const router = useRouter()
  const [isVerified, setIsVerified] = useState(false)
  const [loading, setLoading] = useState(true)
  const [uploadedIssues, setUploadedIssues] = useState<UploadedIssue[]>([])
  const [filterSeverity, setFilterSeverity] = useState<'All' | 'Critical' | 'High' | 'Moderate' | 'Low'>('All')
  const [chatIssueId, setChatIssueId] = useState<string | null>(null)
  const [adminRequestIssueId, setAdminRequestIssueId] = useState<string | null>(null)
  const [hasSubmittedIssue, setHasSubmittedIssue] = useState(false)
  const [recentCves, setRecentCves] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)

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

  const handleIssueUploaded = (issue: UploadedIssue) => {
    setUploadedIssues(prev => [issue, ...prev])
  }

  const handleIssueSubmitted = () => {
    setHasSubmittedIssue(true)
    localStorage.setItem('non_verified_issue_submitted', 'true')
  }

  const filteredIssues = filterSeverity === 'All' 
    ? uploadedIssues 
    : uploadedIssues.filter(issue => issue.severity === filterSeverity)

  const severityCounts = {
    Critical: uploadedIssues.filter(i => i.severity === 'Critical').length,
    High: uploadedIssues.filter(i => i.severity === 'High').length,
    Moderate: uploadedIssues.filter(i => i.severity === 'Moderate').length,
    Low: uploadedIssues.filter(i => i.severity === 'Low').length
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

  const [sidebarOpen, setSidebarOpen] = useState(true)

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
          background: '#059669',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <span style={{ fontWeight: '800', fontSize: '1.5rem', color: '#000000', letterSpacing: '-0.02em' }}>BioGate</span>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {(isVerified ? [
                { label: 'Home', path: '/' },
                { label: 'Dashboard', path: '/dashboard', active: true },
                { label: 'Threats', path: '/dashboard', active: false },
                { label: 'AI Analysis', path: '/dashboard', active: false },
                { label: 'Reports', path: '/dashboard', active: false },
                { label: 'Admin Requests', path: '/dashboard', active: false }
              ] : [
                { label: 'Home', path: '/' },
                { label: 'Dashboard', path: '/dashboard', active: true },
                { label: 'Submit Threat', path: '/dashboard', active: false },
                { label: 'AI Advisor', path: '/dashboard', active: false },
                { label: 'Get Verified', path: '/portal', active: false }
              ]).map((item) => (
                <button
                  key={item.label}
                  onClick={() => item.path !== '#' && router.push(item.path)}
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: item.active ? 'rgba(0, 0, 0, 0.2)' : 'transparent',
                    color: item.active ? '#000000' : 'rgba(0, 0, 0, 0.7)',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9375rem',
                    fontWeight: item.active ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!item.active) {
                      e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)'
                      e.currentTarget.style.color = '#000000'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!item.active) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'rgba(0, 0, 0, 0.7)'
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
              onClick={() => router.push(isVerified ? '/dashboard' : '/portal')}
              style={{
                padding: '0.625rem 1.25rem',
                background: 'rgba(0, 0, 0, 0.2)',
                color: '#000000',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9375rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)'
              }}
            >
              {isVerified ? '+ Upload CVE' : '+ Get Verified'}
            </button>
            <span style={{ fontWeight: '600', color: '#000000' }}>User</span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: '700',
              fontSize: '0.875rem'
            }}>U</div>
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
              {isVerified ? 'Full access with AI analysis' : 'Limited access - 1 issue upload'}
            </p>
          </div>

          {/* Key Metrics Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {/* Critical Threats Card */}
            <div style={{
              background: 'rgba(16, 32, 16, 0.4)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              padding: '1.5rem',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                width: '48px',
                height: '48px',
                background: '#fef2f2',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>🔴</div>
              <div style={{
                fontSize: '0.75rem',
                color: '#64748b',
                fontWeight: '600',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Critical Threats
              </div>
              <div style={{
                fontSize: '2.25rem',
                fontWeight: '800',
                color: '#1a202c',
                marginBottom: '0.5rem',
                lineHeight: 1
              }}>
                {severityCounts.Critical}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontWeight: '600'
              }}>
                <span>↑</span>
                <span>Active</span>
              </div>
            </div>
            {/* High Threats Card */}
            <div style={{
              background: 'rgba(16, 32, 16, 0.4)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              padding: '1.5rem',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                width: '48px',
                height: '48px',
                background: '#fef3c7',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>🟡</div>
              <div style={{
                fontSize: '0.75rem',
                color: '#64748b',
                fontWeight: '600',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                High Threats
              </div>
              <div style={{
                fontSize: '2.25rem',
                fontWeight: '800',
                color: '#1a202c',
                marginBottom: '0.5rem',
                lineHeight: 1
              }}>
                {severityCounts.High}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontWeight: '600'
              }}>
                <span>↑</span>
                <span>Active</span>
              </div>
            </div>

            {/* Total Issues Card */}
            <div style={{
              background: 'rgba(16, 32, 16, 0.4)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              padding: '1.5rem',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                width: '48px',
                height: '48px',
                background: '#dbeafe',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}></div>
              <div style={{
                fontSize: '0.75rem',
                color: '#64748b',
                fontWeight: '600',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Total Issues
              </div>
              <div style={{
                fontSize: '2.25rem',
                fontWeight: '800',
                color: '#1a202c',
                marginBottom: '0.5rem',
                lineHeight: 1
              }}>
                {uploadedIssues.length}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontWeight: '600'
              }}>
                <span>All</span>
              </div>
            </div>

            {/* Operations Card */}
            <div style={{
              background: 'rgba(16, 32, 16, 0.4)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              padding: '1.5rem',
              borderRadius: '16px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                width: '48px',
                height: '48px',
                background: '#f3e8ff',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem'
              }}>⚙️</div>
              <div style={{
                fontSize: '0.75rem',
                color: '#64748b',
                fontWeight: '600',
                marginBottom: '0.5rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Operations
              </div>
              <div style={{
                fontSize: '2.25rem',
                fontWeight: '800',
                color: '#1a202c',
                marginBottom: '0.5rem',
                lineHeight: 1
              }}>
                {severityCounts.Moderate + severityCounts.Low}
              </div>
              <div style={{
                fontSize: '0.75rem',
                color: '#64748b',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontWeight: '600'
              }}>
                <span>Moderate & Low</span>
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
              background: 'rgba(16, 32, 16, 0.4)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '700',
                color: '#1a202c',
                marginBottom: '1rem'
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
              background: 'rgba(16, 32, 16, 0.4)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '700',
                color: '#1a202c',
                marginBottom: '1rem'
              }}>
                AI Advisor {!isVerified && '(Limited)'}
              </h2>
              <AIChatAdvisor isVerified={isVerified} />
            </div>
          </div>

          {/* Issues List */}
          {uploadedIssues.length > 0 && (
            <div style={{
              background: 'rgba(16, 32, 16, 0.4)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              marginBottom: '1.5rem'
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1a202c', margin: 0 }}>
                Your Issues
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['All', 'Critical', 'High', 'Moderate', 'Low'] as const).map(severity => (
                  <button
                    key={severity}
                    onClick={() => setFilterSeverity(severity)}
                    style={{
                      padding: '0.375rem 0.75rem',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      background: filterSeverity === severity ? darkTheme.primaryGradient : '#f1f5f9',
                      color: filterSeverity === severity ? 'white' : '#64748b',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (filterSeverity !== severity) {
                        e.currentTarget.style.background = '#e2e8f0'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (filterSeverity !== severity) {
                        e.currentTarget.style.background = '#f1f5f9'
                      }
                    }}
                  >
                    {severity}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {filteredIssues.map(issue => (
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
              background: 'rgba(16, 32, 16, 0.4)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '16px',
              padding: '1.5rem',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}>
              <h2 style={{
                fontSize: '1.125rem',
                fontWeight: '700',
                color: '#1a202c',
                marginBottom: '1rem'
              }}>
                Recent CVEs
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                {recentCves.map((cve: any, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      background: '#f8fafc'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', alignItems: 'center' }}>
                      <div style={{ fontWeight: '600', color: '#1a202c', fontSize: '0.875rem' }}>
                        {cve.id || `CVE-${idx + 1}`}
                      </div>
                      {cve.cvss_score && (
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '4px',
                          backgroundColor: cve.cvss_score >= 7 ? '#ef4444' : '#f59e0b',
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: '600'
                        }}>
                          CVSS {cve.cvss_score}
                        </span>
                      )}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '0.8125rem', lineHeight: '1.5' }}>
                      {cve.description || cve.summary || 'No description'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
    </>
  )
}

