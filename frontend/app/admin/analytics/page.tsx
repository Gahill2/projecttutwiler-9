'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070'

interface AnalyticsData {
  totalUsers: number
  verifiedUsers: number
  nonVerifiedUsers: number
  recentActivity24h: number
  recentActivity7d: number
  recentActivity30d: number
  verificationRate: number
  recentVerifications: Array<{
    userId: string
    createdAt: string
    scoreBin: string | null
  }>
  statusDistribution: Record<string, number>
  totalCveSubmissions?: number
  verifiedCveSubmissions?: number
  pendingCveSubmissions?: number
  criticalCveSubmissions?: number
}

interface CveSubmission {
  submission_id: string
  user_id: string
  description: string
  severity: string
  cvss_score: number | null
  status: string
  is_verified_user: boolean
  similar_cves: string | null
  created_at: string
  updated_at: string
}

interface PineconeCve {
  id: string
  source: string
  description: string
  base_score?: number
  published?: string
}

interface ThreatAnalysis {
  submission_id?: string
  cve_id?: string
  is_real_threat: boolean
  is_flagged: boolean
  confidence: number
  flags: string[]
  analysis: string
  risk_score: number
}

type TabType = 'dashboard' | 'cves' | 'actions' | 'ai-scanner' | 'users'

export default function AdminAnalytics() {
  const router = useRouter()
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string>('')
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(true)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [checkingStoredKey, setCheckingStoredKey] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [cves, setCves] = useState<CveSubmission[]>([])
  const [pineconeCves, setPineconeCves] = useState<PineconeCve[]>([])
  const [cveFilters, setCveFilters] = useState({
    severity: '',
    status: '',
    userType: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  })
  const [graphView, setGraphView] = useState<'users' | 'verification' | 'activity'>('users')
  const [threatAnalyses, setThreatAnalyses] = useState<Record<string, ThreatAnalysis>>({})
  const [analyzingCves, setAnalyzingCves] = useState<Set<string>>(new Set())
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

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

  useEffect(() => {
    console.log('[Admin] Component mounted')
    setLoading(false)
    const storedKey = localStorage.getItem('admin_api_key')
    setCheckingStoredKey(false)
    console.log('[Admin] Initial load - API key exists:', !!storedKey)
    if (storedKey && storedKey.trim()) {
      setApiKey(storedKey)
      setShowApiKeyInput(false)
      fetchAnalytics(storedKey)
    }
  }, [])

  useEffect(() => {
    console.log('[Admin] Tab changed to:', activeTab)
    const storedKey = localStorage.getItem('admin_api_key')
    console.log('[Admin] Stored API key exists:', !!storedKey)
    
    if (activeTab === 'cves') {
      console.log('[Admin] Loading CVEs tab data')
      if (storedKey && storedKey.trim()) {
        fetchCves(storedKey)
      }
      // Always fetch Pinecone CVEs (no auth required)
      fetchPineconeCves()
    } else if (activeTab === 'ai-scanner') {
      console.log('[Admin] Loading AI Scanner tab data')
      // Load both types for AI Scanner
      if (storedKey && storedKey.trim()) {
        fetchCves(storedKey)
      }
      fetchPineconeCves()
    }
  }, [activeTab])

  // Separate effect for filter changes - only when on CVEs tab
  useEffect(() => {
    if (activeTab !== 'cves') return
    
    const storedKey = localStorage.getItem('admin_api_key')
    if (storedKey && storedKey.trim()) {
      // Debounce filter changes to avoid too many API calls
      const timeoutId = setTimeout(() => {
        fetchCves(storedKey)
      }, 300)
      
      return () => clearTimeout(timeoutId)
    }
  }, [cveFilters.severity, cveFilters.status, cveFilters.userType, cveFilters.sortBy, cveFilters.sortOrder, activeTab])

  const fetchAnalytics = async (key: string) => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/admin/analytics?api_key=${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      
      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Invalid admin API key.')
        setShowApiKeyInput(true)
        localStorage.removeItem('admin_api_key')
        setLoading(false)
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(errorData.error || `Failed to fetch analytics: ${response.statusText}`)
      }

      const data = await response.json()
      setAnalytics(data)
      localStorage.setItem('admin_api_key', key)
      setShowApiKeyInput(false)
    } catch (err) {
      console.error('Analytics error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics.')
    } finally {
      setLoading(false)
    }
  }

  const fetchCves = async (key: string) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        api_key: key,
        ...(cveFilters.severity && { severity: cveFilters.severity }),
        ...(cveFilters.status && { status: cveFilters.status }),
        ...(cveFilters.userType && { user_type: cveFilters.userType }),
        sort_by: cveFilters.sortBy,
        sort_order: cveFilters.sortOrder,
        limit: '100'
      })

      const response = await fetch(`${API_URL}/admin/cves?${params}`, {
        headers: {
          'X-Admin-API-Key': key
        }
      })
      
      if (response.status === 401) {
        setError('Invalid admin API key')
        setShowApiKeyInput(true)
        localStorage.removeItem('admin_api_key')
        setLoading(false)
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch CVEs: ${response.statusText}`)
      }
      
      const data = await response.json()
      setCves(data.cves || [])
    } catch (err) {
      console.error('CVE fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load CVEs')
    } finally {
      setLoading(false)
    }
  }

  const fetchPineconeCves = async () => {
    console.log('[Admin] Fetching Pinecone CVEs from:', `${API_URL}/cve-ingestor/cves/recent?limit=100&days=30`)
    try {
      const response = await fetch(`${API_URL}/cve-ingestor/cves/recent?limit=100&days=30`)
      console.log('[Admin] Pinecone CVEs response status:', response.status, response.ok)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[Admin] Failed to fetch Pinecone CVEs: ${response.statusText}`, errorText)
        return
      }
      
      const data = await response.json()
      console.log('[Admin] Pinecone CVEs raw data:', data)
      // API returns {status: "success", count: N, cves: [...]}
      const cvesList = data.cves || (Array.isArray(data) ? data : [])
      console.log('[Admin] Parsed Pinecone CVEs:', cvesList.length, cvesList)
      setPineconeCves(cvesList)
    } catch (err) {
      console.error('[Admin] Pinecone CVE fetch error:', err)
      // Don't set error state for Pinecone CVEs as it's not critical
    }
  }

  const analyzeCveDescription = async (cveId: string, description: string) => {
    const key = localStorage.getItem('admin_api_key')
    if (!key) {
      setError('Admin API key required')
      return
    }

    // Add to analyzing set
    setAnalyzingCves(prev => new Set(prev).add(cveId))
    setError(null)
    try {
      // Use AI-RAG analyze endpoint to analyze the CVE description
      const response = await fetch(`${API_URL}/ai-rag/analyze-threat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          text: description,
          context: 'cve_analysis'
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to analyze CVE: ${response.statusText}`)
      }
      
      const analysis = await response.json()
      // Store analysis with CVE ID as key
      setThreatAnalyses(prev => ({ 
        ...prev, 
        [cveId]: {
          cve_id: cveId,
          is_real_threat: analysis.is_real_threat !== false,
          is_flagged: analysis.is_flagged === true,
          confidence: analysis.confidence || 0.5,
          flags: analysis.flags || [],
          analysis: analysis.analysis || analysis.reasoning || 'Analysis completed',
          risk_score: analysis.risk_score || 0.5
        }
      }))
    } catch (err) {
      console.error('CVE analysis error:', err)
      setError(err instanceof Error ? err.message : 'Failed to analyze CVE')
    } finally {
      // Remove from analyzing set
      setAnalyzingCves(prev => {
        const next = new Set(prev)
        next.delete(cveId)
        return next
      })
    }
  }

  const analyzeThreat = async (submissionId: string) => {
    const key = localStorage.getItem('admin_api_key')
    if (!key) {
      setError('Admin API key required')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/admin/analyze-threat?api_key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-API-Key': key
        },
        body: JSON.stringify({ SubmissionId: submissionId })
      })

      if (response.status === 401) {
        setError('Invalid admin API key')
        setShowApiKeyInput(true)
        localStorage.removeItem('admin_api_key')
        setLoading(false)
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to analyze threat: ${response.statusText}`)
      }
      
      const analysis = await response.json()
      setThreatAnalyses(prev => ({ ...prev, [submissionId]: analysis }))
    } catch (err) {
      console.error('Threat analysis error:', err)
      setError(err instanceof Error ? err.message : 'Failed to analyze threat')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitApiKey = (e: React.FormEvent) => {
    e.preventDefault()
    if (apiKey.trim()) {
      fetchAnalytics(apiKey.trim())
    }
  }

  if (checkingStoredKey) {
    return (
      <main style={{
        minHeight: '100vh',
        background: darkTheme.bgGradient,
        padding: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '24px',
          padding: '3rem',
          textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: `3px solid ${darkTheme.primary}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1.5rem'
          }} />
          <p style={{ color: darkTheme.textMuted, fontSize: '0.9375rem' }}>Checking credentials...</p>
        </div>
      </main>
    )
  }

  if (showApiKeyInput) {
    return (
      <main style={{
        minHeight: '100vh',
        background: darkTheme.bgGradient,
        padding: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '24px',
          padding: '2.5rem',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          position: 'relative'
        }}>
          <button
            onClick={() => router.push('/portal')}
            style={{
              position: 'absolute',
              top: '1.5rem',
              left: '1.5rem',
              padding: '0.75rem',
              background: darkTheme.card,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '12px',
              color: darkTheme.text,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              width: '44px',
              height: '44px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
              e.currentTarget.style.transform = 'scale(1.05)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.transform = 'scale(1)'
            }}
            title="Go back to portal"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 15l-5-5 5-5" />
            </svg>
          </button>

          <div style={{ paddingLeft: '3.5rem', marginBottom: '1.5rem' }}>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: '800',
              marginBottom: '0.5rem',
              background: darkTheme.greenGradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              letterSpacing: '-0.02em'
            }}>
              Admin Access
          </h1>
            <p style={{ color: darkTheme.textMuted, fontSize: '0.9375rem', margin: 0 }}>
              Enter your admin API key to access the analytics dashboard
          </p>
          </div>

          {error && (
            <div style={{
              padding: '1rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: `1px solid rgba(239, 68, 68, 0.3)`,
              borderRadius: '12px',
              color: darkTheme.danger,
              marginBottom: '1.5rem',
              fontSize: '0.875rem',
              animation: 'slideIn 0.3s ease'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmitApiKey}>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter admin API key"
              style={{
                width: '100%',
                padding: '1rem 1.25rem',
                background: darkTheme.card,
                border: `1px solid ${darkTheme.border}`,
                borderRadius: '16px',
                fontSize: '0.9375rem',
                marginBottom: '1.5rem',
                color: darkTheme.text,
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = darkTheme.primary
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                e.currentTarget.style.transform = 'scale(1.02)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = darkTheme.border
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.transform = 'scale(1)'
              }}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => router.push('/portal')}
                style={{
                  padding: '1rem 1.5rem',
                  fontSize: '0.9375rem',
                  fontWeight: '600',
                  background: darkTheme.card,
                  color: darkTheme.text,
                  border: `1px solid ${darkTheme.border}`,
                  borderRadius: '16px',
                  cursor: 'pointer',
                  flex: 1,
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                Back
              </button>
            <button
              type="submit"
              disabled={!apiKey.trim() || loading}
              style={{
                  padding: '1rem 1.5rem',
                fontSize: '0.9375rem',
                  fontWeight: '700',
                  background: (!apiKey.trim() || loading) 
                    ? 'rgba(255, 255, 255, 0.05)' 
                    : darkTheme.primaryGradient,
                color: 'white',
                border: 'none',
                  borderRadius: '16px',
                cursor: (!apiKey.trim() || loading) ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  flex: 2,
                  boxShadow: (!apiKey.trim() || loading) ? 'none' : '0 4px 20px rgba(99, 102, 241, 0.4)'
              }}
                onMouseEnter={(e) => {
                  if (apiKey.trim() && !loading) {
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.5)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (apiKey.trim() && !loading) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4)'
                  }
                }}
              >
                {loading ? 'Loading...' : !apiKey.trim() ? 'Enter API Key' : 'Access Analytics'}
            </button>
            </div>
          </form>

          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            background: 'rgba(139, 92, 246, 0.1)',
            border: `1px solid rgba(139, 92, 246, 0.3)`,
            borderRadius: '16px',
            fontSize: '0.8125rem',
            color: darkTheme.textMuted
          }}>
            <strong style={{ color: darkTheme.text }}>Demo Key:</strong> demo-admin-key-123
          </div>
        </div>
      </main>
    )
  }

  if (loading && !analytics) {
    return (
      <main style={{
        minHeight: '100vh',
        background: darkTheme.bgGradient,
        padding: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: darkTheme.textMuted }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: `3px solid ${darkTheme.primary}`,
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1.5rem'
          }} />
          <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>Loading analytics...</div>
        </div>
      </main>
    )
  }

  if (error || !analytics) {
    return (
      <main style={{
        minHeight: '100vh',
        background: darkTheme.bgGradient,
        padding: '2rem'
      }}>
        <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '24px',
          padding: '2.5rem',
          maxWidth: '600px',
          margin: '0 auto',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            marginBottom: '0.75rem',
            background: darkTheme.dangerGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Error Loading Analytics
          </h1>
          <p style={{ color: darkTheme.textMuted, marginBottom: '1.5rem', fontSize: '0.9375rem' }}>
            {error || 'Unknown error'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => router.push('/portal')}
              style={{
                padding: '0.875rem 1.5rem',
                fontSize: '0.9375rem',
                fontWeight: '600',
                background: darkTheme.card,
                color: darkTheme.text,
                border: `1px solid ${darkTheme.border}`,
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              Back to Portal
            </button>
          <button
            onClick={() => {
              localStorage.removeItem('admin_api_key')
              setShowApiKeyInput(true)
              setError(null)
            }}
            style={{
                padding: '0.875rem 1.5rem',
                fontSize: '0.9375rem',
                fontWeight: '700',
                background: darkTheme.greenGradient,
              color: 'white',
              border: 'none',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4)'
            }}
          >
            Try Again
          </button>
          </div>
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
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, -20px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#000000',
      color: '#f1f5f9'
    }}>
        {/* Top Header - Forest Green Banner with Navigation */}
        <header style={{
          background: darkTheme.primary,
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 12px rgba(22, 163, 74, 0.25)',
          flexWrap: 'wrap',
          gap: '1rem',
          borderBottom: `1px solid ${darkTheme.borderHover}`
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <span style={{ fontWeight: '800', fontSize: '1.5rem', color: '#ffffff', letterSpacing: '-0.02em' }}>BioGate Admin</span>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {[
                { label: 'Home', path: '/' },
                { label: 'Dashboard', path: '/admin/analytics', active: activeTab === 'dashboard' },
                { label: 'CVEs', path: '/admin/analytics', active: activeTab === 'cves' },
                { label: 'Actions', path: '/admin/analytics', active: activeTab === 'actions' },
                { label: 'AI Scanner', path: '/admin/analytics', active: activeTab === 'ai-scanner' },
                { label: 'Users', path: '/admin/analytics', active: activeTab === 'users' }
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.path === '/admin/analytics') {
                      const tabMap: Record<string, TabType> = {
                        'Dashboard': 'dashboard',
                        'CVEs': 'cves',
                        'Actions': 'actions',
                        'AI Scanner': 'ai-scanner',
                        'Users': 'users'
                      }
                      const targetTab = tabMap[item.label]
                      if (targetTab) {
                        setActiveTab(targetTab)
                        const key = localStorage.getItem('admin_api_key')
                        if (key) {
                          // Fetch data based on tab
                          if (targetTab === 'cves') {
                            fetchCves(key)
                          } else if (targetTab === 'dashboard' && !analytics) {
                            fetchAnalytics(key)
                          } else if (targetTab === 'ai-scanner' && cves.length === 0) {
                            fetchCves(key)
                          }
                        }
                      }
                    } else if (item.path !== '#') {
                      router.push(item.path)
                    }
                  }}
                  style={{
                    padding: '0.625rem 1.25rem',
                    background: item.active ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                    color: item.active ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9375rem',
                    fontWeight: item.active ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!item.active) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                      e.currentTarget.style.color = '#ffffff'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!item.active) {
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
            onClick={() => {
              localStorage.removeItem('admin_api_key')
              setShowApiKeyInput(true)
              setAnalytics(null)
            }}
            style={{
              padding: '0.625rem 1.25rem',
                background: 'rgba(239, 68, 68, 0.9)',
              color: 'white',
              border: 'none',
                borderRadius: '8px',
                fontSize: '0.9375rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 1)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)'
                e.currentTarget.style.transform = 'translateY(0)'
            }}
          >
            Logout
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
          {/* Error Display */}
          {error && (
        <div style={{
              padding: '1rem 1.5rem',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '12px',
              marginBottom: '1.5rem',
              color: '#ef4444',
              fontSize: '0.9375rem',
              fontWeight: '600',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  padding: '0 0.5rem'
                }}
              >
                ×
              </button>
            </div>
          )}
          {/* Page Header */}
          <div style={{ marginBottom: '2rem' }}>
            <p style={{
              color: '#94a3b8',
              fontSize: '0.9375rem',
              margin: 0
            }}>
              Manage users, threats, and system-wide analytics
            </p>
        </div>

          <div style={{ maxWidth: '1920px', margin: '0 auto' }}>
        {/* Tab Content */}
        {activeTab === 'dashboard' && <DashboardTab analytics={analytics} darkTheme={darkTheme} graphView={graphView} setGraphView={setGraphView} hoveredCard={hoveredCard} setHoveredCard={setHoveredCard} />}
        {activeTab === 'cves' && <CvesTab cves={cves} pineconeCves={pineconeCves} cveFilters={cveFilters} setCveFilters={setCveFilters} darkTheme={darkTheme} loading={loading} onRefresh={() => {
          const key = localStorage.getItem('admin_api_key')
          if (key) fetchCves(key)
          fetchPineconeCves()
        }} />}
        {activeTab === 'actions' && <ActionsTab darkTheme={darkTheme} analytics={analytics} onSwitchTab={(tab, filter) => {
          setActiveTab(tab)
          if (tab === 'cves' && filter) {
            setCveFilters(prev => ({ ...prev, status: filter === 'pending' ? 'pending' : '', severity: filter === 'critical' ? 'Critical' : '' }))
            const key = localStorage.getItem('admin_api_key')
            if (key) {
              setTimeout(() => fetchCves(key), 100)
            }
          }
        }} />}
        {activeTab === 'ai-scanner' && <AiScannerTab cves={cves} pineconeCves={pineconeCves} threatAnalyses={threatAnalyses} darkTheme={darkTheme} onAnalyze={analyzeThreat} onAnalyzeCve={analyzeCveDescription} loading={loading} analyzingCves={analyzingCves} onLoadCves={() => {
          const key = localStorage.getItem('admin_api_key')
          if (key) fetchCves(key)
          fetchPineconeCves()
        }} />}
        {activeTab === 'users' && <UsersTab analytics={analytics} darkTheme={darkTheme} loading={loading} />}
          </div>
        </main>
    </div>
    </>
  )
}

// Dashboard Tab with Bento Grid
function DashboardTab({ analytics, darkTheme, graphView, setGraphView, hoveredCard, setHoveredCard }: {
  analytics: AnalyticsData
  darkTheme: any
  graphView: 'users' | 'verification' | 'activity'
  setGraphView: (view: 'users' | 'verification' | 'activity') => void
  hoveredCard: string | null
  setHoveredCard: (id: string | null) => void
}) {
  return (
        <div style={{
          display: 'grid',
      gridTemplateColumns: 'repeat(12, 1fr)',
      gap: '1.5rem',
      gridAutoRows: 'minmax(200px, auto)'
    }}>
      {/* Large Metric Cards - Bento Grid Layout */}
      <BentoCard
        id="total-users"
        colSpan={3}
        rowSpan={1}
        darkTheme={darkTheme}
        hovered={hoveredCard === 'total-users'}
        onHover={() => setHoveredCard('total-users')}
        onLeave={() => setHoveredCard(null)}
      >
        <MetricCard title="Total Users" value={analytics.totalUsers.toLocaleString()} color={darkTheme.primary} darkTheme={darkTheme} />
      </BentoCard>

      <BentoCard
        id="verified-users"
        colSpan={3}
        rowSpan={1}
        darkTheme={darkTheme}
        hovered={hoveredCard === 'verified-users'}
        onHover={() => setHoveredCard('verified-users')}
        onLeave={() => setHoveredCard(null)}
      >
        <MetricCard title="Verified Users" value={analytics.verifiedUsers.toLocaleString()} color={darkTheme.success} darkTheme={darkTheme} />
      </BentoCard>

      <BentoCard
        id="non-verified-users"
        colSpan={3}
        rowSpan={1}
        darkTheme={darkTheme}
        hovered={hoveredCard === 'non-verified-users'}
        onHover={() => setHoveredCard('non-verified-users')}
        onLeave={() => setHoveredCard(null)}
      >
        <MetricCard title="Non-Verified Users" value={analytics.nonVerifiedUsers.toLocaleString()} color={darkTheme.warning} darkTheme={darkTheme} />
      </BentoCard>

      <BentoCard
        id="verification-rate"
        colSpan={3}
        rowSpan={1}
        darkTheme={darkTheme}
        hovered={hoveredCard === 'verification-rate'}
        onHover={() => setHoveredCard('verification-rate')}
        onLeave={() => setHoveredCard(null)}
      >
        <MetricCard title="Verification Rate" value={`${analytics.verificationRate}%`} color={darkTheme.primary} darkTheme={darkTheme} />
      </BentoCard>

      {/* Activity Metrics Row */}
      <BentoCard
        id="activity-24h"
        colSpan={4}
        rowSpan={1}
        darkTheme={darkTheme}
        hovered={hoveredCard === 'activity-24h'}
        onHover={() => setHoveredCard('activity-24h')}
        onLeave={() => setHoveredCard(null)}
      >
        <MetricCard title="Activity (24h)" value={analytics.recentActivity24h.toLocaleString()} color={darkTheme.danger} darkTheme={darkTheme} />
      </BentoCard>

      <BentoCard
        id="activity-7d"
        colSpan={4}
        rowSpan={1}
        darkTheme={darkTheme}
        hovered={hoveredCard === 'activity-7d'}
        onHover={() => setHoveredCard('activity-7d')}
        onLeave={() => setHoveredCard(null)}
      >
        <MetricCard title="Activity (7d)" value={analytics.recentActivity7d.toLocaleString()} color={darkTheme.warning} darkTheme={darkTheme} />
      </BentoCard>

      <BentoCard
        id="activity-30d"
        colSpan={4}
        rowSpan={1}
        darkTheme={darkTheme}
        hovered={hoveredCard === 'activity-30d'}
        onHover={() => setHoveredCard('activity-30d')}
        onLeave={() => setHoveredCard(null)}
      >
        <MetricCard title="Activity (30d)" value={analytics.recentActivity30d.toLocaleString()} color={darkTheme.primary} darkTheme={darkTheme} />
      </BentoCard>

      {/* Graph View - Large Card */}
      <BentoCard
        id="graph-view"
        colSpan={8}
        rowSpan={2}
        darkTheme={darkTheme}
        hovered={hoveredCard === 'graph-view'}
        onHover={() => setHoveredCard('graph-view')}
        onLeave={() => setHoveredCard(null)}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: '800',
              color: darkTheme.text,
              margin: 0,
              letterSpacing: '-0.02em'
            }}>
              Analytics Overview
            </h2>
            <select
              value={graphView}
              onChange={(e) => setGraphView(e.target.value as any)}
              style={{
                padding: '0.75rem 1rem',
                background: darkTheme.card,
                color: darkTheme.text,
                border: `1px solid ${darkTheme.border}`,
                borderRadius: '12px',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = darkTheme.primary
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = darkTheme.border
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              }}
            >
              <option value="users">User Registrations</option>
              <option value="verification">Verification Rates</option>
              <option value="activity">Activity Trends</option>
            </select>
          </div>
        <div style={{
            flex: 1,
            background: darkTheme.surface,
            border: `1px solid ${darkTheme.border}`,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: darkTheme.textMuted,
            fontSize: '1rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              width: '200%',
              height: '200%',
              background: `radial-gradient(circle, rgba(22, 163, 74, 0.12) 0%, transparent 70%)`,
              animation: 'float 6s ease-in-out infinite'
            }} />
            <div style={{ position: 'relative', zIndex: 1 }}>
              {graphView === 'users' && 'User Registrations Over Time'}
              {graphView === 'verification' && 'Verification Rate Trends'}
              {graphView === 'activity' && 'Activity Trends Over Time'}
            </div>
          </div>
        </div>
      </BentoCard>

      {/* Status Distribution - Medium Card */}
      <BentoCard
        id="status-dist"
        colSpan={4}
        rowSpan={2}
        darkTheme={darkTheme}
        hovered={hoveredCard === 'status-dist'}
        onHover={() => setHoveredCard('status-dist')}
        onLeave={() => setHoveredCard(null)}
      >
        <h2 style={{
          fontSize: '1.125rem',
          fontWeight: '800',
          color: darkTheme.text,
          marginBottom: '1.5rem',
          letterSpacing: '-0.02em'
        }}>
          Status Distribution
          </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {Object.entries(analytics.statusDistribution).map(([status, count]) => (
              <div
                key={status}
                style={{
                padding: '1rem',
                background: darkTheme.surface,
                border: `1px solid ${darkTheme.border}`,
                borderRadius: '12px',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                e.currentTarget.style.transform = 'translateX(4px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                e.currentTarget.style.transform = 'translateX(0)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '0.8125rem', color: darkTheme.textMuted, textTransform: 'uppercase', fontWeight: '600' }}>
                  {status}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', color: darkTheme.text }}>
                  {count}
                </div>
                </div>
              </div>
            ))}
          </div>
      </BentoCard>

      {/* CVE Metrics Row */}
      <BentoCard
        id="cve-total"
        colSpan={3}
        rowSpan={1}
        darkTheme={darkTheme}
        hovered={hoveredCard === 'cve-total'}
        onHover={() => setHoveredCard('cve-total')}
        onLeave={() => setHoveredCard(null)}
      >
        <MetricCard title="Total CVEs" value={(analytics.totalCveSubmissions || 0).toLocaleString()} color={darkTheme.primary} darkTheme={darkTheme} />
      </BentoCard>

      <BentoCard
        id="cve-pending"
        colSpan={3}
        rowSpan={1}
        darkTheme={darkTheme}
        hovered={hoveredCard === 'cve-pending'}
        onHover={() => setHoveredCard('cve-pending')}
        onLeave={() => setHoveredCard(null)}
      >
        <MetricCard title="Pending Review" value={(analytics.pendingCveSubmissions || 0).toLocaleString()} color={darkTheme.warning} darkTheme={darkTheme} />
      </BentoCard>

      <BentoCard
        id="cve-critical"
        colSpan={3}
        rowSpan={1}
        darkTheme={darkTheme}
        hovered={hoveredCard === 'cve-critical'}
        onHover={() => setHoveredCard('cve-critical')}
        onLeave={() => setHoveredCard(null)}
      >
        <MetricCard title="Critical CVEs" value={(analytics.criticalCveSubmissions || 0).toLocaleString()} color={darkTheme.danger} darkTheme={darkTheme} />
      </BentoCard>

      <BentoCard
        id="cve-verified"
        colSpan={3}
        rowSpan={1}
        darkTheme={darkTheme}
        hovered={hoveredCard === 'cve-verified'}
        onHover={() => setHoveredCard('cve-verified')}
        onLeave={() => setHoveredCard(null)}
      >
        <MetricCard title="Verified CVEs" value={(analytics.verifiedCveSubmissions || 0).toLocaleString()} color={darkTheme.success} darkTheme={darkTheme} />
      </BentoCard>
        </div>
  )
}

