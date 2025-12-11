'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070'

const darkTheme = {
  // Dark base colors matching admin
  bg: '#0a0a0a',
  bgGradient: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
  surface: '#161616',
  surfaceHover: '#1f1f1f',
  card: '#1a1a1a',
  cardHover: '#242424',
  // Green accents for verified (matching admin)
  border: 'rgba(22, 163, 74, 0.2)',
  borderLight: 'rgba(22, 163, 74, 0.1)',
  borderHover: 'rgba(22, 163, 74, 0.4)',
  // Clean text colors
  text: '#fafafa',
  textMuted: '#a3a3a3',
  textSubtle: '#737373',
  // Green accents for verified status
  primary: '#16a34a',
  primaryGradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
  primaryHover: '#22c55e',
  // Status colors
  success: '#16a34a',
  successGradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
  warning: '#eab308',
  warningGradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
  danger: '#ef4444',
  dangerGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
}

function IssueUploadForm({ onIssueUploaded, darkTheme }) {
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      // Get user ID from localStorage if available
      const userId = typeof window !== 'undefined' 
        ? (localStorage.getItem('user_id') || localStorage.getItem('dashboard_user_id'))
        : null

      console.log('[Verified Dashboard] Submitting issue:', { description: description.substring(0, 50) + '...', userId, API_URL })

      // Submit issue - add timeout to prevent hanging
      const submitController = new AbortController()
      const submitTimeoutId = setTimeout(() => submitController.abort(), 180000) // 3 minute timeout for submission

      const response = await fetch(`${API_URL}/portal/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          Name: 'Verified User',
          Role: 'Verified Security Professional',
          Problem: description,
          ApiKey: null, // No API key for verified users submitting from dashboard
          SkipVerification: true // Skip AI verification - user is already verified
        }),
        signal: submitController.signal
      })

      clearTimeout(submitTimeoutId)

      console.log('[Verified Dashboard] Response status:', response.status, response.statusText)

      if (!response.ok) {
        let errorMessage = 'Failed to submit issue'
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorData.message || errorMessage
        } catch {
          errorMessage = `HTTP ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      console.log('[Verified Dashboard] Submission successful:', data)
      
      // Clear any previous errors
      setError(null)
      
      // Create issue immediately with default values
      // Use a more unique ID to prevent duplicates
      const uniqueId = `issue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      const newIssue = {
        id: uniqueId,
        description,
        severity: 'Low', // Default, will be updated if analysis completes
        cvssScore: null,
        submittedAt: new Date(),
        similarCves: [],
        analyzing: true // Flag to show analysis is in progress
      }

      // Show success immediately
      onIssueUploaded(newIssue)
      setDescription('')

      // Get threat analysis in background (non-blocking)
      // Use AbortController for timeout
      const analysisController = new AbortController()
      const analysisTimeoutId = setTimeout(() => analysisController.abort(), 10000) // 10 second timeout

      try {
        const analysisResponse = await fetch(`${API_URL}/ai-rag/analyze-threat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: description,
            top_k: 5
          }),
          signal: analysisController.signal
        })

        clearTimeout(analysisTimeoutId)

        if (analysisResponse.ok) {
          const analysisData = await analysisResponse.json()
          
          let severity = 'Low'
          let cvssScore
          let similarCves = []

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

          // Get similar CVEs from Pinecone
          if (analysisData.similar_cves) {
            similarCves = analysisData.similar_cves
          }

          // Update the issue with analysis results
          newIssue.severity = severity
          newIssue.cvssScore = cvssScore
          newIssue.similarCves = similarCves
          newIssue.analyzing = false
          
          // Trigger update callback if available
          if (onIssueUploaded) {
            onIssueUploaded({ ...newIssue })
          }
        }
      } catch (err) {
        clearTimeout(analysisTimeoutId)
        if (err.name !== 'AbortError') {
          console.error('Analysis error (non-blocking):', err)
        }
        // Mark analysis as complete even if it failed
        newIssue.analyzing = false
        if (onIssueUploaded) {
          onIssueUploaded({ ...newIssue })
        }
      }
    } catch (err) {
      if (typeof submitTimeoutId !== 'undefined') clearTimeout(submitTimeoutId)
      console.error('Issue submission error:', err)
      let errorMessage = 'Failed to submit issue'
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. The submission service may be slow. Please try again.'
      } else if (err instanceof Error) {
        errorMessage = err.message
        // Check for network errors
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = 'Network error: Unable to connect to the server. Please check your connection and try again.'
        }
        // Check for timeout errors from backend
        if (err.message.includes('HttpClient.Timeout') || err.message.includes('timeout')) {
          errorMessage = 'The submission timed out. The AI service may be slow. Your issue may still have been submitted - please check your uploaded issues list.'
        }
      }
      setError(errorMessage)
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
          padding: '0.875rem 1rem',
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '12px',
          fontSize: '0.9375rem',
          fontFamily: 'inherit',
          resize: 'vertical',
          color: darkTheme.text,
          outline: 'none',
          marginBottom: '0.75rem',
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
      {error && (
        <div style={{
          padding: '1rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${darkTheme.danger}`,
          borderRadius: '12px',
          color: darkTheme.danger,
          marginBottom: '1rem',
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
          padding: '1rem 2rem',
          fontSize: '1rem',
          fontWeight: '700',
          background: (!description.trim() || submitting) ? darkTheme.surface : darkTheme.primaryGradient,
          color: 'white',
          border: 'none',
          borderRadius: '16px',
          cursor: (!description.trim() || submitting) ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: (!description.trim() || submitting) ? 'none' : '0 4px 20px rgba(22, 163, 74, 0.4)',
          opacity: (!description.trim() || submitting) ? 0.6 : 1
        }}
        onMouseEnter={(e) => {
          if (description.trim() && !submitting) {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 30px rgba(22, 163, 74, 0.5)'
          }
        }}
        onMouseLeave={(e) => {
          if (description.trim() && !submitting) {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(22, 163, 74, 0.4)'
          }
        }}
      >
        {submitting ? 'Analyzing & Submitting...' : 'Upload Issue/CVE'}
      </button>
    </form>
  )
}

