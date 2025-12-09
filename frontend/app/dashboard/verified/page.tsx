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

function IssueUploadForm({ onIssueUploaded }: { onIssueUploaded: (issue: UploadedIssue) => void }) {
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      // Submit issue and get analysis
      const response = await fetch(`${API_URL}/portal/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Verified User',
          role: 'Verified Security Professional',
          problem: description,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to submit issue')
      }

      const data = await response.json()
      
      // Get threat analysis with severity classification
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

      let severity: 'Critical' | 'High' | 'Moderate' | 'Low' = 'Low'
      let cvssScore: number | undefined
      let similarCves: Array<{ id: string; score: number; description: string }> = []

      if (analysisResponse.ok) {
        const analysisData = await analysisResponse.json()
        
        // Determine severity from score_bin or CVSS
        if (analysisData.score_bin) {
          const scoreRange = analysisData.score_bin.split('-').map(parseFloat)
          const avgScore = (scoreRange[0] + scoreRange[1]) / 2
          cvssScore = avgScore * 10
          
          if (cvssScore >= 9.0) severity = 'Critical'
          else if (cvssScore >= 7.0) severity = 'High'
          else if (cvssScore >= 4.0) severity = 'Moderate'
          else severity = 'Low'
        }

        // Get similar CVEs from Pinecone (would come from analysis)
        // For now, we'll simulate this
        if (analysisData.similar_cves) {
          similarCves = analysisData.similar_cves
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit issue')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe the security issue or CVE you want to report..."
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
      <button
        type="submit"
        disabled={!description.trim() || submitting}
        style={{
          width: '100%',
          padding: '0.75rem',
          fontSize: '0.9375rem',
          fontWeight: '600',
          backgroundColor: (!description.trim() || submitting) ? '#9ca3af' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: (!description.trim() || submitting) ? 'not-allowed' : 'pointer'
        }}
      >
        {submitting ? 'Analyzing & Submitting...' : 'Upload Issue/CVE'}
      </button>
    </form>
  )
}

function IssueCard({ issue, onChatClick, onRequestAdmin }: { 
  issue: UploadedIssue
  onChatClick: (issueId: string) => void
  onRequestAdmin: (issueId: string) => void
}) {
  const severityColors = {
    Critical: { bg: '#fee2e2', border: '#fca5a5', text: '#991b1b' },
    High: { bg: '#fef3c7', border: '#fbbf24', text: '#92400e' },
    Moderate: { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af' },
    Low: { bg: '#f3f4f6', border: '#d1d5db', text: '#374151' }
  }

  const color = severityColors[issue.severity]

  return (
    <div style={{
      padding: '1rem',
      border: `2px solid ${color.border}`,
      borderRadius: '8px',
      backgroundColor: color.bg,
      marginBottom: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              backgroundColor: color.border,
              color: color.text,
              fontSize: '0.75rem',
              fontWeight: '700',
              textTransform: 'uppercase'
            }}>
              {issue.severity}
            </span>
            {issue.cvssScore && (
              <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                CVSS: {issue.cvssScore.toFixed(1)}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
            {issue.submittedAt.toLocaleString()}
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>
          {issue.id}
        </div>
      </div>
      <div style={{ 
        fontSize: '0.9375rem', 
        color: '#374151', 
        lineHeight: '1.6',
        marginBottom: '1rem'
      }}>
        {issue.description}
      </div>
      {issue.similarCves && issue.similarCves.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
            Similar CVEs Found:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {issue.similarCves.map((cve, idx) => (
              <div key={idx} style={{
                padding: '0.5rem',
                backgroundColor: 'white',
                borderRadius: '4px',
                fontSize: '0.8125rem'
              }}>
                <div style={{ fontWeight: '600', color: '#1f2937' }}>{cve.id}</div>
                <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>{cve.description}</div>
                <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Similarity: {(cve.score * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={() => onChatClick(issue.id)}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Chat with AI
        </button>
        <button
          onClick={() => onRequestAdmin(issue.id)}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.875rem',
            fontWeight: '600',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Request Admin Meeting
        </button>
      </div>
    </div>
  )
}

function AIChatPanel({ issueId, onClose }: { issueId: string | null; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (issueId) {
      setMessages([{
        role: 'assistant',
        content: `I'm ready to discuss issue ${issueId}. What would you like to know about this security issue?`,
        timestamp: new Date()
      }])
    }
  }, [issueId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading || !issueId) return

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
          issue_id: issueId,
          limit_features: false
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

  if (!issueId) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '2rem',
      right: '2rem',
      width: '400px',
      height: '500px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000
    }}>
      <div style={{
        padding: '1rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
        borderTopLeftRadius: '12px',
        borderTopRightRadius: '12px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: '600', color: '#374151', margin: 0 }}>
            AI Chat - Issue {issueId}
          </h3>
        </div>
        <button
          onClick={onClose}
          style={{
            padding: '0.25rem 0.5rem',
            backgroundColor: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '0.75rem'
          }}
        >
          ✕
        </button>
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
          placeholder="Ask about this issue..."
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

function AdminRequestModal({ issueId, onClose, onSubmitted }: { 
  issueId: string | null
  onClose: () => void
  onSubmitted: () => void
}) {
  const [requestType, setRequestType] = useState<'meeting' | 'priority' | 'review'>('meeting')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!issueId) return

    setSubmitting(true)
    setError(null)

    try {
      // Send admin request (would be a new endpoint)
      const response = await fetch(`${API_URL}/admin/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          issue_id: issueId,
          request_type: requestType,
          message: message || `Request for ${requestType} regarding issue ${issueId}`
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send admin request')
      }

      setSubmitted(true)
      setTimeout(() => {
        onSubmitted()
        onClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request')
    } finally {
      setSubmitting(false)
    }
  }

  if (!issueId) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
          Request Admin Action
        </h2>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
          Issue: {issueId}
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              Request Type
            </label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as any)}
              style={{
                width: '100%',
                padding: '0.625rem',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            >
              <option value="meeting">Request Meeting</option>
              <option value="priority">Request Priority Review</option>
              <option value="review">Request Detailed Review</option>
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#374151', marginBottom: '0.5rem' }}>
              Additional Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add any additional details..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '0.625rem',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>
          {error && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              color: '#991b1b',
              marginBottom: '1rem',
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
              marginBottom: '1rem',
              fontSize: '0.875rem'
            }}>
              ✓ Request sent successfully! Admin will review your request.
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || submitted}
              style={{
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                backgroundColor: (submitting || submitted) ? '#9ca3af' : '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (submitting || submitted) ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? 'Sending...' : submitted ? 'Sent!' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function VerifiedDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [uploadedIssues, setUploadedIssues] = useState<UploadedIssue[]>([])
  const [filterSeverity, setFilterSeverity] = useState<'All' | 'Critical' | 'High' | 'Moderate' | 'Low'>('All')
  const [chatIssueId, setChatIssueId] = useState<string | null>(null)
  const [adminRequestIssueId, setAdminRequestIssueId] = useState<string | null>(null)
  const [recentCves, setRecentCves] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalThreats: 0,
    criticalAlerts: 0,
    verifiedUsers: 0,
    activeIssues: 0,
    resolvedIssues: 0
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cveResponse = await fetch(`${API_URL}/cve-ingestor/cves/recent?limit=10`)
        if (cveResponse.ok) {
          const cveData = await cveResponse.json()
          setRecentCves(cveData.cves || [])
        }

        setStats({
          totalThreats: 1247,
          criticalAlerts: 23,
          verifiedUsers: 156,
          activeIssues: uploadedIssues.length,
          resolvedIssues: 142
        })
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [uploadedIssues.length])

  const handleIssueUploaded = (issue: UploadedIssue) => {
    setUploadedIssues(prev => [issue, ...prev])
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

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#f5f7fa',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem 2rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderLeft: '4px solid #10b981'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                Verified Security Dashboard
              </h1>
              <span style={{
                backgroundColor: '#10b981',
                color: 'white',
                padding: '0.25rem 0.75rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: '700',
                textTransform: 'uppercase'
              }}>
                Verified Access
              </span>
            </div>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: 0 }}>
              Upload issues, analyze threats, and get AI-powered recommendations
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => router.push('/dashboard/non-verified')}
              style={{
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                backgroundColor: '#f59e0b',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              View Non-Verified Dashboard
            </button>
            <button
              onClick={() => router.push('/portal')}
              style={{
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              + Report Security Issue
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderTop: '3px solid #ef4444'
          }}>
            <div style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Critical Issues
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>
              {severityCounts.Critical}
            </div>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderTop: '3px solid #f59e0b'
          }}>
            <div style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              High Priority
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
              {severityCounts.High}
            </div>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderTop: '3px solid #3b82f6'
          }}>
            <div style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Total Issues
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>
              {uploadedIssues.length}
            </div>
          </div>
          <div style={{
            backgroundColor: 'white',
            padding: '1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderTop: '3px solid #10b981'
          }}>
            <div style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Active Issues
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
              {uploadedIssues.length}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          {/* Issue Upload */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
              Upload Issue/CVE
            </h2>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '1rem' }}>
              Upload any security issue or CVE. It will be automatically analyzed, classified by severity, and compared with similar CVEs in our database.
            </p>
            <IssueUploadForm onIssueUploaded={handleIssueUploaded} />
          </div>

          {/* Recent CVEs */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
                Recent Critical Vulnerabilities
              </h2>
              <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                {recentCves.length} items
              </span>
            </div>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                  Loading threat intelligence...
                </div>
              ) : recentCves.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {recentCves.map((cve: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        padding: '1rem',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        backgroundColor: '#f9fafb'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.9375rem' }}>
                          {cve.id || `CVE-${idx + 1}`}
                        </div>
                        {cve.cvss_score && (
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            backgroundColor: cve.cvss_score >= 7 ? '#fee2e2' : '#fef3c7',
                            color: cve.cvss_score >= 7 ? '#991b1b' : '#92400e',
                            fontSize: '0.75rem',
                            fontWeight: '600'
                          }}>
                            CVSS {cve.cvss_score}
                          </span>
                        )}
                      </div>
                      <div style={{ color: '#4b5563', fontSize: '0.875rem', lineHeight: '1.5', marginBottom: '0.5rem' }}>
                        {cve.description || cve.summary || 'No description available'}
                      </div>
                      {cve.published_date && (
                        <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>
                          Published: {new Date(cve.published_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                  No recent vulnerabilities. CVE data will appear here once ingested.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Uploaded Issues */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
              Your Uploaded Issues
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.875rem', color: '#6b7280', marginRight: '0.5rem' }}>Filter:</span>
              {(['All', 'Critical', 'High', 'Moderate', 'Low'] as const).map(severity => (
                <button
                  key={severity}
                  onClick={() => setFilterSeverity(severity)}
                  style={{
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    backgroundColor: filterSeverity === severity ? '#3b82f6' : '#f3f4f6',
                    color: filterSeverity === severity ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {severity} {severity !== 'All' && `(${severityCounts[severity as keyof typeof severityCounts]})`}
                </button>
              ))}
            </div>
          </div>
          {filteredIssues.length > 0 ? (
            <div>
              {filteredIssues.map(issue => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onChatClick={setChatIssueId}
                  onRequestAdmin={setAdminRequestIssueId}
                />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
              {uploadedIssues.length === 0 
                ? 'No issues uploaded yet. Upload your first issue above.'
                : `No ${filterSeverity.toLowerCase()} issues found.`}
            </div>
          )}
        </div>
      </div>

      {/* AI Chat Panel */}
      {chatIssueId && (
        <AIChatPanel issueId={chatIssueId} onClose={() => setChatIssueId(null)} />
      )}

      {/* Admin Request Modal */}
      {adminRequestIssueId && (
        <AdminRequestModal
          issueId={adminRequestIssueId}
          onClose={() => setAdminRequestIssueId(null)}
          onSubmitted={() => setAdminRequestIssueId(null)}
        />
      )}
    </main>
  )
}