// Bento Grid Card Component
function BentoCard({ id, colSpan, rowSpan, darkTheme, hovered, onHover, onLeave, children }: {
  id: string
  colSpan: number
  rowSpan: number
  darkTheme: any
  hovered: boolean
  onHover: () => void
  onLeave: () => void
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        background: hovered ? darkTheme.cardHover : darkTheme.card,
        border: `1px solid ${hovered ? darkTheme.borderHover : darkTheme.border}`,
        borderRadius: '24px',
        padding: '1.5rem',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        boxShadow: hovered ? '0 12px 40px rgba(0, 0, 0, 0.3)' : '0 4px 20px rgba(0, 0, 0, 0.2)',
        transform: hovered ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {hovered && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(circle at 50% 0%, rgba(22, 163, 74, 0.08), transparent 70%)`,
          pointerEvents: 'none'
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
        {children}
      </div>
    </div>
  )
}

function CvesTab({ cves, pineconeCves, cveFilters, setCveFilters, darkTheme, loading, onRefresh }: {
  cves: CveSubmission[]
  pineconeCves: PineconeCve[]
  cveFilters: any
  setCveFilters: (filters: any) => void
  darkTheme: any
  loading: boolean
  onRefresh: () => void
}) {
  return (
    <div>
      {/* Filters with Glassmorphism */}
      <div style={{
        background: darkTheme.card,
        border: `1px solid ${darkTheme.border}`,
        borderRadius: '20px',
            padding: '1.5rem',
        marginBottom: '1.5rem',
          display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem'
      }}>
        <select
          value={cveFilters.severity}
          onChange={(e) => setCveFilters({ ...cveFilters, severity: e.target.value })}
          style={{
            padding: '0.875rem 1rem',
            background: darkTheme.card,
            color: darkTheme.text,
            border: `1px solid ${darkTheme.border}`,
            borderRadius: '16px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            outline: 'none'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = darkTheme.primary
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = darkTheme.border
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
          }}
        >
          <option value="">All Severities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Moderate">Moderate</option>
          <option value="Low">Low</option>
        </select>

        <select
          value={cveFilters.status}
          onChange={(e) => setCveFilters({ ...cveFilters, status: e.target.value })}
          style={{
            padding: '0.875rem 1rem',
            background: darkTheme.card,
            color: darkTheme.text,
            border: `1px solid ${darkTheme.border}`,
            borderRadius: '16px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            outline: 'none'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = darkTheme.primary
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = darkTheme.border
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
          }}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="resolved">Resolved</option>
        </select>

        <select
          value={cveFilters.userType}
          onChange={(e) => setCveFilters({ ...cveFilters, userType: e.target.value })}
          style={{
            padding: '0.875rem 1rem',
            background: darkTheme.card,
            color: darkTheme.text,
            border: `1px solid ${darkTheme.border}`,
            borderRadius: '16px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            outline: 'none'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = darkTheme.primary
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = darkTheme.border
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
          }}
        >
          <option value="">All Users</option>
          <option value="verified">Verified</option>
          <option value="non_verified">Non-Verified</option>
        </select>

        <select
          value={cveFilters.sortBy}
          onChange={(e) => setCveFilters({ ...cveFilters, sortBy: e.target.value })}
          style={{
            padding: '0.875rem 1rem',
            background: darkTheme.card,
            color: darkTheme.text,
            border: `1px solid ${darkTheme.border}`,
            borderRadius: '16px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            outline: 'none'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = darkTheme.primary
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = darkTheme.border
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
          }}
        >
          <option value="created_at">Sort by Date</option>
          <option value="severity">Sort by Severity</option>
          <option value="cvss_score">Sort by CVSS</option>
          <option value="status">Sort by Status</option>
        </select>

        <select
          value={cveFilters.sortOrder}
          onChange={(e) => setCveFilters({ ...cveFilters, sortOrder: e.target.value })}
          style={{
            padding: '0.875rem 1rem',
            background: darkTheme.card,
            color: darkTheme.text,
            border: `1px solid ${darkTheme.border}`,
            borderRadius: '16px',
            fontSize: '0.875rem',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            outline: 'none'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = darkTheme.primary
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = darkTheme.border
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
          }}
        >
          <option value="desc">Descending</option>
          <option value="asc">Ascending</option>
        </select>

        <button
          onClick={onRefresh}
          disabled={loading}
          style={{
            padding: '0.875rem 1.5rem',
            background: darkTheme.primaryGradient,
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            fontSize: '0.875rem',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.5)'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4)'
            }
          }}
        >
          {loading ? 'Loading...' : 'Refresh CVEs'}
        </button>
          </div>

      {/* CVE List with Glassmorphism */}
          <div style={{
        background: darkTheme.card,
        border: `1px solid ${darkTheme.border}`,
        borderRadius: '24px',
        maxHeight: '700px',
        overflowY: 'auto',
        padding: '1.5rem'
      }}>
        {loading && cves.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: darkTheme.textMuted }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: `3px solid ${darkTheme.primary}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1.5rem'
            }} />
            <div style={{ fontSize: '1.125rem', fontWeight: '600', color: darkTheme.text }}>Loading CVEs...</div>
          </div>
        ) : cves.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: darkTheme.textMuted }}>
            <div style={{ fontSize: '1.125rem', fontWeight: '600', color: darkTheme.text, marginBottom: '0.5rem' }}>No CVEs found</div>
            <div style={{ fontSize: '0.9375rem', marginBottom: '1rem' }}>No CVEs match your current filters, or no CVEs have been submitted yet.</div>
            <button
              onClick={onRefresh}
              style={{
                padding: '0.75rem 1.5rem',
                background: darkTheme.primaryGradient,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '0.875rem',
                fontWeight: '700',
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
              Refresh CVEs
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cves.map(cve => (
              <div
                key={cve.submission_id}
                style={{
            padding: '1.5rem',
                  background: darkTheme.surface,
                  border: `1px solid ${darkTheme.border}`,
                  borderRadius: '20px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                  e.currentTarget.style.borderColor = darkTheme.borderHover
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                  e.currentTarget.style.borderColor = darkTheme.border
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '0.5rem 1rem',
                    background: getSeverityGradient(cve.severity, darkTheme),
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    borderRadius: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                  }}>
                    {cve.severity}
                  </span>
                  <span style={{
                    padding: '0.5rem 1rem',
                    background: cve.is_verified_user ? darkTheme.successGradient : darkTheme.warningGradient,
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    borderRadius: '12px',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                  }}>
                    {cve.is_verified_user ? 'Verified' : 'Non-Verified'}
                  </span>
                  <span style={{
                    padding: '0.5rem 1rem',
                    background: darkTheme.surfaceHover,
                    color: darkTheme.text,
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    borderRadius: '12px',
                    border: `1px solid ${darkTheme.border}`
                  }}>
                    {cve.status}
                  </span>
            </div>
                <p style={{
                  color: darkTheme.text,
                  fontSize: '0.9375rem',
                  margin: '0 0 1rem 0',
                  lineHeight: '1.6',
                  fontWeight: '500'
                }}>
                  {cve.description.substring(0, 250)}{cve.description.length > 250 ? '...' : ''}
                </p>
                <div style={{
                  display: 'flex',
                  gap: '1.5rem',
                  fontSize: '0.8125rem',
                  color: darkTheme.textMuted,
                  fontWeight: '500'
                }}>
                  <span>{new Date(cve.created_at).toLocaleString()}</span>
                  <span>CVSS: {cve.cvss_score?.toFixed(1) || 'N/A'}</span>
                  <span>User: {cve.user_id.substring(0, 8)}...</span>
          </div>
              </div>
            ))}
          </div>
        )}
          </div>

      {/* Pinecone CVEs Section - Always show */}
          <div style={{
        marginTop: '2rem',
        background: darkTheme.card,
        border: `1px solid ${darkTheme.border}`,
        borderRadius: '24px',
        padding: '1.5rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            color: darkTheme.text,
            letterSpacing: '-0.02em',
            margin: 0
          }}>
            CVEs from Pinecone (NVD/CISA)
            </h2>
          {pineconeCves.length > 0 && (
            <span style={{
              padding: '0.5rem 1rem',
              background: darkTheme.primaryGradient,
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: '700',
              borderRadius: '12px'
            }}>
              {pineconeCves.length} CVEs
            </span>
          )}
            </div>
        {loading && pineconeCves.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: darkTheme.textMuted }}>
            <div style={{
              width: '48px',
              height: '48px',
              border: `3px solid ${darkTheme.primary}`,
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }} />
            <div>Loading CVEs from Pinecone...</div>
          </div>
        ) : pineconeCves.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: darkTheme.textMuted }}>
            <div>No CVEs found from Pinecone. They will load automatically.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '500px', overflowY: 'auto' }}>
            {pineconeCves.map((cve, idx) => {
              return (
                <div
                key={cve.id || idx}
                  style={{
                  padding: '1.5rem',
                  background: darkTheme.surface,
                  border: `1px solid ${darkTheme.border}`,
                  borderRadius: '20px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                  e.currentTarget.style.borderColor = darkTheme.borderHover
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                  e.currentTarget.style.borderColor = darkTheme.border
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '0.5rem 1rem',
                    background: darkTheme.primaryGradient,
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    borderRadius: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    {cve.source}
                  </span>
                  {cve.base_score && (
                    <span style={{
                      padding: '0.5rem 1rem',
                      background: darkTheme.surfaceHover,
                      color: darkTheme.text,
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      borderRadius: '12px',
                      border: `1px solid ${darkTheme.border}`
                    }}>
                      CVSS: {cve.base_score.toFixed(1)}
                    </span>
                  )}
                    </div>
                <p style={{
                  color: darkTheme.text,
                  fontSize: '0.9375rem',
                  margin: '0 0 1rem 0',
                  lineHeight: '1.6',
                  fontWeight: '500'
                }}>
                  <strong style={{ color: darkTheme.primary }}>{cve.id}</strong>: {cve.description.substring(0, 250)}{cve.description.length > 250 ? '...' : ''}
                </p>
                {cve.published && (
                  <div style={{ fontSize: '0.8125rem', color: darkTheme.textMuted }}>
                    Published: {new Date(cve.published).toLocaleDateString()}
          </div>
                )}
        </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Actions Tab Component
function ActionsTab({ darkTheme, analytics, onSwitchTab }: { darkTheme: any, analytics: AnalyticsData | null, onSwitchTab?: (tab: TabType, filter?: string) => void }) {
  return (
        <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '1.5rem'
    }}>
      {analytics && analytics.pendingCveSubmissions && analytics.pendingCveSubmissions > 0 && (
        <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.warning}40`,
          borderRadius: '24px',
          padding: '2rem',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={() => onSwitchTab && onSwitchTab('cves', 'pending')}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(245, 158, 11, 0.3)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)'
          e.currentTarget.style.boxShadow = 'none'
        }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '100px',
            height: '100px',
            background: `radial-gradient(circle, ${darkTheme.warning}20, transparent 70%)`,
            borderRadius: '50%',
            transform: 'translate(30%, -30%)'
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: darkTheme.text,
              marginBottom: '0.5rem',
              letterSpacing: '-0.02em'
            }}>
              {analytics.pendingCveSubmissions} Pending Reviews
                    </div>
            <div style={{ fontSize: '0.9375rem', color: darkTheme.textMuted, lineHeight: '1.6' }}>
              Review and prioritize pending CVE submissions requiring immediate attention
                    </div>
                  </div>
                    </div>
                  )}

      {analytics && analytics.criticalCveSubmissions && analytics.criticalCveSubmissions > 0 && (
                    <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.danger}40`,
          borderRadius: '24px',
          padding: '2rem',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={() => onSwitchTab && onSwitchTab('cves', 'critical')}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(239, 68, 68, 0.3)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)'
          e.currentTarget.style.boxShadow = 'none'
        }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '120px',
            height: '120px',
            background: `radial-gradient(circle, ${darkTheme.danger}20, transparent 70%)`,
            borderRadius: '50%',
            transform: 'translate(30%, -30%)',
            animation: 'pulse 2s ease-in-out infinite'
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: darkTheme.text,
              marginBottom: '0.5rem',
              letterSpacing: '-0.02em'
            }}>
              {analytics.criticalCveSubmissions} Critical CVEs
                </div>
            <div style={{ fontSize: '0.9375rem', color: darkTheme.textMuted, lineHeight: '1.6' }}>
              Immediate attention required for critical vulnerabilities that pose significant risk
            </div>
          </div>
                    </div>
                  )}

      <div style={{
        background: darkTheme.card,
        border: `1px solid ${darkTheme.border}`,
        borderRadius: '24px',
        padding: '2rem',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.3)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)'
        e.currentTarget.style.boxShadow = 'none'
      }}
      >
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '100px',
          height: '100px',
          background: `radial-gradient(circle, rgba(22, 163, 74, 0.12), transparent 70%)`,
          borderRadius: '50%',
          transform: 'translate(30%, -30%)'
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: '800',
            color: darkTheme.text,
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em'
          }}>
            System Health Check
                </div>
          <div style={{ fontSize: '0.9375rem', color: darkTheme.textMuted, lineHeight: '1.6' }}>
            Run comprehensive system health diagnostics and performance analysis
                    </div>
                  </div>
      </div>
    </div>
  )
}