function IssueCard({ issue, onChatClick, onRequestAdmin, darkTheme }) {
  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'Critical':
        return { border: darkTheme.danger, bg: 'rgba(239, 68, 68, 0.1)', text: darkTheme.danger }
      case 'High':
        return { border: darkTheme.warning, bg: 'rgba(234, 179, 8, 0.1)', text: darkTheme.warning }
      case 'Moderate':
        return { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)', text: '#3b82f6' }
      case 'Low':
        return { border: darkTheme.textMuted, bg: darkTheme.surface, text: darkTheme.textMuted }
      default:
        return { border: darkTheme.border, bg: darkTheme.surface, text: darkTheme.text }
    }
  }

  const color = getSeverityStyle(issue.severity)

  return (
    <div style={{
      padding: '1.5rem',
      border: `1px solid ${color.border}`,
      borderRadius: '16px',
      background: color.bg,
      marginBottom: '1rem',
      transition: 'all 0.3s ease'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = darkTheme.primary
      e.currentTarget.style.transform = 'translateY(-2px)'
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = color.border
      e.currentTarget.style.transform = 'translateY(0)'
    }}
    >
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
              <span style={{ fontSize: '0.875rem', color: darkTheme.textMuted }}>
                CVSS: {issue.cvssScore.toFixed(1)}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.875rem', color: darkTheme.textMuted, marginBottom: '0.5rem' }}>
            {issue.submittedAt.toLocaleString()}
          </div>
        </div>
        <div style={{ fontSize: '0.75rem', color: darkTheme.textSubtle, fontFamily: 'monospace' }}>
          {issue.id}
        </div>
      </div>
      <div style={{ 
        fontSize: '0.9375rem', 
        color: darkTheme.text, 
        lineHeight: '1.6',
        marginBottom: '1rem'
      }}>
        {issue.description}
      </div>
      {issue.similarCves && issue.similarCves.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: '600', color: darkTheme.text, marginBottom: '0.5rem' }}>
            Similar CVEs Found:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {issue.similarCves.map((cve, idx) => (
              <div key={idx} style={{
                padding: '0.75rem',
                background: darkTheme.card,
                border: `1px solid ${darkTheme.border}`,
                borderRadius: '8px',
                fontSize: '0.8125rem'
              }}>
                <div style={{ fontWeight: '600', color: darkTheme.text }}>{cve.id}</div>
                <div style={{ color: darkTheme.textMuted, fontSize: '0.75rem' }}>{cve.description}</div>
                <div style={{ color: darkTheme.textSubtle, fontSize: '0.75rem', marginTop: '0.25rem' }}>
                  Similarity: {(cve.score * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
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
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(22, 163, 74, 0.4)'
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
            padding: '0.75rem 1.5rem',
            fontSize: '0.875rem',
            fontWeight: '700',
            background: darkTheme.surface,
            color: darkTheme.text,
            border: `1px solid ${darkTheme.border}`,
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = darkTheme.surfaceHover
            e.currentTarget.style.borderColor = darkTheme.primary
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = darkTheme.surface
            e.currentTarget.style.borderColor = darkTheme.border
          }}
        >
          Request Admin Meeting
        </button>
      </div>
    </div>
  )
}

function AIChatPanel({ issueId, onClose }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (issueId) {
      // For specific issues, provide formal context
      setMessages([{
        role: 'assistant',
        content: `I'm ready to discuss issue ${issueId}. What would you like to know about this security issue?`,
        timestamp: new Date()
      }])
    } else {
      // General chat - conversational
      setMessages([{
        role: 'assistant',
        content: 'Hello! I\'m your AI security advisor. Feel free to chat with me naturally about security threats, CVEs, best practices, or anything else. I\'m here to help!\n\nIf you mention a security threat, I\'ll provide advice. Otherwise, let\'s just have a conversation.',
        timestamp: new Date()
      }])
    }
  }, [issueId])

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

    // Add timeout to prevent hanging
    const controller = new AbortController()
    let timeoutId = null

    try {
      let chatMessage = input
      
      // If there's a specific issue ID, provide formal context
      if (issueId) {
        chatMessage = `Regarding issue ${issueId}: ${input}`
      }
      // For general chat, use direct message (no verbose prompt)

      timeoutId = setTimeout(() => controller.abort(), 45000) // 45 second timeout - Docker + Ollama may need more time for first request

      const response = await fetch(`${API_URL}/ai-rag/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: chatMessage,
          issue_id: issueId || undefined,
          limit_features: false
        }),
        signal: controller.signal
      })

      if (timeoutId) clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error('Failed to get AI response')
      }

      const data = await response.json()
      const assistantMessage = {
        role: 'assistant',
        content: data.response || 'I apologize, but I could not process your request.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId)
      let errorMsg = 'I apologize, but I encountered an error. Please try again later.'
      if (err.name === 'AbortError') {
        errorMsg = 'Request timed out. The AI service may be slow. Please try again.'
      } else if (err instanceof Error) {
        errorMsg = `Error: ${err.message}`
      }
      const errorMessage = {
        role: 'assistant',
        content: errorMsg,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

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
            {issueId ? `AI Chat - Issue ${issueId}` : 'AI Security Advisor'}
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

function AdminRequestModal({ issueId, onClose, onSubmitted }) {
  const [requestType, setRequestType] = useState('meeting')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e) => {
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

  // Allow general chat even without issueId

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
              onChange={(e) => setRequestType(e.target.value)}
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
  const [uploadedIssues, setUploadedIssues] = useState([])
  const [filterSeverity, setFilterSeverity] = useState('All')
  const [chatIssueId, setChatIssueId] = useState(null)
  const [adminRequestIssueId, setAdminRequestIssueId] = useState(null)
  const [recentCves, setRecentCves] = useState([])
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({
    totalThreats: 0,
    criticalAlerts: 0,
    verifiedUsers: 0,
    activeIssues: 0,
    resolvedIssues: 0
  })
  const [cveAdvice, setCveAdvice] = useState({}) // { issueId: { advice, loading } }
  const [generalChatMessages, setGeneralChatMessages] = useState([{
    role: 'assistant',
    content: 'Hello! I\'m your AI security advisor. Feel free to chat with me naturally about security threats, CVEs, best practices, or anything else. If you mention a security threat, I\'ll provide advice. Otherwise, let\'s just have a conversation!',
    timestamp: new Date()
  }])
  const [generalChatInput, setGeneralChatInput] = useState('')
  const [generalChatLoading, setGeneralChatLoading] = useState(false)

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
      
      // If user is not verified, redirect to non-verified dashboard
      if (cookieStatus === 'non-verified' || localStorageStatus === 'false') {
        router.push('/dashboard/non-verified')
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

  const handleIssueUploaded = (issue) => {
    setUploadedIssues(prev => {
      // Check if issue with same ID already exists - update it instead of adding duplicate
      const existingIndex = prev.findIndex(i => i.id === issue.id)
      if (existingIndex >= 0) {
        // Update existing issue
        const updated = [...prev]
        updated[existingIndex] = issue
        return updated
      } else {
        // Add new issue
        return [issue, ...prev]
      }
    })
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
      background: darkTheme.bgGradient,
      padding: 0
    }}>
      {/* Header Navigation */}
      <div style={{
        background: darkTheme.surface,
        borderBottom: `1px solid ${darkTheme.border}`,
        padding: '1.5rem 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(10px)',
        background: `linear-gradient(135deg, ${darkTheme.surface} 0%, ${darkTheme.card} 100%)`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'nowrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: 1, minWidth: 0 }}>
          <span style={{ fontWeight: '800', fontSize: '1.5rem', color: '#ffffff', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>BioGate Verified</span>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Dashboard', tab: 'dashboard' },
              { label: 'Issues', tab: 'issues' },
              { label: 'AI Advisor', tab: 'ai-advisor' }
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
      </div>

      <div style={{ padding: '2rem' }}>
        <div style={{ maxWidth: '1920px', margin: '0 auto' }}>
          {/* Tab Content */}
          {activeTab === 'dashboard' && (
            <div>
              {/* Key Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  background: darkTheme.card,
                  border: `1px solid ${darkTheme.border}`,
                  borderRadius: '24px',
                  padding: '2rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: darkTheme.textMuted, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      Critical Issues
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: darkTheme.danger, letterSpacing: '-0.02em' }}>
                      {severityCounts.Critical}
                    </div>
                  </div>
                </div>
                <div style={{
                  background: darkTheme.card,
                  border: `1px solid ${darkTheme.border}`,
                  borderRadius: '24px',
                  padding: '2rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: darkTheme.textMuted, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      High Priority
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: darkTheme.warning, letterSpacing: '-0.02em' }}>
                      {severityCounts.High}
                    </div>
                  </div>
                </div>
                <div style={{
                  background: darkTheme.card,
                  border: `1px solid ${darkTheme.border}`,
                  borderRadius: '24px',
                  padding: '2rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: darkTheme.textMuted, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      Total Issues
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: darkTheme.primary, letterSpacing: '-0.02em' }}>
                      {uploadedIssues.length}
                    </div>
                  </div>
                </div>
                <div style={{
                  background: darkTheme.card,
                  border: `1px solid ${darkTheme.border}`,
                  borderRadius: '24px',
                  padding: '2rem',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: darkTheme.textMuted, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      Active Issues
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: '800', color: darkTheme.success, letterSpacing: '-0.02em' }}>
                      {uploadedIssues.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent CVEs */}
              <div style={{
                background: darkTheme.card,
                border: `1px solid ${darkTheme.border}`,
                borderRadius: '24px',
                padding: '2rem',
                marginBottom: '2rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: darkTheme.text, margin: 0, letterSpacing: '-0.02em' }}>
                    Recent Critical Vulnerabilities
                  </h2>
                  <span style={{ color: darkTheme.textMuted, fontSize: '0.875rem' }}>
                    {recentCves.length} items
                  </span>
                </div>
                <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                  {loading ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: darkTheme.textMuted }}>
                      Loading threat intelligence...
                    </div>
                  ) : recentCves.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {recentCves.map((cve, idx) => (
                        <div
                          key={idx}
                          style={{
                            padding: '1.5rem',
                            border: `1px solid ${darkTheme.border}`,
                            borderRadius: '16px',
                            background: darkTheme.surface
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                            <div style={{ fontWeight: '700', color: darkTheme.text, fontSize: '1rem' }}>
                              {cve.id || `CVE-${idx + 1}`}
                            </div>
                            {cve.cvss_score && (
                              <span style={{
                                padding: '0.5rem 0.75rem',
                                borderRadius: '8px',
                                background: cve.cvss_score >= 7 ? darkTheme.dangerGradient : darkTheme.warningGradient,
                                color: 'white',
                                fontSize: '0.75rem',
                                fontWeight: '700'
                              }}>
                                CVSS {cve.cvss_score}
                              </span>
                            )}
                          </div>
                          <div style={{ color: darkTheme.textMuted, fontSize: '0.875rem', lineHeight: '1.6', marginBottom: '0.5rem' }}>
                            {cve.description || cve.summary || 'No description available'}
                          </div>
                          {cve.published_date && (
                            <div style={{ color: darkTheme.textSubtle, fontSize: '0.75rem' }}>
                              Published: {new Date(cve.published_date).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: darkTheme.textMuted }}>
                      No recent vulnerabilities. CVE data will appear here once ingested.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'issues' && (
            <div>
              <div style={{
                background: darkTheme.card,
                border: `1px solid ${darkTheme.border}`,
                borderRadius: '24px',
                padding: '2.5rem',
                marginBottom: '2rem'
              }}>
                <div style={{ marginBottom: '2rem' }}>
                  <h2 style={{
                    fontSize: '1.75rem',
                    fontWeight: '800',
                    color: darkTheme.text,
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.02em'
                  }}>
                    Upload Issue/CVE
                  </h2>
                  <p style={{ color: darkTheme.textMuted, fontSize: '0.9375rem' }}>
                    Upload any security issue or CVE. It will be automatically analyzed, classified by severity, and compared with similar CVEs in our database.
                  </p>
                </div>
                <IssueUploadForm onIssueUploaded={handleIssueUploaded} darkTheme={darkTheme} />
              </div>

              <div style={{
                background: darkTheme.card,
                border: `1px solid ${darkTheme.border}`,
                borderRadius: '24px',
                padding: '2rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: darkTheme.text, margin: 0, letterSpacing: '-0.02em' }}>
                    Your Uploaded Issues
                  </h2>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.875rem', color: darkTheme.textMuted, marginRight: '0.5rem' }}>Filter:</span>
                    {['All', 'Critical', 'High', 'Moderate', 'Low'].map(severity => (
                      <button
                        key={severity}
                        onClick={() => setFilterSeverity(severity)}
                        style={{
                          padding: '0.5rem 1rem',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          background: filterSeverity === severity ? darkTheme.primaryGradient : darkTheme.surface,
                          color: filterSeverity === severity ? 'white' : darkTheme.text,
                          border: filterSeverity === severity ? 'none' : `1px solid ${darkTheme.border}`,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {severity} {severity !== 'All' && `(${severityCounts[severity] || 0})`}
                      </button>
                    ))}
                  </div>
                </div>
                {filteredIssues.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {filteredIssues.map(issue => (
                      <IssueCard
                        key={issue.id}
                        issue={issue}
                        onChatClick={setChatIssueId}
                        onRequestAdmin={setAdminRequestIssueId}
                        darkTheme={darkTheme}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '2rem', color: darkTheme.textMuted }}>
                    {uploadedIssues.length === 0 
                      ? 'No issues uploaded yet. Upload your first issue above.'
                      : `No ${filterSeverity.toLowerCase()} issues found.`}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ai-advisor' && (
            <div>
              <div style={{ marginBottom: '2rem' }}>
                <h2 style={{
                  fontSize: '1.75rem',
                  fontWeight: '800',
                  color: darkTheme.text,
                  marginBottom: '0.5rem',
                  letterSpacing: '-0.02em'
                }}>
                  AI Security Advisor
                </h2>
                <p style={{ color: darkTheme.textMuted, fontSize: '0.9375rem' }}>
                  Chat naturally with AI about security threats, CVEs, or get advice. For submitted CVEs, you'll get formal structured analysis.
                </p>
              </div>

              {/* General AI Chat */}
              <div style={{
                background: darkTheme.card,
                border: `1px solid ${darkTheme.border}`,
                borderRadius: '24px',
                padding: '0',
                marginBottom: '2rem',
                display: 'flex',
                flexDirection: 'column',
                height: '500px',
                minHeight: '500px',
                overflow: 'hidden'
              }}>
                <div style={{
                  padding: '1.5rem',
                  borderBottom: `1px solid ${darkTheme.border}`,
                  background: darkTheme.surface,
                  borderTopLeftRadius: '24px',
                  borderTopRightRadius: '24px'
                }}>
                  <h3 style={{
                    fontSize: '1.125rem',
                    fontWeight: '800',
                    color: darkTheme.text,
                    marginBottom: '0.25rem',
                    letterSpacing: '-0.02em'
                  }}>
                    General AI Chat
                  </h3>
                  <p style={{ fontSize: '0.8125rem', color: darkTheme.textMuted, margin: 0 }}>
                    Chat naturally about security threats, CVEs, or anything else
                  </p>
                </div>

                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  minHeight: 0
                }}>
                  {generalChatMessages.map((msg, idx) => (
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
                              borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
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
                        {generalChatLoading && (
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
                              borderRadius: '20px 20px 20px 4px',
                              color: darkTheme.textMuted,
                              fontSize: '0.9375rem'
                            }}>
                              Thinking...
                            </div>
                          </div>
                        )}
                </div>
                <form onSubmit={async (e) => {
                  e.preventDefault()
                  if (!generalChatInput.trim() || generalChatLoading) return

                  const userMessage = { role: 'user', content: generalChatInput.trim(), timestamp: new Date() }
                  setGeneralChatMessages(prev => [...prev, userMessage])
                  setGeneralChatInput('')
                  setGeneralChatLoading(true)

                  try {
                    // Simplified, more direct prompt
                    const conversationPrompt = userMessage.content

                    // Add timeout to prevent hanging - shorter timeout for faster feedback
                    const controller = new AbortController()
                    const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 second timeout - optimized backend should respond faster

                    const response = await fetch(`${API_URL}/ai-rag/chat`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        message: conversationPrompt,
                        limit_features: false
                      }),
                      signal: controller.signal
                    })

                    clearTimeout(timeoutId)

                    if (!response.ok) {
                      throw new Error('Failed to get AI response')
                    }

                    const data = await response.json()
                    const aiMessage = {
                      role: 'assistant',
                      content: data.response || 'I apologize, but I could not process your request.',
                      timestamp: new Date()
                    }
                    setGeneralChatMessages(prev => [...prev, aiMessage])
                  } catch (err) {
                    let errorMsg = 'Sorry, I encountered an error. Please try again later.'
                    if (err.name === 'AbortError') {
                      errorMsg = 'Request timed out after 45 seconds. The AI service may be slow. Please try again.'
                    } else if (err instanceof Error) {
                      errorMsg = `Error: ${err.message}`
                    }
                    const errorMessage = {
                      role: 'assistant',
                      content: errorMsg,
                      timestamp: new Date()
                    }
                    setGeneralChatMessages(prev => [...prev, errorMessage])
                  } finally {
                    setGeneralChatLoading(false)
                  }
                }} style={{
                  padding: '1.5rem',
                  borderTop: `1px solid ${darkTheme.border}`,
                  background: darkTheme.surface,
                  borderBottomLeftRadius: '24px',
                  borderBottomRightRadius: '24px',
                  flexShrink: 0
                }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                      type="text"
                      value={generalChatInput}
                      onChange={(e) => setGeneralChatInput(e.target.value)}
                      placeholder="Chat about security threats, CVEs, or anything else..."
                      disabled={generalChatLoading}
                      style={{
                        flex: 1,
                        padding: '0.875rem 1.25rem',
                        background: darkTheme.card,
                        border: `1px solid ${darkTheme.border}`,
                        borderRadius: '20px',
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
                      disabled={!generalChatInput.trim() || generalChatLoading}
                      style={{
                        padding: '0.875rem 1.75rem',
                        background: (!generalChatInput.trim() || generalChatLoading)
                          ? darkTheme.surfaceHover
                          : darkTheme.primaryGradient,
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        fontSize: '0.9375rem',
                        fontWeight: '700',
                        cursor: (!generalChatInput.trim() || generalChatLoading) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s ease',
                        opacity: (!generalChatInput.trim() || generalChatLoading) ? 0.6 : 1
                      }}
                    >
                      Send
                    </button>
                  </div>
                </form>
              </div>

              {/* Submitted CVEs with Formal Advice */}
              {uploadedIssues.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '800',
                    color: darkTheme.text,
                    marginBottom: '1rem',
                    letterSpacing: '-0.02em'
                  }}>
                    Your Submitted CVEs - Formal Analysis
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {uploadedIssues.map((issue) => {
                    const advice = cveAdvice[issue.id]
                    const getAdvice = async () => {
                      if (cveAdvice[issue.id]?.loading) return
                      
                      setCveAdvice(prev => ({
                        ...prev,
                        [issue.id]: { loading: true, advice: null }
                      }))

                      try {
                        // For submitted CVEs, provide formal structured advice
                        // Add timeout to prevent hanging - shorter timeout for faster feedback
                        const controller = new AbortController()
                        const timeoutId = setTimeout(() => controller.abort(), 20000) // 20 second timeout - optimized backend should respond faster

                        // Simplified prompt for faster response
                        const response = await fetch(`${API_URL}/ai-rag/chat`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            message: `CVE: "${issue.description}". Provide structured advice: 1) Immediate actions, 2) Risk mitigation, 3) Preparation for admin review, 4) Best practices.`,
                            limit_features: false
                          }),
                          signal: controller.signal
                        })

                        if (!response.ok) {
                          const errorData = await response.json().catch(() => ({}))
                          throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}: ${response.statusText}`)
                        }

                        const data = await response.json()
                        setCveAdvice(prev => ({
                          ...prev,
                          [issue.id]: { loading: false, advice: data.response || 'No advice available.', error: false }
                        }))
                      } catch (err) {
                        let errorMsg = 'Error: Could not get advice. Please try again.'
                        if (err.name === 'AbortError') {
                          errorMsg = 'Request timed out after 45 seconds. The AI service may be slow. Please try again.'
                        } else if (err instanceof Error) {
                          errorMsg = `Error: ${err.message}`
                        }
                        setCveAdvice(prev => ({
                          ...prev,
                          [issue.id]: { loading: false, advice: errorMsg, error: true }
                        }))
                      } finally {
                        // Ensure timeout is cleared
                        if (typeof timeoutId !== 'undefined') {
                          clearTimeout(timeoutId)
                        }
                      }
                    }

                    return (
                      <div
                        key={issue.id}
                        style={{
                          background: darkTheme.card,
                          border: `1px solid ${darkTheme.border}`,
                          borderRadius: '20px',
                          padding: '1.5rem',
                          transition: 'all 0.3s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                              <span style={{
                                padding: '0.5rem 1rem',
                                background: issue.severity === 'Critical' ? darkTheme.dangerGradient :
                                          issue.severity === 'High' ? darkTheme.warningGradient :
                                          issue.severity === 'Moderate' ? darkTheme.primaryGradient :
                                          darkTheme.successGradient,
                                color: 'white',
                                fontSize: '0.75rem',
                                fontWeight: '700',
                                borderRadius: '12px',
                                textTransform: 'uppercase'
                              }}>
                                {issue.severity}
                              </span>
                              {issue.cvssScore && (
                                <span style={{
                                  padding: '0.5rem 1rem',
                                  background: darkTheme.surface,
                                  color: darkTheme.text,
                                  fontSize: '0.75rem',
                                  fontWeight: '700',
                                  borderRadius: '12px',
                                  border: `1px solid ${darkTheme.border}`
                                }}>
                                  CVSS: {issue.cvssScore.toFixed(1)}
                                </span>
                              )}
                              <span style={{
                                fontSize: '0.75rem',
                                color: darkTheme.textMuted
                              }}>
                                {new Date(issue.submittedAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p style={{
                              color: darkTheme.text,
                              fontSize: '0.9375rem',
                              lineHeight: '1.6',
                              margin: 0
                            }}>
                              {issue.description}
                            </p>
                          </div>
                        </div>

                        {!advice && (
                          <button
                            onClick={getAdvice}
                            style={{
                              width: '100%',
                              padding: '0.875rem 1.5rem',
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
                            Get AI Advice →
                          </button>
                        )}

                        {advice?.loading && (
                          <div style={{
                            padding: '1.5rem',
                            background: darkTheme.surface,
                            borderRadius: '12px',
                            textAlign: 'center',
                            color: darkTheme.textMuted
                          }}>
                            <div style={{
                              width: '24px',
                              height: '24px',
                              border: `3px solid ${darkTheme.primary}`,
                              borderTopColor: 'transparent',
                              borderRadius: '50%',
                              animation: 'spin 0.8s linear infinite',
                              margin: '0 auto 0.75rem'
                            }} />
                            Getting AI advice...
                          </div>
                        )}

                        {advice?.advice && (
                          <div style={{
                            padding: '1.5rem',
                            background: advice.error ? (darkTheme.error || '#2d1b1b') : darkTheme.surface,
                            borderRadius: '12px',
                            border: `1px solid ${advice.error ? (darkTheme.errorBorder || '#ff4444') : darkTheme.border}`
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '1rem'
                            }}>
                              <h4 style={{
                                fontSize: '1rem',
                                fontWeight: '700',
                                color: advice.error ? (darkTheme.errorText || '#ff6666') : darkTheme.text,
                                margin: 0
                              }}>
                                {advice.error ? 'Error' : 'AI Recommendations'}
                              </h4>
                              <button
                                onClick={getAdvice}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: darkTheme.surfaceHover,
                                  color: darkTheme.text,
                                  border: `1px solid ${darkTheme.border}`,
                                  borderRadius: '8px',
                                  fontSize: '0.8125rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = darkTheme.primary
                                  e.currentTarget.style.color = 'white'
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = darkTheme.surfaceHover
                                  e.currentTarget.style.color = darkTheme.text
                                }}
                              >
                                {advice.error ? 'Retry' : 'Refresh'}
                              </button>
                            </div>
                            <div style={{
                              color: advice.error ? (darkTheme.errorText || '#ff6666') : darkTheme.text,
                              fontSize: '0.9375rem',
                              lineHeight: '1.7',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {advice.advice}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                </div>
              )}
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