// AI Scanner Tab Component
function AiScannerTab({ cves, pineconeCves, threatAnalyses, darkTheme, onAnalyze, onAnalyzeCve, loading, analyzingCves, onLoadCves }: {
  cves: CveSubmission[]
  pineconeCves: PineconeCve[]
  threatAnalyses: Record<string, ThreatAnalysis>
  darkTheme: any
  onAnalyze: (id: string) => void
  onAnalyzeCve: (cveId: string, description: string) => void
  loading: boolean
  analyzingCves: Set<string>
  onLoadCves?: () => void
}) {
  const [analyzing, setAnalyzing] = useState(false)
  
  useEffect(() => {
    console.log('[AI Scanner] useEffect triggered - cves:', cves.length, 'pineconeCves:', pineconeCves.length)
    // Auto-load CVEs when tab is opened if none are loaded
    if ((cves.length === 0 || pineconeCves.length === 0) && onLoadCves) {
      console.log('[AI Scanner] Calling onLoadCves')
      onLoadCves()
    }
  }, [cves.length, pineconeCves.length, onLoadCves])
  
  const flaggedCves = cves.filter(cve => {
    const analysis = threatAnalyses[cve.submission_id]
    return analysis && analysis.is_flagged
  })

  const handleScanAll = async () => {
    if (cves.length === 0) {
      if (onLoadCves) {
        onLoadCves()
        // Wait a bit for CVEs to load
        setTimeout(() => {
          if (cves.length > 0) {
            handleScanAll()
          }
        }, 2000)
      }
      return
    }
    
    setAnalyzing(true)
    try {
      // Analyze all CVEs that haven't been analyzed yet
      const unanalyzedCves = cves.filter(cve => !threatAnalyses[cve.submission_id])
      for (const cve of unanalyzedCves) {
        await onAnalyze(cve.submission_id)
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (err) {
      console.error('Error scanning CVEs:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <>
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
          background: darkTheme.primaryGradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '0.75rem',
          letterSpacing: '-0.02em'
        }}>
          AI Threat Scanner
          </h2>
        <p style={{ fontSize: '0.9375rem', color: darkTheme.textMuted, marginBottom: '1.5rem', lineHeight: '1.6' }}>
          AI-powered analysis to identify suspicious or low-quality CVE submissions. Automatically flags potential test entries, spam, or low-quality reports.
        </p>
        <button
          onClick={handleScanAll}
          disabled={loading || analyzing || cves.length === 0}
          style={{
            padding: '1rem 2rem',
            background: darkTheme.primaryGradient,
            color: 'white',
            border: 'none',
            borderRadius: '16px',
            fontSize: '0.9375rem',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.5)'
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4)'
            }
          }}
        >
          {analyzing ? 'Analyzing...' : loading ? 'Loading...' : cves.length === 0 ? 'No CVEs to Scan' : 'Scan All CVEs'}
        </button>
      </div>

      {flaggedCves.length > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${darkTheme.danger}40`,
          borderRadius: '24px',
          padding: '2rem',
          marginBottom: '2rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '800',
            color: darkTheme.danger,
            marginBottom: '1.5rem',
            letterSpacing: '-0.02em'
          }}>
            Flagged Threats ({flaggedCves.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {flaggedCves.map(cve => {
              const analysis = threatAnalyses[cve.submission_id]
              return (
                <div
                  key={cve.submission_id}
                  style={{
                    padding: '1.5rem',
                    background: darkTheme.card,
                    border: `1px solid ${darkTheme.danger}40`,
                    borderRadius: '20px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                    e.currentTarget.style.transform = 'translateX(4px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '0.5rem 1rem',
                      background: darkTheme.dangerGradient,
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
                    }}>
                      FLAGGED
                    </span>
                    <span style={{
                      padding: '0.5rem 1rem',
                      background: darkTheme.surfaceHover,
                      color: darkTheme.text,
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      borderRadius: '12px',
                      border: `1px solid ${darkTheme.border}`
                    }}>
                      Risk: {(analysis.risk_score * 100).toFixed(0)}%
                    </span>
                    </div>
                  <p style={{
                    color: darkTheme.text,
                    fontSize: '0.9375rem',
                    marginBottom: '1rem',
                    lineHeight: '1.6',
                    fontWeight: '500'
                  }}>
                    {cve.description.substring(0, 200)}...
                  </p>
                  <div style={{
                    fontSize: '0.875rem',
                    color: darkTheme.textMuted,
                    marginBottom: '1rem',
                    padding: '1rem',
                    background: darkTheme.surface,
                    borderRadius: '12px',
                    border: `1px solid ${darkTheme.border}`
                  }}>
                    {analysis.analysis}
                  </div>
                  {analysis.flags.length > 0 && (
                    <div style={{ fontSize: '0.875rem' }}>
                      <strong style={{ color: darkTheme.text, fontWeight: '700' }}>Flags:</strong>
                      <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {analysis.flags.map((flag, idx) => (
                          <span
                            key={idx}
                            style={{
                              padding: '0.5rem 1rem',
                              background: 'rgba(239, 68, 68, 0.2)',
                              color: darkTheme.danger,
                              borderRadius: '12px',
                              fontSize: '0.8125rem',
                              fontWeight: '600',
                              border: `1px solid ${darkTheme.danger}40`
                            }}
                          >
                            {flag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

        <div style={{
        background: darkTheme.card,
        border: `1px solid ${darkTheme.border}`,
        borderRadius: '24px',
        maxHeight: '600px',
        overflowY: 'auto',
        padding: '1.5rem'
      }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '800',
          color: darkTheme.text,
          padding: '0 0 1.5rem 0',
          borderBottom: `1px solid ${darkTheme.border}`,
          marginBottom: '1.5rem',
          letterSpacing: '-0.02em'
        }}>
          User-Submitted CVEs ({cves.length})
        </h3>
        {cves.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: darkTheme.textMuted }}>
            <div>No user-submitted CVEs found. They will appear here once users submit issues.</div>
            {onLoadCves && (
              <button
                onClick={onLoadCves}
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1.5rem',
                  background: darkTheme.primaryGradient,
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Refresh
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cves.map(cve => {
            const analysis = threatAnalyses[cve.submission_id]
            if (!analysis) {
              return (
                <div
                  key={cve.submission_id}
                  style={{
                    padding: '1.5rem',
                    background: darkTheme.surface,
                    border: `1px solid ${darkTheme.border}`,
                    borderRadius: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.3s ease'
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
                  <div style={{ flex: 1 }}>
                    <p style={{
                      color: darkTheme.text,
                      fontSize: '0.9375rem',
                      margin: 0,
                      lineHeight: '1.6',
                      fontWeight: '500'
                    }}>
                      {cve.description.substring(0, 120)}...
                    </p>
                  </div>
                  <button
                    onClick={() => onAnalyze(cve.submission_id)}
                    disabled={loading}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: darkTheme.greenGradient,
                      color: 'white',
                      border: 'none',
                      borderRadius: '16px',
                      fontSize: '0.875rem',
                      fontWeight: '700',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                      marginLeft: '1rem'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.transform = 'translateY(-2px)'
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(99, 102, 241, 0.4)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.currentTarget.style.transform = 'translateY(0)'
                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.3)'
                      }
                    }}
                  >
                    Analyze
                  </button>
                </div>
              )
            }
            return (
              <div
                key={cve.submission_id}
                style={{
                  padding: '1.5rem',
                  background: analysis.is_flagged ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${analysis.is_flagged ? 'rgba(239, 68, 68, 0.4)' : darkTheme.border}`,
                  borderRadius: '20px',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = analysis.is_flagged ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.06)'
                  e.currentTarget.style.transform = 'translateX(4px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = analysis.is_flagged ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.03)'
                  e.currentTarget.style.transform = 'translateX(0)'
                }}
              >
                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '0.5rem 1rem',
                    background: analysis.is_real_threat ? darkTheme.successGradient : darkTheme.warningGradient,
                    color: 'white',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    borderRadius: '12px',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                  }}>
                    {analysis.is_real_threat ? 'Real Threat' : 'Suspicious'}
                  </span>
                  {analysis.is_flagged && (
                    <span style={{
                      padding: '0.5rem 1rem',
                      background: darkTheme.dangerGradient,
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
                    }}>
                      FLAGGED
                    </span>
                  )}
                </div>
                <p style={{
                  color: darkTheme.text,
                  fontSize: '0.9375rem',
                  marginBottom: '1rem',
                  lineHeight: '1.6',
                  fontWeight: '500'
                }}>
                  {cve.description.substring(0, 200)}...
                </p>
                <div style={{
                  fontSize: '0.875rem',
                  color: darkTheme.textMuted,
                  padding: '1rem',
                  background: darkTheme.surface,
                  borderRadius: '12px',
                  border: `1px solid ${darkTheme.border}`
                }}>
                  {analysis.analysis}
                </div>
              </div>
            )
            })}
          </div>
        )}
        </div>

      {/* Pinecone CVEs Section - Clickable for Analysis - Always show */}
        <div style={{
        background: darkTheme.card,
        border: `1px solid ${darkTheme.border}`,
        borderRadius: '24px',
        padding: '2rem',
        marginTop: '2rem'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '800',
            color: darkTheme.text,
            letterSpacing: '-0.02em',
            margin: 0
          }}>
            CVEs from Pinecone (NVD/CISA) - Click to Analyze
          </h3>
          {pineconeCves.length > 0 && (
            <span style={{
              padding: '0.5rem 1rem',
              background: darkTheme.primaryGradient,
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: '700',
              borderRadius: '12px'
            }}>
              {pineconeCves.length} CVEs
            </span>
          )}
            </div>
        {(() => {
          if (loading && pineconeCves.length === 0) {
            return (
              <div style={{ padding: '2rem', textAlign: 'center', color: darkTheme.textMuted }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  border: `3px solid ${darkTheme.primary}`,
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 1rem'
                }} />
                <div>Loading CVEs from Pinecone...</div>
              </div>
            )
          }
          if (pineconeCves.length === 0) {
            return (
              <div style={{ padding: '2rem', textAlign: 'center', color: darkTheme.textMuted }}>
                <div style={{ marginBottom: '1rem' }}>No CVEs found from Pinecone yet. Click "Load CVEs" to fetch them.</div>
                {onLoadCves && (
                  <button
                    onClick={onLoadCves}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: darkTheme.primaryGradient,
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      fontSize: '0.875rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.opacity = '0.9'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.opacity = '1'
                    }}
                  >
                    Load CVEs from Pinecone
                  </button>
                )}
              </div>
            )
          }
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '600px', overflowY: 'auto' }}>
            {pineconeCves.map((cve, idx) => {
              const analysis = threatAnalyses[cve.id]
              const isAnalyzing = analyzingCves.has(cve.id)
              return (
                <div
                  key={cve.id || idx}
                  onClick={() => !isAnalyzing && onAnalyzeCve(cve.id, cve.description)}
                  style={{
                    padding: '1.5rem',
                    background: analysis?.is_flagged ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${analysis?.is_flagged ? 'rgba(239, 68, 68, 0.4)' : darkTheme.border}`,
                    borderRadius: '20px',
                    transition: 'all 0.3s ease',
                    cursor: isAnalyzing ? 'wait' : 'pointer',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isAnalyzing) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                      e.currentTarget.style.borderColor = darkTheme.borderHover
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.2)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isAnalyzing) {
                      e.currentTarget.style.background = analysis?.is_flagged ? 'rgba(239, 68, 68, 0.05)' : 'rgba(255, 255, 255, 0.03)'
                      e.currentTarget.style.borderColor = analysis?.is_flagged ? 'rgba(239, 68, 68, 0.4)' : darkTheme.border
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '0.5rem 1rem',
                      background: darkTheme.primaryGradient,
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      borderRadius: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {cve.source}
                    </span>
                    {cve.base_score && (
                      <span style={{
                        padding: '0.5rem 1rem',
                        background: darkTheme.surfaceHover,
                        color: darkTheme.text,
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        borderRadius: '12px',
                        border: `1px solid ${darkTheme.border}`
                      }}>
                        CVSS: {cve.base_score.toFixed(1)}
                      </span>
                    )}
                    {analysis && (
                      <>
                        <span style={{
                          padding: '0.5rem 1rem',
                          background: analysis.is_real_threat ? darkTheme.successGradient : darkTheme.warningGradient,
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          borderRadius: '12px'
                        }}>
                          {analysis.is_real_threat ? 'Real Threat' : 'Suspicious'}
                        </span>
                        {analysis.is_flagged && (
                          <span style={{
                            padding: '0.5rem 1rem',
                            background: darkTheme.dangerGradient,
                            color: 'white',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            borderRadius: '12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            FLAGGED
                          </span>
                        )}
                      </>
                    )}
                    {isAnalyzing && (
                      <span style={{
                        padding: '0.5rem 1rem',
                        background: darkTheme.surfaceHover,
                        color: darkTheme.primary,
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        borderRadius: '12px'
                      }}>
                        Analyzing...
                      </span>
                    )}
                  </div>
                  <p style={{
                    color: darkTheme.text,
                    fontSize: '0.9375rem',
                    marginBottom: '1rem',
                    lineHeight: '1.6',
                    fontWeight: '500'
                  }}>
                    <strong style={{ color: darkTheme.primary }}>{cve.id}</strong>: {cve.description.substring(0, 200)}{cve.description.length > 200 ? '...' : ''}
                  </p>
                  {analysis && (
                    <div style={{
                      fontSize: '0.875rem',
                      color: darkTheme.textMuted,
          padding: '1rem',
                      background: darkTheme.surface,
                      borderRadius: '12px',
                      border: `1px solid ${darkTheme.border}`
                    }}>
                      <strong>AI Analysis:</strong> {analysis.analysis}
                      {analysis.flags && analysis.flags.length > 0 && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <strong>Flags:</strong> {analysis.flags.join(', ')}
                        </div>
                      )}
                      <div style={{ marginTop: '0.5rem', fontSize: '0.8125rem' }}>
                        Confidence: {(analysis.confidence * 100).toFixed(0)}% | Risk Score: {(analysis.risk_score * 100).toFixed(0)}%
                      </div>
                    </div>
                  )}
                  {!analysis && !isAnalyzing && (
                    <div style={{
                      fontSize: '0.8125rem',
                      color: darkTheme.textMuted,
                      fontStyle: 'italic',
                      marginTop: '0.5rem'
                    }}>
                      Click to analyze with AI
                    </div>
                  )}
                </div>
              )
            })}
            </div>
          )
        })()}
      </div>
    </>
  )
}

function MetricCard({ title, value, color, darkTheme }: { title: string; value: string; color: string; darkTheme: any }) {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
    <div style={{
        fontSize: '0.75rem',
        fontWeight: '700',
        color: darkTheme.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: '1rem'
      }}>
        {title}
      </div>
      <div style={{
        fontSize: '2.5rem',
        fontWeight: '800',
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        letterSpacing: '-0.03em',
        lineHeight: '1'
      }}>
        {value}
      </div>
    </div>
  )
}

function getSeverityGradient(severity: string, darkTheme: any): string {
  switch (severity.toLowerCase()) {
    case 'critical': return darkTheme.dangerGradient
    case 'high': return darkTheme.warningGradient
    case 'moderate': return darkTheme.primaryGradient
    case 'low': return darkTheme.successGradient
    default: return 'rgba(255, 255, 255, 0.1)'
  }
}

// Users Tab Component
function UsersTab({ analytics, darkTheme, loading }: { analytics: AnalyticsData | null; darkTheme: any; loading: boolean }) {
  const [users, setUsers] = useState<any[]>([])
  const [fetchingUsers, setFetchingUsers] = useState(false)

  useEffect(() => {
    const fetchUsers = async () => {
      const key = localStorage.getItem('admin_api_key')
      if (!key || !analytics) return

      setFetchingUsers(true)
      try {
        // Try to fetch users from analytics or make a separate call
        // For now, we'll use the analytics data to show user stats
        const response = await fetch(`${API_URL}/admin/analytics?api_key=${encodeURIComponent(key)}`)
        if (response.ok) {
          const data = await response.json()
          // If backend provides user list, use it; otherwise use analytics data
          if (data.users) {
            setUsers(data.users)
          }
        }
      } catch (err) {
        console.error('Failed to fetch users:', err)
      } finally {
        setFetchingUsers(false)
      }
    }

    if (analytics) {
      fetchUsers()
    }
  }, [analytics])

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    }}>
      {/* User Statistics Cards */}
      <div style={{
        background: darkTheme.card,
        border: `1px solid ${darkTheme.border}`,
        borderRadius: '24px',
        padding: '2rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          fontSize: '0.75rem',
          color: darkTheme.textMuted,
          fontWeight: '700',
          marginBottom: '1rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>
          Total Users
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
          {analytics?.totalUsers.toLocaleString() || '0'}
        </div>
      </div>

      <div style={{
        background: darkTheme.card,
        border: `1px solid ${darkTheme.border}`,
        borderRadius: '24px',
        padding: '2rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          fontSize: '0.75rem',
          color: darkTheme.textMuted,
          fontWeight: '700',
          marginBottom: '1rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>
          Verified Users
        </div>
        <div style={{
          fontSize: '3rem',
          fontWeight: '800',
          background: darkTheme.successGradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '0.5rem',
          lineHeight: 1,
          letterSpacing: '-0.03em'
        }}>
          {analytics?.verifiedUsers.toLocaleString() || '0'}
        </div>
        <div style={{
          fontSize: '0.8125rem',
          color: darkTheme.textMuted,
          fontWeight: '600'
        }}>
          {analytics ? `${((analytics.verifiedUsers / analytics.totalUsers) * 100).toFixed(1)}% of total` : 'N/A'}
        </div>
      </div>

      <div style={{
        background: darkTheme.card,
        border: `1px solid ${darkTheme.border}`,
        borderRadius: '24px',
        padding: '2rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          fontSize: '0.75rem',
          color: darkTheme.textMuted,
          fontWeight: '700',
          marginBottom: '1rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>
          Non-Verified Users
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
          {analytics?.nonVerifiedUsers.toLocaleString() || '0'}
        </div>
        <div style={{
          fontSize: '0.8125rem',
          color: darkTheme.textMuted,
          fontWeight: '600'
        }}>
          {analytics ? `${((analytics.nonVerifiedUsers / analytics.totalUsers) * 100).toFixed(1)}% of total` : 'N/A'}
        </div>
      </div>

      <div style={{
        background: darkTheme.card,
        border: `1px solid ${darkTheme.border}`,
        borderRadius: '24px',
        padding: '2rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)'
      }}>
        <div style={{
          fontSize: '0.75rem',
          color: darkTheme.textMuted,
          fontWeight: '700',
          marginBottom: '1rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em'
        }}>
          Verification Rate
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
          {analytics?.verificationRate.toFixed(1) || '0'}%
        </div>
      </div>

      {/* Recent Verifications */}
      {analytics?.recentVerifications && analytics.recentVerifications.length > 0 && (
        <div style={{
          gridColumn: '1 / -1',
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
            Recent Verifications
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {analytics.recentVerifications.map((verification, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1rem 1.25rem',
                  background: darkTheme.surface,
                  border: `1px solid ${darkTheme.border}`,
                  borderRadius: '16px',
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ fontWeight: '700', color: darkTheme.text, fontSize: '0.9375rem' }}>
                    User: {verification.userId.substring(0, 8)}...
                  </div>
                  {verification.scoreBin && (
                    <span style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '12px',
                      background: darkTheme.primaryGradient,
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                    }}>
                      Score: {verification.scoreBin}
                    </span>
                  )}
                  <div style={{ fontSize: '0.8125rem', color: darkTheme.textMuted }}>
                    {new Date(verification.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
