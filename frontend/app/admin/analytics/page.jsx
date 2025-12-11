'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070'

export default function AdminAnalytics() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [apiKey, setApiKey] = useState('')
  const [showApiKeyInput, setShowApiKeyInput] = useState(true)
  const [analytics, setAnalytics] = useState(null)
  const [checkingStoredKey, setCheckingStoredKey] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [cves, setCves] = useState([])
  const [pineconeCves, setPineconeCves] = useState([])
  const [cveFilters, setCveFilters] = useState({
    severity: '',
    status: '',
    userType: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  })
  const [graphView, setGraphView] = useState('users')
  const [threatAnalyses, setThreatAnalyses] = useState({})
  const [analyzingCves, setAnalyzingCves] = useState(new Set())
  const [hoveredCard, setHoveredCard] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const darkTheme = {
    // Stripe-inspired dark base colors
    bg: '#0a0a0a',
    bgGradient: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
    surface: '#161616',
    surfaceHover: '#1f1f1f',
    card: '#1a1a1a',
    cardHover: '#242424',
    border: 'rgba(20, 83, 45, 0.3)',
    borderLight: 'rgba(20, 83, 45, 0.15)',
    borderHover: 'rgba(20, 83, 45, 0.5)',
    // Clean text colors
    text: '#fafafa',
    textMuted: '#a3a3a3',
    textSubtle: '#737373',
    // Dark green accents (tactical, cybersecurity feel)
    primary: '#14532d',
    primaryGradient: 'linear-gradient(135deg, #14532d 0%, #0d4a1f 100%)',
    primaryHover: '#166534',
    // Status colors
    success: '#14532d',
    successGradient: 'linear-gradient(135deg, #14532d 0%, #0d4a1f 100%)',
    warning: '#eab308',
    warningGradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
    danger: '#ef4444',
    dangerGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    green: '#14532d',
    greenGradient: 'linear-gradient(135deg, #14532d 0%, #0d4a1f 100%)'
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

  const fetchAnalytics = async (key) => {
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

  const fetchCves = async (key) => {
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
        limit: '500'
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

  const analyzeCveDescription = async (cveId, description) => {
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

  const analyzeThreat = async (submissionId) => {
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

  const handleSubmitApiKey = (e) => {
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
        /* Fix dropdown option contrast */
        select option {
          background: #1a1a1a !important;
          color: #fafafa !important;
          padding: 0.5rem 1rem;
        }
        select option:hover,
        select option:focus,
        select option:checked {
          background: #242424 !important;
          color: #fafafa !important;
        }
      `}</style>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: '#000000',
      color: '#f1f5f9'
    }}>
        {/* Top Header - Dark Green/Black Banner with Navigation */}
        <header style={{
          background: '#000000',
          borderBottom: `2px solid ${darkTheme.primary}`,
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 12px rgba(20, 83, 45, 0.3)',
          flexWrap: 'nowrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: '800', fontSize: '1.5rem', color: '#ffffff', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>BioGate Admin</span>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {[
                { label: 'Dashboard', path: '/admin/analytics', active: activeTab === 'dashboard' },
                { label: 'CVEs', path: '/admin/analytics', active: activeTab === 'cves' },
                { label: 'Fake CVE Detection', path: '/admin/analytics', active: activeTab === 'fake-cve-detection' },
                { label: 'Actions', path: '/admin/analytics', active: activeTab === 'actions' },
                { label: 'AI Scanner', path: '/admin/analytics', active: activeTab === 'ai-scanner' },
                { label: 'Users', path: '/admin/analytics', active: activeTab === 'users' }
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.path === '/admin/analytics') {
                      const tabMap = {
                        'Dashboard': 'dashboard',
                        'CVEs': 'cves',
                        'Fake CVE Detection': 'fake-cve-detection',
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
        {activeTab === 'fake-cve-detection' && <FakeCveDetectionTab analytics={analytics} darkTheme={darkTheme} loading={loading} />}
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

// Chart Components
function UserRegistrationsChart({ analytics, darkTheme, timeRange = '30d' }) {
  // Use actual analytics data to create a trend
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  // Distribute total users across 7 days with a realistic trend
  const baseValue = Math.floor(analytics.totalUsers / 7)
  const data = days.map((day, i) => {
    // Create a trend: fewer users early in week, more later
    const trend = 1 + (i * 0.15)
    const variation = (Math.sin(i * 0.8) * 0.2) + 1
    return {
      day,
      value: Math.max(1, Math.floor(baseValue * trend * variation))
    }
  })
  
  const maxValue = Math.max(...data.map(d => d.value), 1)
  const width = 800
  const height = 400
  const padding = { top: 40, right: 40, bottom: 60, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom
  
  const points = data.map((d, i) => {
    const x = padding.left + (i * chartWidth / (data.length - 1))
    const y = padding.top + chartHeight - (d.value / maxValue) * chartHeight
    return `${x},${y}`
  }).join(' ')
  
  // Area under curve for fill effect
  const areaPoints = `${padding.left},${padding.top + chartHeight} ${points} ${padding.left + chartWidth},${padding.top + chartHeight}`
  
  // Y-axis labels
  const yAxisSteps = 6
  const yAxisValues = Array.from({ length: yAxisSteps }, (_, i) => {
    return Math.floor((maxValue / (yAxisSteps - 1)) * i)
  })
  
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.125rem', color: darkTheme.text, margin: 0, fontWeight: '800' }}>
          User Growth Trend
        </h3>
        <span style={{ fontSize: '0.875rem', color: darkTheme.textMuted, fontWeight: '600' }}>
          {analytics.totalUsers.toLocaleString()} total users
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '350px' }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" style={{ maxHeight: '100%' }}>
          {/* Grid lines - horizontal */}
          {yAxisValues.map((value, i) => {
            const y = padding.top + chartHeight - (value / maxValue) * chartHeight
            return (
              <g key={`grid-${i}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={padding.left + chartWidth}
                  y2={y}
                  stroke={darkTheme.border}
                  strokeWidth="1"
                  opacity="0.3"
                  strokeDasharray="4,4"
                />
                <text
                  x={padding.left - 15}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill={darkTheme.textMuted}
                  fontWeight="600"
                >
                  {value.toLocaleString()}
                </text>
              </g>
            )
          })}
          
          {/* Grid lines - vertical */}
          {data.map((_, i) => {
            const x = padding.left + (i * chartWidth / (data.length - 1))
            return (
              <line
                key={`v-grid-${i}`}
                x1={x}
                y1={padding.top}
                x2={x}
                y2={padding.top + chartHeight}
                stroke={darkTheme.border}
                strokeWidth="0.5"
                opacity="0.15"
              />
            )
          })}
          
          {/* Area fill with gradient */}
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={darkTheme.primary} stopOpacity="0.3" />
              <stop offset="100%" stopColor={darkTheme.primary} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <polygon
            points={areaPoints}
            fill="url(#areaGradient)"
          />
          
          {/* Line chart with gradient */}
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={darkTheme.primary} />
              <stop offset="100%" stopColor={darkTheme.primaryHover} />
            </linearGradient>
          </defs>
          <polyline
            points={points}
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Data points with hover effect */}
          {data.map((d, i) => {
            const x = padding.left + (i * chartWidth / (data.length - 1))
            const y = padding.top + chartHeight - (d.value / maxValue) * chartHeight
            return (
              <g key={i}>
                {/* Connection line to point */}
                <line
                  x1={x}
                  y1={padding.top + chartHeight}
                  x2={x}
                  y2={y}
                  stroke={darkTheme.primary}
                  strokeWidth="1"
                  opacity="0.2"
                  strokeDasharray="2,2"
                />
                {/* Data point circle */}
                <circle
                  cx={x}
                  cy={y}
                  r="6"
                  fill="white"
                  stroke={darkTheme.primary}
                  strokeWidth="3"
                />
                <circle
                  cx={x}
                  cy={y}
                  r="3"
                  fill={darkTheme.primary}
                />
                {/* Value label above point */}
                <text
                  x={x}
                  y={y - 15}
                  textAnchor="middle"
                  fontSize="13"
                  fill={darkTheme.text}
                  fontWeight="800"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                >
                  {d.value.toLocaleString()}
                </text>
                {/* Day label below */}
                <text
                  x={x}
                  y={padding.top + chartHeight + 25}
                  textAnchor="middle"
                  fontSize="12"
                  fill={darkTheme.textMuted}
                  fontWeight="700"
                >
                  {d.day}
                </text>
              </g>
            )
          })}
          
          {/* Axis labels */}
          <text
            x={width / 2}
            y={height - 10}
            textAnchor="middle"
            fontSize="14"
            fill={darkTheme.textMuted}
            fontWeight="600"
          >
            Day of Week
          </text>
          <text
            x={20}
            y={height / 2}
            textAnchor="middle"
            fontSize="14"
            fill={darkTheme.textMuted}
            fontWeight="600"
            transform={`rotate(-90, 20, ${height / 2})`}
          >
            Number of Users
          </text>
        </svg>
      </div>
    </div>
  )
}

function VerificationRateChart({ analytics, darkTheme, timeRange = '30d' }) {
  const data = [
    { label: 'Verified', value: analytics.verifiedUsers, color: darkTheme.primary },
    { label: 'Non-Verified', value: analytics.nonVerifiedUsers, color: darkTheme.warning }
  ]
  const total = analytics.totalUsers || 1
  
  // Create a pie chart using SVG - appropriately sized
  const radius = 120
  const centerX = 200
  const centerY = 200
  const svgSize = 400
  let currentAngle = -90 // Start at top
  
  const segments = data.map(item => {
    const percentage = (item.value / total) * 100
    const angle = (percentage / 100) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle
    
    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180
    const x1 = centerX + radius * Math.cos(startRad)
    const y1 = centerY + radius * Math.sin(startRad)
    const x2 = centerX + radius * Math.cos(endRad)
    const y2 = centerY + radius * Math.sin(endRad)
    const largeArc = angle > 180 ? 1 : 0
    
    // Calculate label position
    const midAngle = (startAngle + endAngle) / 2
    const midRad = (midAngle * Math.PI) / 180
    const labelRadius = radius * 0.7
    const labelX = centerX + labelRadius * Math.cos(midRad)
    const labelY = centerY + labelRadius * Math.sin(midRad)
    
    return {
      ...item,
      percentage,
      path: `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`,
      labelX,
      labelY,
      midAngle
    }
  })
  
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <h3 style={{ fontSize: '1.125rem', color: darkTheme.text, margin: 0, fontWeight: '800' }}>
          Verification Status Distribution
        </h3>
        <span style={{ fontSize: '0.875rem', color: darkTheme.textMuted, fontWeight: '600' }}>
          {analytics.verificationRate.toFixed(1)}% verified rate ({timeRange})
        </span>
      </div>
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '1.5rem', 
        minHeight: '300px',
        maxHeight: '100%',
        overflow: 'visible',
        padding: '1rem 0'
      }}>
        <svg 
          width="400" 
          height="400" 
          viewBox={`0 0 ${svgSize} ${svgSize}`} 
          preserveAspectRatio="xMidYMid meet" 
          style={{ 
            width: '400px',
            height: '400px',
            maxWidth: '100%',
            maxHeight: '100%',
            flexShrink: 0
          }}
        >
          <defs>
            <filter id="shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3"/>
            </filter>
          </defs>
          {segments.map((segment, i) => (
            <g key={i}>
              <path
                d={segment.path}
                fill={segment.color}
                stroke={darkTheme.card}
                strokeWidth="4"
                filter="url(#shadow)"
                opacity="0.95"
              />
              {/* Segment label */}
              <text
                x={segment.labelX}
                y={segment.labelY}
                textAnchor="middle"
                fontSize="18"
                fill="white"
                fontWeight="800"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
              >
                {segment.percentage.toFixed(1)}%
              </text>
            </g>
          ))}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius * 0.65}
            fill={darkTheme.card}
            stroke={darkTheme.border}
            strokeWidth="2"
          />
          <text
            x={centerX}
            y={centerY - 20}
            textAnchor="middle"
            fontSize="48"
            fontWeight="800"
            fill={darkTheme.text}
          >
            {analytics.verificationRate.toFixed(0)}%
          </text>
          <text
            x={centerX}
            y={centerY + 20}
            textAnchor="middle"
            fontSize="18"
            fill={darkTheme.textMuted}
            fontWeight="700"
          >
            Verified
          </text>
        </svg>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '1rem', 
          flex: 1, 
          minWidth: '250px',
          maxWidth: '350px',
          overflow: 'visible'
        }}>
          {data.map((item, i) => {
            const percentage = (item.value / total) * 100
            return (
              <div key={i} style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.75rem',
                padding: '1rem 1.25rem',
                background: darkTheme.surface,
                borderRadius: '12px',
                border: `1px solid ${darkTheme.border}`,
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      background: item.color,
                      boxShadow: `0 2px 4px ${item.color}40`,
                      flexShrink: 0
                    }} />
                    <span style={{ 
                      fontSize: '0.9375rem', 
                      color: darkTheme.text, 
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {item.label}
                    </span>
                  </div>
                  <span style={{ 
                    fontSize: '1.125rem', 
                    color: darkTheme.text, 
                    fontWeight: '800',
                    flexShrink: 0
                  }}>
                    {item.value.toLocaleString()}
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '12px',
                  background: darkTheme.card,
                  borderRadius: '6px',
                  overflow: 'hidden',
                  border: `1px solid ${darkTheme.border}`
                }}>
                  <div style={{
                    width: `${percentage}%`,
                    height: '100%',
                    background: `linear-gradient(90deg, ${item.color} 0%, ${item.color}dd 100%)`,
                    borderRadius: '6px',
                    transition: 'width 0.5s ease',
                    boxShadow: `0 2px 4px ${item.color}40`
                  }} />
                </div>
                <div style={{ 
                  fontSize: '0.8125rem', 
                  color: darkTheme.textMuted, 
                  fontWeight: '600',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {percentage.toFixed(1)}% of total users
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ActivityTrendsChart({ analytics, darkTheme, timeRange = '30d' }) {
  // Filter data based on selected timeRange
  const allData = [
    { period: '24h', value: analytics.recentActivity24h, color: darkTheme.danger, label: 'Last 24 Hours' },
    { period: '7d', value: analytics.recentActivity7d, color: darkTheme.warning, label: 'Last 7 Days' },
    { period: '30d', value: analytics.recentActivity30d, color: darkTheme.primary, label: 'Last 30 Days' }
  ]
  
  // Show only the selected time range or all if not matching
  const data = timeRange === '24h' ? [allData[0]] :
               timeRange === '7d' ? [allData[1]] :
               timeRange === '30d' ? [allData[2]] :
               timeRange === '90d' ? allData : allData
  const maxValue = Math.max(...data.map(d => d.value), 1)
  const maxBarHeight = 280
  
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.125rem', color: darkTheme.text, margin: 0, fontWeight: '800' }}>
          Activity Over Time
        </h3>
        <span style={{ fontSize: '0.875rem', color: darkTheme.textMuted, fontWeight: '600' }}>
          Total: {analytics.recentActivity30d.toLocaleString()} activities
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '2rem', justifyContent: 'center', minHeight: '350px', padding: '0 1rem' }}>
        {data.map((item, i) => {
          const height = maxValue > 0 ? (item.value / maxValue) * maxBarHeight : 40
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', flex: 1, maxWidth: '200px' }}>
              {/* Value display above bar */}
              <div style={{
                padding: '0.5rem 1rem',
                background: darkTheme.surface,
                border: `1px solid ${darkTheme.border}`,
                borderRadius: '8px',
                marginBottom: '0.5rem'
              }}>
                <div style={{ fontSize: '1.5rem', color: item.color, fontWeight: '800', textAlign: 'center' }}>
                  {item.value.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted, textAlign: 'center', marginTop: '0.25rem' }}>
                  {percentage.toFixed(1)}% of max
                </div>
              </div>
              
              {/* Bar */}
              <div style={{
                width: '100%',
                height: `${height}px`,
                minHeight: '40px',
                background: `linear-gradient(180deg, ${item.color} 0%, ${item.color}dd 50%, ${item.color}aa 100%)`,
                borderRadius: '12px 12px 0 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-end',
                paddingBottom: '1rem',
                transition: 'height 0.5s ease',
                position: 'relative',
                border: `2px solid ${item.color}`,
                boxShadow: `0 4px 12px ${item.color}40, inset 0 -2px 4px rgba(0,0,0,0.1)`
              }}>
                {/* Inner glow effect */}
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '30%',
                  background: `linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 100%)`,
                  borderRadius: '12px 12px 0 0'
                }} />
              </div>
              
              {/* Labels */}
              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '1rem', color: darkTheme.text, fontWeight: '800', display: 'block', marginBottom: '0.25rem' }}>
                  {item.period.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.875rem', color: darkTheme.textMuted, display: 'block', fontWeight: '600' }}>
                  {item.label}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Dashboard Tab with Enhanced Analytics Overview
function DashboardTab({ analytics, darkTheme, graphView, setGraphView, hoveredCard, setHoveredCard }) {
  const [timeRange, setTimeRange] = useState('30d')
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const handleExport = () => {
    const data = {
      timestamp: new Date().toISOString(),
      analytics: analytics,
      timeRange: timeRange
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleRefresh = async () => {
    setLastUpdated(new Date())
    // Fetch fresh analytics data
    const key = localStorage.getItem('admin_api_key')
    if (key) {
      try {
        const response = await fetch(`${API_URL}/admin/analytics?api_key=${encodeURIComponent(key)}`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        const data = await response.json()
        // Update analytics in parent component
        // The parent will handle the state update
        window.location.reload()
      } catch (err) {
        console.error('Failed to refresh analytics:', err)
        // Still reload to show current state
        window.location.reload()
      }
    } else {
      window.location.reload()
    }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(12, 1fr)',
      gap: '1rem',
      gridAutoRows: 'minmax(120px, auto)'
    }}>
      {/* MAIN ANALYTICS OVERVIEW - Largest Section */}
      <BentoCard
        id="analytics-overview"
        colSpan={9}
        rowSpan={4}
        darkTheme={darkTheme}
        hovered={hoveredCard === 'analytics-overview'}
        onHover={() => setHoveredCard('analytics-overview')}
        onLeave={() => setHoveredCard(null)}
      >
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Header with Controls */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
            <h2 style={{
                fontSize: '1.5rem',
              fontWeight: '800',
              color: darkTheme.text,
              margin: 0,
                marginBottom: '0.25rem',
              letterSpacing: '-0.02em'
            }}>
              Analytics Overview
            </h2>
              <p style={{
                fontSize: '0.8125rem',
                color: darkTheme.textMuted,
                margin: 0
              }}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                style={{
                  padding: '0.625rem 1rem',
                  background: darkTheme.surface,
                  color: darkTheme.text,
                  border: `1px solid ${darkTheme.border}`,
                  borderRadius: '10px',
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  outline: 'none'
                }}
              >
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
              </select>
            <select
              value={graphView}
              onChange={(e) => setGraphView(e.target.value)}
              style={{
                  padding: '0.625rem 1rem',
                  background: darkTheme.surface,
                color: darkTheme.text,
                border: `1px solid ${darkTheme.border}`,
                  borderRadius: '10px',
                  fontSize: '0.8125rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
            >
              <option value="users">User Registrations</option>
              <option value="verification">Verification Rates</option>
              <option value="activity">Activity Trends</option>
            </select>
              <button
                onClick={handleRefresh}
                style={{
                  padding: '0.625rem 1rem',
                  background: darkTheme.primaryGradient,
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.8125rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                🔄 Refresh
              </button>
              <button
                onClick={handleExport}
                style={{
                  padding: '0.625rem 1rem',
                  background: darkTheme.surface,
                  color: darkTheme.text,
                  border: `1px solid ${darkTheme.border}`,
                  borderRadius: '10px',
                  fontSize: '0.8125rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                📥 Export
              </button>
          </div>
          </div>

          {/* Key Metrics Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              padding: '1rem',
              background: darkTheme.surface,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted, marginBottom: '0.5rem', fontWeight: '600' }}>
                Total Users
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: darkTheme.primary }}>
                {analytics.totalUsers.toLocaleString()}
              </div>
            </div>
            <div style={{
              padding: '1rem',
              background: darkTheme.surface,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted, marginBottom: '0.5rem', fontWeight: '600' }}>
                Verification Rate
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: darkTheme.success }}>
                {analytics.verificationRate}%
              </div>
            </div>
            <div style={{
              padding: '1rem',
              background: darkTheme.surface,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted, marginBottom: '0.5rem', fontWeight: '600' }}>
                Total CVEs
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: darkTheme.warning }}>
                {(analytics.totalCveSubmissions || 0).toLocaleString()}
              </div>
            </div>
            <div style={{
              padding: '1rem',
              background: darkTheme.surface,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '12px'
            }}>
              <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted, marginBottom: '0.5rem', fontWeight: '600' }}>
                Activity (30d)
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: darkTheme.danger }}>
                {analytics.recentActivity30d.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Main Chart Area */}
        <div style={{
            flex: 1,
            background: darkTheme.surface,
            border: `1px solid ${darkTheme.border}`,
            borderRadius: '16px',
            padding: '1.5rem',
            position: 'relative',
            overflow: 'visible',
            minHeight: '500px',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box'
          }}>
            {graphView === 'users' && <UserRegistrationsChart analytics={analytics} darkTheme={darkTheme} timeRange={timeRange} />}
            {graphView === 'verification' && <VerificationRateChart analytics={analytics} darkTheme={darkTheme} timeRange={timeRange} />}
            {graphView === 'activity' && <ActivityTrendsChart analytics={analytics} darkTheme={darkTheme} timeRange={timeRange} />}
          </div>

          {/* Quick Stats Footer */}
            <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '1rem',
            marginTop: '1.5rem'
          }}>
            <div style={{
              padding: '1rem',
              background: darkTheme.surface,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted, marginBottom: '0.5rem' }}>
                Verified Users
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: darkTheme.success }}>
                {analytics.verifiedUsers.toLocaleString()}
              </div>
            </div>
            <div style={{
              padding: '1rem',
              background: darkTheme.surface,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted, marginBottom: '0.5rem' }}>
                Non-Verified Users
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: darkTheme.warning }}>
                {analytics.nonVerifiedUsers.toLocaleString()}
              </div>
            </div>
            <div style={{
              padding: '1rem',
              background: darkTheme.surface,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted, marginBottom: '0.5rem' }}>
                Critical CVEs
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: '800', color: darkTheme.danger }}>
                {(analytics.criticalCveSubmissions || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </BentoCard>

      {/* Sidebar Metrics - Compact */}
      <div style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Status Distribution */}
      <BentoCard
        id="status-dist"
          colSpan={3}
        rowSpan={2}
        darkTheme={darkTheme}
        hovered={hoveredCard === 'status-dist'}
        onHover={() => setHoveredCard('status-dist')}
        onLeave={() => setHoveredCard(null)}
      >
        <h2 style={{
            fontSize: '1rem',
          fontWeight: '800',
          color: darkTheme.text,
            marginBottom: '1rem',
          letterSpacing: '-0.02em'
        }}>
          Status Distribution
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Object.entries(analytics.statusDistribution).map(([status, count]) => (
              <div
                key={status}
                style={{
                  padding: '0.875rem',
                background: darkTheme.surface,
                border: `1px solid ${darkTheme.border}`,
                  borderRadius: '10px',
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
                  <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted, textTransform: 'uppercase', fontWeight: '600' }}>
                  {status}
                </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: darkTheme.text }}>
                  {count}
                </div>
                </div>
              </div>
            ))}
          </div>
      </BentoCard>

        {/* Activity Metrics */}
      <BentoCard
          id="activity-24h"
        colSpan={3}
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
        colSpan={3}
        rowSpan={1}
        darkTheme={darkTheme}
          hovered={hoveredCard === 'activity-7d'}
          onHover={() => setHoveredCard('activity-7d')}
        onLeave={() => setHoveredCard(null)}
      >
          <MetricCard title="Activity (7d)" value={analytics.recentActivity7d.toLocaleString()} color={darkTheme.warning} darkTheme={darkTheme} />
      </BentoCard>
      </div>

      {/* CVE Metrics Row */}
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
function BentoCard({ id, colSpan, rowSpan, darkTheme, hovered, onHover, onLeave, children }) {
  return (
    <div
      style={{
        gridColumn: `span ${colSpan}`,
        gridRow: `span ${rowSpan}`,
        background: hovered ? darkTheme.cardHover : darkTheme.card,
        border: `1px solid ${hovered ? darkTheme.borderHover : darkTheme.border}`,
        borderRadius: '16px',
        padding: '0.875rem',
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
          background: `radial-gradient(circle at 50% 0%, rgba(20, 83, 45, 0.12), transparent 70%)`,
          pointerEvents: 'none'
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
        {children}
      </div>
    </div>
  )
}

function CvesTab({ cves, pineconeCves, cveFilters, setCveFilters, darkTheme, loading, onRefresh }) {
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
          <option value="" style={{ background: darkTheme.card, color: darkTheme.text }}>All Severities</option>
          <option value="Critical" style={{ background: darkTheme.card, color: darkTheme.text }}>Critical</option>
          <option value="High" style={{ background: darkTheme.card, color: darkTheme.text }}>High</option>
          <option value="Moderate" style={{ background: darkTheme.card, color: darkTheme.text }}>Moderate</option>
          <option value="Low" style={{ background: darkTheme.card, color: darkTheme.text }}>Low</option>
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
          <option value="" style={{ background: darkTheme.card, color: darkTheme.text }}>All Statuses</option>
          <option value="pending" style={{ background: darkTheme.card, color: darkTheme.text }}>Pending</option>
          <option value="reviewed" style={{ background: darkTheme.card, color: darkTheme.text }}>Reviewed</option>
          <option value="resolved" style={{ background: darkTheme.card, color: darkTheme.text }}>Resolved</option>
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
          <option value="" style={{ background: darkTheme.card, color: darkTheme.text }}>All Users</option>
          <option value="verified" style={{ background: darkTheme.card, color: darkTheme.text }}>Verified</option>
          <option value="non_verified" style={{ background: darkTheme.card, color: darkTheme.text }}>Non-Verified</option>
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
          <option value="created_at" style={{ background: darkTheme.card, color: darkTheme.text }}>Sort by Date</option>
          <option value="severity" style={{ background: darkTheme.card, color: darkTheme.text }}>Sort by Severity</option>
          <option value="cvss_score" style={{ background: darkTheme.card, color: darkTheme.text }}>Sort by CVSS</option>
          <option value="status" style={{ background: darkTheme.card, color: darkTheme.text }}>Sort by Status</option>
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
          <option value="desc" style={{ background: darkTheme.card, color: darkTheme.text }}>Descending</option>
          <option value="asc" style={{ background: darkTheme.card, color: darkTheme.text }}>Ascending</option>
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
        maxHeight: '1200px',
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
                boxShadow: '0 4px 15px rgba(20, 83, 45, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(20, 83, 45, 0.4)'
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
            {(() => {
              // Sort CVEs based on filters (backend does some sorting, but we'll do client-side for consistency)
              let sortedCves = [...cves]
              
              // Apply sorting
              if (cveFilters.sortBy === 'created_at') {
                sortedCves.sort((a, b) => {
                  const dateA = new Date(a.created_at).getTime()
                  const dateB = new Date(b.created_at).getTime()
                  return cveFilters.sortOrder === 'desc' ? dateB - dateA : dateA - dateB
                })
              } else if (cveFilters.sortBy === 'cvss_score') {
                sortedCves.sort((a, b) => {
                  const scoreA = a.cvss_score || 0
                  const scoreB = b.cvss_score || 0
                  return cveFilters.sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB
                })
              } else if (cveFilters.sortBy === 'severity') {
                // Map severity to numeric value for sorting
                const getSeverityValue = (severity) => {
                  if (!severity) return 0
                  if (severity === 'Critical') return 4
                  if (severity === 'High') return 3
                  if (severity === 'Moderate') return 2
                  if (severity === 'Low') return 1
                  return 0
                }
                sortedCves.sort((a, b) => {
                  const severityA = getSeverityValue(a.severity)
                  const severityB = getSeverityValue(b.severity)
                  return cveFilters.sortOrder === 'desc' ? severityB - severityA : severityA - severityB
                })
              } else if (cveFilters.sortBy === 'status') {
                sortedCves.sort((a, b) => {
                  const statusA = a.status || ''
                  const statusB = b.status || ''
                  if (cveFilters.sortOrder === 'desc') {
                    return statusB.localeCompare(statusA)
                  } else {
                    return statusA.localeCompare(statusB)
                  }
                })
              }
              
              return sortedCves.map(cve => (
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
            ))
            })()}
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
            {(() => {
              // Sort Pinecone CVEs based on filters
              let sortedCves = [...pineconeCves]
              
              // Apply sorting
              if (cveFilters.sortBy === 'published' || cveFilters.sortBy === 'created_at') {
                sortedCves.sort((a, b) => {
                  const dateA = a.published ? new Date(a.published).getTime() : 0
                  const dateB = b.published ? new Date(b.published).getTime() : 0
                  return cveFilters.sortOrder === 'desc' ? dateB - dateA : dateA - dateB
                })
              } else if (cveFilters.sortBy === 'cvss_score') {
                sortedCves.sort((a, b) => {
                  const scoreA = a.base_score || 0
                  const scoreB = b.base_score || 0
                  return cveFilters.sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB
                })
              } else if (cveFilters.sortBy === 'severity') {
                // Map CVSS scores to severity for sorting
                const getSeverityValue = (score) => {
                  if (!score) return 0
                  if (score >= 9.0) return 4 // Critical
                  if (score >= 7.0) return 3 // High
                  if (score >= 4.0) return 2 // Moderate
                  return 1 // Low
                }
                sortedCves.sort((a, b) => {
                  const severityA = getSeverityValue(a.base_score)
                  const severityB = getSeverityValue(b.base_score)
                  return cveFilters.sortOrder === 'desc' ? severityB - severityA : severityA - severityB
                })
              }
              
              return sortedCves.map((cve, idx) => {
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
            })
            })()}
          </div>
        )}
      </div>
    </div>
  )
}

// Actions Tab Component
function ActionsTab({ darkTheme, analytics, onSwitchTab }) {
  const [verificationRequests, setVerificationRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)

  useEffect(() => {
    const fetchVerificationRequests = async () => {
      const apiKey = localStorage.getItem('admin_api_key')
      if (!apiKey) return

      setLoadingRequests(true)
      try {
        // Try backend endpoint first
        try {
          const response = await fetch(`${API_URL}/admin/verification-requests?api_key=${encodeURIComponent(apiKey)}`)
          if (response.ok) {
            const data = await response.json()
            setVerificationRequests(data.requests || [])
            setLoadingRequests(false)
            return
          }
        } catch (fetchErr) {
          // Backend endpoint doesn't exist, use localStorage fallback
          console.log('Backend endpoint not available, using localStorage fallback')
        }

        // Fallback: Read from localStorage
        const storedRequests = JSON.parse(localStorage.getItem('verification_requests') || '[]')
        setVerificationRequests(storedRequests)
      } catch (err) {
        console.error('Failed to fetch verification requests:', err)
      } finally {
        setLoadingRequests(false)
      }
    }

    fetchVerificationRequests()
  }, [])

  const handleApprove = async (requestId, userId) => {
    const apiKey = localStorage.getItem('admin_api_key')
    if (!apiKey) return

    try {
      // Try backend endpoint first
      try {
        const response = await fetch(`${API_URL}/admin/verification-requests/${requestId}/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: apiKey,
            user_id: userId
          }),
        })

        if (response.ok) {
          setVerificationRequests(prev => prev.filter(req => req.id !== requestId))
          setSelectedRequest(null)
          if (onSwitchTab) {
            onSwitchTab('dashboard')
          }
          return
        }
      } catch (fetchErr) {
        // Backend endpoint doesn't exist, use localStorage fallback
        console.log('Backend endpoint not available, using localStorage fallback')
      }

      // Fallback: Update localStorage
      const storedRequests = JSON.parse(localStorage.getItem('verification_requests') || '[]')
      const updatedRequests = storedRequests.filter(req => req.id !== requestId)
      localStorage.setItem('verification_requests', JSON.stringify(updatedRequests))
      
      // Update user verification status
      localStorage.setItem('user_verification_status', 'verified')
      if (typeof document !== 'undefined') {
        const expires = new Date()
        expires.setTime(expires.getTime() + (30 * 24 * 60 * 60 * 1000))
        document.cookie = `user_verification_status=verified;expires=${expires.toUTCString()};path=/;SameSite=Lax`
      }

      setVerificationRequests(prev => prev.filter(req => req.id !== requestId))
      setSelectedRequest(null)
      if (onSwitchTab) {
        onSwitchTab('dashboard')
      }
    } catch (err) {
      console.error('Failed to approve request:', err)
    }
  }

  const handleDeny = async (requestId) => {
    const apiKey = localStorage.getItem('admin_api_key')
    if (!apiKey) return

    try {
      // Try backend endpoint first
      try {
        const response = await fetch(`${API_URL}/admin/verification-requests/${requestId}/deny`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_key: apiKey
          }),
        })

        if (response.ok) {
          setVerificationRequests(prev => prev.filter(req => req.id !== requestId))
          setSelectedRequest(null)
          return
        }
      } catch (fetchErr) {
        // Backend endpoint doesn't exist, use localStorage fallback
        console.log('Backend endpoint not available, using localStorage fallback')
      }

      // Fallback: Update localStorage
      const storedRequests = JSON.parse(localStorage.getItem('verification_requests') || '[]')
      const updatedRequests = storedRequests.filter(req => req.id !== requestId)
      localStorage.setItem('verification_requests', JSON.stringify(updatedRequests))

      setVerificationRequests(prev => prev.filter(req => req.id !== requestId))
      setSelectedRequest(null)
    } catch (err) {
      console.error('Failed to deny request:', err)
    }
  }

  const pendingRequests = verificationRequests.filter(req => req.status === 'pending')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Verification Requests Section */}
      <div style={{
        background: darkTheme.card,
        border: `1px solid ${darkTheme.border}`,
        borderRadius: '24px',
        padding: '2rem'
      }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '800',
              color: darkTheme.text,
              marginBottom: '0.25rem',
              letterSpacing: '-0.02em'
            }}>
              Verification Requests
            </h2>
            <p style={{ color: darkTheme.textMuted, fontSize: '0.875rem' }}>
              Review and approve/deny requests from non-verified users
            </p>
          </div>
          {pendingRequests.length > 0 && (
            <div style={{
              background: darkTheme.warningGradient,
              color: 'white',
              padding: '0.5rem 1rem',
              borderRadius: '12px',
              fontSize: '0.875rem',
              fontWeight: '700'
            }}>
              {pendingRequests.length} Pending
            </div>
          )}
        </div>

        {loadingRequests ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: darkTheme.textMuted }}>
            Loading requests...
          </div>
        ) : pendingRequests.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: darkTheme.textMuted,
            background: darkTheme.surface,
            borderRadius: '16px',
            border: `1px solid ${darkTheme.border}`
          }}>
            No pending verification requests
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingRequests.map((request) => (
              <div
                key={request.id}
                style={{
                  background: selectedRequest?.id === request.id ? darkTheme.surface : darkTheme.card,
                  border: `1px solid ${darkTheme.border}`,
                  borderRadius: '16px',
                  padding: '1.5rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={() => setSelectedRequest(selectedRequest?.id === request.id ? null : request)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = darkTheme.surface
                  e.currentTarget.style.borderColor = darkTheme.primary
                }}
                onMouseLeave={(e) => {
                  if (selectedRequest?.id !== request.id) {
                    e.currentTarget.style.background = darkTheme.card
                    e.currentTarget.style.borderColor = darkTheme.border
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: '700', color: darkTheme.text, marginBottom: '0.25rem' }}>
                      {request.name}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: darkTheme.textMuted, marginBottom: '0.25rem' }}>
                      {request.email && (
                        <a 
                          href={`mailto:${request.email}`}
                          style={{ 
                            color: darkTheme.primary, 
                            textDecoration: 'none',
                            fontWeight: '600'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {request.email}
                        </a>
                      )}
                    </div>
                    <div style={{ fontSize: '0.875rem', color: darkTheme.textMuted }}>
                      {request.role} {request.organization ? `• ${request.organization}` : ''}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: darkTheme.warning,
                    background: 'rgba(234, 179, 8, 0.1)',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '8px',
                    fontWeight: '600'
                  }}>
                    Pending
                  </div>
                </div>
                {selectedRequest?.id === request.id && (
                  <div style={{
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: `1px solid ${darkTheme.border}`
                  }}>
                    {request.email && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: '600', color: darkTheme.text, marginBottom: '0.5rem' }}>
                          Contact Email:
                        </div>
                        <div style={{
                          background: darkTheme.card,
                          padding: '1rem',
                          borderRadius: '12px',
                          color: darkTheme.primary,
                          fontSize: '0.875rem',
                          fontWeight: '600'
                        }}>
                          <a 
                            href={`mailto:${request.email}`}
                            style={{ 
                              color: darkTheme.primary, 
                              textDecoration: 'none'
                            }}
                          >
                            {request.email}
                          </a>
                        </div>
                      </div>
                    )}
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: '600', color: darkTheme.text, marginBottom: '0.5rem' }}>
                        Reason for Verification:
                      </div>
                      <div style={{
                        background: darkTheme.card,
                        padding: '1rem',
                        borderRadius: '12px',
                        color: darkTheme.textMuted,
                        fontSize: '0.875rem',
                        lineHeight: '1.6'
                      }}>
                        {request.reason}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleApprove(request.id, request.user_id)
                        }}
                        style={{
                          flex: 1,
                          padding: '0.75rem 1.5rem',
                          background: darkTheme.successGradient,
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
                          e.currentTarget.style.boxShadow = '0 4px 20px rgba(20, 83, 45, 0.5)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = 'none'
                        }}
                      >
                        ✓ Approve
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeny(request.id)
                        }}
                        style={{
                          flex: 1,
                          padding: '0.75rem 1.5rem',
                          background: darkTheme.surface,
                          color: darkTheme.danger,
                          border: `1px solid ${darkTheme.danger}`,
                          borderRadius: '12px',
                          fontSize: '0.875rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = darkTheme.surface
                        }}
                      >
                        ✗ Deny
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Other Action Cards */}
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
          background: `radial-gradient(circle, rgba(20, 83, 45, 0.15), transparent 70%)`,
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
    </div>
  )
}

// AI Scanner Tab Component
function AiScannerTab({ cves, pineconeCves, threatAnalyses, darkTheme, onAnalyze, onAnalyzeCve, loading, analyzingCves, onLoadCves }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [categorizedThreats, setCategorizedThreats] = useState(null)
  const [actionItems, setActionItems] = useState({}) // { cveId: { action, contactInfo, status } }
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'categorized'
  
  useEffect(() => {
    console.log('[AI Scanner] useEffect triggered - cves:', cves.length, 'pineconeCves:', pineconeCves.length)
    // Auto-load CVEs when tab is opened if none are loaded
    if ((cves.length === 0 || pineconeCves.length === 0) && onLoadCves) {
      console.log('[AI Scanner] Calling onLoadCves')
      onLoadCves()
    }
  }, [cves.length, pineconeCves.length, onLoadCves])

  // Categorize threats when analyses are available
  useEffect(() => {
    if (Object.keys(threatAnalyses).length > 0) {
      categorizeThreats()
    }
  }, [threatAnalyses, cves, pineconeCves])

  const categorizeThreats = () => {
    const categories = {
      critical: [],
      high: [],
      moderate: [],
      low: [],
      flagged: [],
      suspicious: [],
      verified: [],
      nonVerified: []
    }

    // Categorize user-submitted CVEs
    cves.forEach(cve => {
      const analysis = threatAnalyses[cve.submission_id]
      if (analysis) {
        if (analysis.is_flagged) categories.flagged.push({ ...cve, type: 'user', analysis })
        if (cve.severity === 'Critical') categories.critical.push({ ...cve, type: 'user', analysis })
        else if (cve.severity === 'High') categories.high.push({ ...cve, type: 'user', analysis })
        else if (cve.severity === 'Moderate') categories.moderate.push({ ...cve, type: 'user', analysis })
        else categories.low.push({ ...cve, type: 'user', analysis })
        
        if (!analysis.is_real_threat) categories.suspicious.push({ ...cve, type: 'user', analysis })
        
        if (cve.is_verified_user) categories.verified.push({ ...cve, type: 'user', analysis })
        else categories.nonVerified.push({ ...cve, type: 'user', analysis })
      }
    })

    // Categorize Pinecone CVEs
    pineconeCves.forEach(cve => {
      const analysis = threatAnalyses[cve.id]
      if (analysis) {
        if (analysis.is_flagged) categories.flagged.push({ ...cve, type: 'pinecone', analysis })
        if (cve.base_score >= 9.0) categories.critical.push({ ...cve, type: 'pinecone', analysis })
        else if (cve.base_score >= 7.0) categories.high.push({ ...cve, type: 'pinecone', analysis })
        else if (cve.base_score >= 4.0) categories.moderate.push({ ...cve, type: 'pinecone', analysis })
        else categories.low.push({ ...cve, type: 'pinecone', analysis })
      }
    })

    setCategorizedThreats(categories)
  }

  const generateActionItem = async (cve) => {
    if (actionItems[cve.submission_id || cve.id]) return

    try {
      const response = await fetch(`${API_URL}/ai-rag/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `For this CVE: "${cve.description.substring(0, 300)}", provide:\n1. Immediate action steps for the admin\n2. User contact information needed\n3. Priority level\n4. Recommended response timeline\n\nFormat as a structured action plan.`,
          context: 'admin_action_plan',
          limit_features: false
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setActionItems(prev => ({
          ...prev,
          [cve.submission_id || cve.id]: {
            action: data.response || 'No action plan available.',
            contactInfo: cve.user_email || cve.email || 'Contact user via platform',
            status: 'pending',
            createdAt: new Date()
          }
        }))
      }
    } catch (err) {
      console.error('Failed to generate action item:', err)
    }
  }
  
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Compact Header */}
        <div style={{
        background: darkTheme.card,
        border: `1px solid ${darkTheme.border}`,
        borderRadius: '16px',
        padding: '1rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
        <h2 style={{
            fontSize: '1.125rem',
          fontWeight: '800',
            color: darkTheme.text,
            marginBottom: '0.25rem',
          letterSpacing: '-0.02em'
        }}>
          AI Threat Scanner
          </h2>
          <p style={{ fontSize: '0.8125rem', color: darkTheme.textMuted, margin: 0 }}>
            Analyze CVEs for suspicious or low-quality submissions
        </p>
        </div>
        <button
          onClick={handleScanAll}
          disabled={loading || analyzing || cves.length === 0}
          style={{
            padding: '0.625rem 1.25rem',
            background: darkTheme.primaryGradient,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '0.875rem',
            fontWeight: '700',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: 'all 0.3s ease'
          }}
        >
          {analyzing ? 'Analyzing...' : loading ? 'Loading...' : cves.length === 0 ? 'No CVEs' : 'Scan All'}
        </button>
      </div>

      {flaggedCves.length > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: `1px solid ${darkTheme.danger}40`,
          borderRadius: '16px',
          padding: '1rem'
        }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: '800',
            color: darkTheme.danger,
            marginBottom: '1rem',
            letterSpacing: '-0.02em'
          }}>
            ⚠️ Flagged Threats ({flaggedCves.length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
            {flaggedCves.map(cve => {
              const analysis = threatAnalyses[cve.submission_id]
              return (
                <div
                  key={cve.submission_id}
                  style={{
                    padding: '1rem',
                    background: darkTheme.card,
                    border: `1px solid ${darkTheme.danger}40`,
                    borderRadius: '12px',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = darkTheme.card
                    e.currentTarget.style.transform = 'translateY(0)'
                  }}
                >
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: darkTheme.dangerGradient,
                      color: 'white',
                      fontSize: '0.6875rem',
                      fontWeight: '700',
                      borderRadius: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      FLAGGED
                    </span>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: darkTheme.surfaceHover,
                      color: darkTheme.text,
                      fontSize: '0.6875rem',
                      fontWeight: '700',
                      borderRadius: '8px',
                      border: `1px solid ${darkTheme.border}`
                    }}>
                      Risk: {(analysis.risk_score * 100).toFixed(0)}%
                    </span>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: cve.is_verified_user ? darkTheme.successGradient : darkTheme.warningGradient,
                      color: 'white',
                      fontSize: '0.6875rem',
                      fontWeight: '700',
                      borderRadius: '8px'
                    }}>
                      {cve.is_verified_user ? 'Verified' : 'Non-Verified'}
                    </span>
                    </div>
                  <p style={{
                    color: darkTheme.text,
                    fontSize: '0.8125rem',
                    marginBottom: '0.75rem',
                    lineHeight: '1.5',
                    fontWeight: '500'
                  }}>
                    {cve.description.substring(0, 120)}...
                  </p>
                  <div style={{
                    fontSize: '0.75rem',
                    color: darkTheme.textMuted,
                    padding: '0.75rem',
                    background: darkTheme.surface,
                    borderRadius: '8px',
                    border: `1px solid ${darkTheme.border}`,
                    maxHeight: '80px',
                    overflow: 'hidden'
                  }}>
                    {analysis.analysis.substring(0, 150)}...
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* View Mode Toggle */}
      <div style={{
        background: darkTheme.card,
        border: `1px solid ${darkTheme.border}`,
        borderRadius: '16px',
        padding: '1rem',
        marginBottom: '1rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{
          fontSize: '1rem',
          fontWeight: '800',
          color: darkTheme.text,
          letterSpacing: '-0.02em',
          margin: 0
        }}>
          Threat Management ({cves.length + pineconeCves.length} CVEs)
        </h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setViewMode('grid')}
                            style={{
                              padding: '0.5rem 1rem',
              background: viewMode === 'grid' ? darkTheme.primaryGradient : darkTheme.surface,
              color: viewMode === 'grid' ? 'white' : darkTheme.text,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '8px',
                              fontSize: '0.8125rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Grid View
          </button>
          <button
            onClick={() => setViewMode('categorized')}
            style={{
              padding: '0.5rem 1rem',
              background: viewMode === 'categorized' ? darkTheme.primaryGradient : darkTheme.surface,
              color: viewMode === 'categorized' ? 'white' : darkTheme.text,
              border: `1px solid ${darkTheme.border}`,
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Categorized
          </button>
        </div>
      </div>

      {viewMode === 'categorized' && categorizedThreats ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Critical Threats */}
          {categorizedThreats.critical.length > 0 && (
            <div style={{
              background: darkTheme.card,
              border: `2px solid ${darkTheme.danger}`,
              borderRadius: '16px',
              padding: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '800',
                  color: darkTheme.danger,
                  margin: 0
                }}>
                  🔴 Critical Threats ({categorizedThreats.critical.length})
                </h3>
                <span style={{ fontSize: '0.75rem', color: darkTheme.textMuted }}>
                  Immediate action required
                          </span>
                      </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {categorizedThreats.critical.map((cve) => {
                  const actionItem = actionItems[cve.submission_id || cve.id]
                  return (
                    <div
                      key={cve.submission_id || cve.id}
                      style={{
                        padding: '1rem',
                        background: darkTheme.surface,
                        border: `1px solid ${darkTheme.danger}40`,
                        borderRadius: '12px'
                      }}
                    >
                      <div style={{ marginBottom: '0.75rem' }}>
                        <p style={{ fontSize: '0.8125rem', color: darkTheme.text, margin: '0 0 0.5rem 0', lineHeight: '1.5' }}>
                          {cve.description.substring(0, 120)}...
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            background: cve.type === 'user' ? (cve.is_verified_user ? darkTheme.successGradient : darkTheme.warningGradient) : darkTheme.primaryGradient,
                            color: 'white',
                            fontSize: '0.6875rem',
                            fontWeight: '700',
                            borderRadius: '8px'
                          }}>
                            {cve.type === 'user' ? (cve.is_verified_user ? 'Verified User' : 'Non-Verified') : 'Pinecone'}
                          </span>
                    </div>
                      </div>
                      {!actionItem && (
                        <button
                          onClick={() => generateActionItem(cve)}
                          style={{
                            width: '100%',
                            padding: '0.625rem',
                            background: darkTheme.primaryGradient,
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.8125rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
                        >
                          Generate Action Plan
                        </button>
                      )}
                      {actionItem && (
                        <div style={{
                          padding: '0.75rem',
                          background: darkTheme.card,
                          borderRadius: '8px',
                          border: `1px solid ${darkTheme.border}`,
                          fontSize: '0.75rem',
                          color: darkTheme.text,
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '150px',
                          overflowY: 'auto',
                          marginBottom: '0.5rem'
                        }}>
                          {actionItem.action.substring(0, 200)}...
                        </div>
                      )}
                      {actionItem && (
                        <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted }}>
                          Contact: {actionItem.contactInfo}
                        </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

          {/* Flagged Threats */}
          {categorizedThreats.flagged.length > 0 && (
        <div style={{
        background: darkTheme.card,
              border: `2px solid ${darkTheme.danger}`,
              borderRadius: '16px',
        padding: '1.5rem'
      }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{
          fontSize: '1.125rem',
          fontWeight: '800',
                  color: darkTheme.danger,
                  margin: 0
        }}>
                  ⚠️ Flagged Threats ({categorizedThreats.flagged.length})
        </h3>
                <span style={{ fontSize: '0.75rem', color: darkTheme.textMuted }}>
                  Requires review
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {categorizedThreats.flagged.map((cve) => {
                  const actionItem = actionItems[cve.submission_id || cve.id]
                  return (
                    <div
                      key={cve.submission_id || cve.id}
                      style={{
                        padding: '1rem',
                        background: darkTheme.surface,
                        border: `1px solid ${darkTheme.danger}40`,
                        borderRadius: '12px'
                      }}
                    >
                      <div style={{ marginBottom: '0.75rem' }}>
                        <p style={{ fontSize: '0.8125rem', color: darkTheme.text, margin: '0 0 0.5rem 0', lineHeight: '1.5' }}>
                          {cve.description.substring(0, 120)}...
                        </p>
                        <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted, marginTop: '0.5rem' }}>
                          Risk: {((cve.analysis?.risk_score || 0.5) * 100).toFixed(0)}%
                        </div>
                      </div>
                      {!actionItem && (
              <button
                          onClick={() => generateActionItem(cve)}
                style={{
                            width: '100%',
                            padding: '0.625rem',
                  background: darkTheme.primaryGradient,
                  color: 'white',
                  border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.8125rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                          Generate Action Plan
              </button>
            )}
                      {actionItem && (
                        <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted }}>
                          Contact: {actionItem.contactInfo}
          </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Other Categories */}
          {['high', 'moderate', 'low'].map(category => {
            const threats = categorizedThreats[category]
            if (threats.length === 0) return null
            const colors = {
              high: darkTheme.warning,
              moderate: darkTheme.primary,
              low: darkTheme.success
            }
              return (
              <div key={category} style={{
                background: darkTheme.card,
                border: `1px solid ${colors[category]}40`,
                borderRadius: '16px',
                padding: '1.5rem'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '800',
                  color: colors[category],
                  margin: '0 0 1rem 0'
                }}>
                  {category.charAt(0).toUpperCase() + category.slice(1)} Priority ({threats.length})
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                  {threats.slice(0, 6).map((cve) => (
                    <div
                      key={cve.submission_id || cve.id}
                  style={{
                        padding: '0.875rem',
                    background: darkTheme.surface,
                    border: `1px solid ${darkTheme.border}`,
                        borderRadius: '12px',
                        fontSize: '0.8125rem',
                        color: darkTheme.text
                      }}
                    >
                      {cve.description.substring(0, 100)}...
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '16px',
          padding: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '800',
                      color: darkTheme.text,
              letterSpacing: '-0.02em',
              margin: 0
            }}>
              All CVEs ({cves.length + pineconeCves.length})
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem', color: darkTheme.textMuted }}>
              <span>User: {cves.length}</span>
              <span>•</span>
              <span>Pinecone: {pineconeCves.length}</span>
                  </div>
          </div>
        
        {/* Grid of CVEs */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
          gap: '0.75rem',
          maxHeight: '800px',
          overflowY: 'auto',
          padding: '0.5rem'
        }}>
          {/* User-Submitted CVEs */}
          {cves.map(cve => {
            const analysis = threatAnalyses[cve.submission_id]
            const isAnalyzing = analyzingCves.has(cve.submission_id)
            return (
              <div
                key={cve.submission_id}
                    style={{
                  padding: '1rem',
                  background: analysis?.is_flagged ? 'rgba(239, 68, 68, 0.05)' : darkTheme.surface,
                  border: `1px solid ${analysis?.is_flagged ? 'rgba(239, 68, 68, 0.4)' : darkTheme.border}`,
                  borderRadius: '12px',
                      transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  position: 'relative'
                    }}
                onClick={() => !isAnalyzing && !analysis && onAnalyze(cve.submission_id)}
                    onMouseEnter={(e) => {
                  if (!isAnalyzing) {
                    e.currentTarget.style.background = analysis?.is_flagged ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255, 255, 255, 0.06)'
                        e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)'
                      }
                    }}
                    onMouseLeave={(e) => {
                  if (!isAnalyzing) {
                    e.currentTarget.style.background = analysis?.is_flagged ? 'rgba(239, 68, 68, 0.05)' : darkTheme.surface
                        e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }
                }}
              >
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: cve.is_verified_user ? darkTheme.successGradient : darkTheme.warningGradient,
                    color: 'white',
                    fontSize: '0.6875rem',
                    fontWeight: '700',
                    borderRadius: '8px'
                  }}>
                    {cve.is_verified_user ? 'Verified' : 'Non-Verified'}
                  </span>
                    <span style={{
                    padding: '0.25rem 0.75rem',
                    background: getSeverityGradient(cve.severity, darkTheme),
                    color: 'white',
                    fontSize: '0.6875rem',
                    fontWeight: '700',
                    borderRadius: '8px'
                  }}>
                    {cve.severity}
                  </span>
                  {analysis?.is_flagged && (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: darkTheme.dangerGradient,
                      color: 'white',
                      fontSize: '0.6875rem',
                      fontWeight: '700',
                      borderRadius: '8px',
                      textTransform: 'uppercase'
                    }}>
                      FLAGGED
                    </span>
                  )}
                  {analysis && (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: analysis.is_real_threat ? darkTheme.successGradient : darkTheme.warningGradient,
                      color: 'white',
                      fontSize: '0.6875rem',
                      fontWeight: '700',
                      borderRadius: '8px'
                    }}>
                      {analysis.is_real_threat ? 'Real' : 'Suspicious'}
                    </span>
                  )}
                  {isAnalyzing && (
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: darkTheme.primaryGradient,
                      color: 'white',
                      fontSize: '0.6875rem',
                      fontWeight: '700',
                      borderRadius: '8px'
                    }}>
                      Analyzing...
                    </span>
                  )}
                </div>
                <p style={{
                  color: darkTheme.text,
                  fontSize: '0.8125rem',
                  marginBottom: '0.5rem',
                  lineHeight: '1.5',
                  fontWeight: '500'
                }}>
                  {cve.description.substring(0, 140)}...
                </p>
                {analysis && (
                <div style={{
                    fontSize: '0.75rem',
                  color: darkTheme.textMuted,
                    padding: '0.75rem',
                    background: darkTheme.card,
                    borderRadius: '8px',
                    border: `1px solid ${darkTheme.border}`,
                    marginTop: '0.5rem',
                    maxHeight: '60px',
                    overflow: 'hidden'
                }}>
                    {analysis.analysis.substring(0, 120)}...
          </div>
        )}
                {!analysis && !isAnalyzing && (
        <div style={{
              fontSize: '0.75rem',
                    color: darkTheme.primary,
                    marginTop: '0.5rem',
                    fontWeight: '600'
            }}>
                    Click to analyze →
            </div>
                )}
              </div>
            )
          })}
          
          {/* Pinecone CVEs */}
            {pineconeCves.map((cve, idx) => {
              const analysis = threatAnalyses[cve.id]
              const isAnalyzing = analyzingCves.has(cve.id)
              return (
                <div
                  key={cve.id || idx}
                  onClick={() => !isAnalyzing && onAnalyzeCve(cve.id, cve.description)}
                  style={{
                  padding: '1rem',
                  background: analysis?.is_flagged ? 'rgba(239, 68, 68, 0.05)' : darkTheme.surface,
                    border: `1px solid ${analysis?.is_flagged ? 'rgba(239, 68, 68, 0.4)' : darkTheme.border}`,
                  borderRadius: '12px',
                    transition: 'all 0.3s ease',
                    cursor: isAnalyzing ? 'wait' : 'pointer',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    if (!isAnalyzing) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                      e.currentTarget.style.borderColor = darkTheme.borderHover
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.2)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isAnalyzing) {
                    e.currentTarget.style.background = analysis?.is_flagged ? 'rgba(239, 68, 68, 0.05)' : darkTheme.surface
                      e.currentTarget.style.borderColor = analysis?.is_flagged ? 'rgba(239, 68, 68, 0.4)' : darkTheme.border
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                    }
                  }}
                >
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{
                    padding: '0.25rem 0.75rem',
                      background: darkTheme.primaryGradient,
                      color: 'white',
                    fontSize: '0.6875rem',
                      fontWeight: '700',
                    borderRadius: '8px',
                    textTransform: 'uppercase'
                    }}>
                    {cve.source || 'NVD'}
                    </span>
                    {cve.base_score && (
                      <span style={{
                      padding: '0.25rem 0.75rem',
                        background: darkTheme.surfaceHover,
                        color: darkTheme.text,
                      fontSize: '0.6875rem',
                      fontWeight: '700',
                      borderRadius: '8px',
                        border: `1px solid ${darkTheme.border}`
                      }}>
                        CVSS: {cve.base_score.toFixed(1)}
                      </span>
                    )}
                  {analysis?.is_flagged && (
                        <span style={{
                      padding: '0.25rem 0.75rem',
                            background: darkTheme.dangerGradient,
                            color: 'white',
                      fontSize: '0.6875rem',
                            fontWeight: '700',
                      borderRadius: '8px',
                      textTransform: 'uppercase'
                          }}>
                            FLAGGED
                          </span>
                    )}
                    {isAnalyzing && (
                      <span style={{
                      padding: '0.25rem 0.75rem',
                      background: darkTheme.primaryGradient,
                      color: 'white',
                      fontSize: '0.6875rem',
                        fontWeight: '700',
                      borderRadius: '8px'
                      }}>
                        Analyzing...
                      </span>
                    )}
                  </div>
                  <p style={{
                    color: darkTheme.text,
                  fontSize: '0.8125rem',
                  marginBottom: '0.5rem',
                  lineHeight: '1.5',
                    fontWeight: '500'
                  }}>
                  {cve.description.substring(0, 140)}...
                  </p>
                  {analysis && (
                    <div style={{
                    fontSize: '0.75rem',
                      color: darkTheme.textMuted,
                    padding: '0.75rem',
                    background: darkTheme.card,
                    borderRadius: '8px',
                    border: `1px solid ${darkTheme.border}`,
                    marginTop: '0.5rem',
                    maxHeight: '60px',
                    overflow: 'hidden'
                  }}>
                    {analysis.analysis.substring(0, 120)}...
                    </div>
                  )}
                  {!analysis && !isAnalyzing && (
                    <div style={{
                    fontSize: '0.75rem',
                    color: darkTheme.primary,
                    marginTop: '0.5rem',
                    fontWeight: '600'
                    }}>
                    Click to analyze →
                    </div>
                  )}
                </div>
              )
            })}
          
          {cves.length === 0 && pineconeCves.length === 0 && (
            <div style={{ 
              gridColumn: '1 / -1',
              padding: '2rem', 
              textAlign: 'center', 
              color: darkTheme.textMuted 
            }}>
              <div style={{ marginBottom: '1rem' }}>No CVEs found. They will appear here once loaded.</div>
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
                    cursor: 'pointer'
                  }}
                >
                  Load CVEs
                </button>
              )}
            </div>
          )}
      </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ title, value, color, darkTheme }) {
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

function getSeverityGradient(severity, darkTheme) {
  switch (severity.toLowerCase()) {
    case 'critical': return darkTheme.dangerGradient
    case 'high': return darkTheme.warningGradient
    case 'moderate': return darkTheme.primaryGradient
    case 'low': return darkTheme.successGradient
    default: return 'rgba(255, 255, 255, 0.1)'
  }
}

// Users Tab Component
function FakeCveDetectionTab({ analytics, darkTheme, loading }) {
  if (loading || !analytics) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: darkTheme.textMuted }}>
        Loading fake CVE detection analytics...
      </div>
    )
  }

  const fakeCveData = analytics

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{
          fontSize: '1.75rem',
          fontWeight: '800',
          color: darkTheme.text,
          marginBottom: '0.5rem',
          letterSpacing: '-0.02em'
        }}>
          Fake CVE Detection Analytics
        </h2>
        <p style={{ color: darkTheme.textMuted, fontSize: '0.9375rem' }}>
          Monitor suspicious patterns and detect potential fake CVE submissions
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem'
      }}>
        <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '20px',
          padding: '1.5rem'
        }}>
          <div style={{ fontSize: '0.8125rem', color: darkTheme.textMuted, marginBottom: '0.5rem' }}>
            Low Quality Submissions
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: darkTheme.danger }}>
            {fakeCveData.lowQualitySubmissions || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted, marginTop: '0.5rem' }}>
            Descriptions &lt; 50 characters
          </div>
        </div>

        <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '20px',
          padding: '1.5rem'
        }}>
          <div style={{ fontSize: '0.8125rem', color: darkTheme.textMuted, marginBottom: '0.5rem' }}>
            Generic/Test Submissions
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: darkTheme.warning }}>
            {fakeCveData.genericSubmissions || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted, marginTop: '0.5rem' }}>
            Contains "test", "fake", "asdf", etc.
          </div>
        </div>

        <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '20px',
          padding: '1.5rem'
        }}>
          <div style={{ fontSize: '0.8125rem', color: darkTheme.textMuted, marginBottom: '0.5rem' }}>
            Users with Multiple Submissions
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: darkTheme.primary }}>
            {fakeCveData.usersWithMultipleSubmissions?.length || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted, marginTop: '0.5rem' }}>
            Users with 2+ submissions
          </div>
        </div>

        <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '20px',
          padding: '1.5rem'
        }}>
          <div style={{ fontSize: '0.8125rem', color: darkTheme.textMuted, marginBottom: '0.5rem' }}>
            High Frequency Users (24h)
          </div>
          <div style={{ fontSize: '2rem', fontWeight: '800', color: darkTheme.danger }}>
            {fakeCveData.highFrequencyUsers?.length || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted, marginTop: '0.5rem' }}>
            3+ submissions in 24 hours
          </div>
        </div>
      </div>

      {/* Users with Multiple Submissions */}
      {fakeCveData.usersWithMultipleSubmissions && fakeCveData.usersWithMultipleSubmissions.length > 0 && (
        <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '20px',
          padding: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '800',
            color: darkTheme.text,
            marginBottom: '1rem'
          }}>
            Users with Multiple Submissions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {fakeCveData.usersWithMultipleSubmissions.slice(0, 20).map((user, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  background: darkTheme.surface,
                  borderRadius: '12px',
                  border: `1px solid ${darkTheme.border}`
                }}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', color: darkTheme.text, fontWeight: '600' }}>
                    User ID: {user.userId.substring(0, 8)}...
                  </div>
                </div>
                <div style={{
                  padding: '0.5rem 1rem',
                  background: user.submissionCount >= 5 ? darkTheme.dangerGradient : darkTheme.warningGradient,
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '700'
                }}>
                  {user.submissionCount} submissions
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* High Frequency Users */}
      {fakeCveData.highFrequencyUsers && fakeCveData.highFrequencyUsers.length > 0 && (
        <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '20px',
          padding: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '800',
            color: darkTheme.danger,
            marginBottom: '1rem'
          }}>
            ⚠️ High Frequency Users (Last 24 Hours)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {fakeCveData.highFrequencyUsers.map((user, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  background: darkTheme.surface,
                  borderRadius: '12px',
                  border: `1px solid ${darkTheme.danger}`
                }}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', color: darkTheme.text, fontWeight: '600' }}>
                    User ID: {user.userId.substring(0, 8)}...
                  </div>
                  <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted, marginTop: '0.25rem' }}>
                    Suspicious activity detected
                  </div>
                </div>
                <div style={{
                  padding: '0.5rem 1rem',
                  background: darkTheme.dangerGradient,
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '700'
                }}>
                  {user.submissionCount} in 24h
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicate Descriptions */}
      {fakeCveData.duplicateDescriptions && fakeCveData.duplicateDescriptions.length > 0 && (
        <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '20px',
          padding: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '800',
            color: darkTheme.text,
            marginBottom: '1rem'
          }}>
            Duplicate CVE Descriptions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {fakeCveData.duplicateDescriptions.slice(0, 15).map((dup, idx) => (
              <div
                key={idx}
                style={{
                  padding: '1rem',
                  background: darkTheme.surface,
                  borderRadius: '12px',
                  border: `1px solid ${darkTheme.border}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div style={{
                    padding: '0.5rem 1rem',
                    background: dup.count >= 5 ? darkTheme.dangerGradient : darkTheme.warningGradient,
                    color: 'white',
                    borderRadius: '8px',
                    fontSize: '0.8125rem',
                    fontWeight: '700'
                  }}>
                    {dup.count} duplicates
                  </div>
                  <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted }}>
                    {dup.uniqueUsers} unique users
                  </div>
                </div>
                <div style={{
                  fontSize: '0.875rem',
                  color: darkTheme.text,
                  lineHeight: '1.5',
                  maxHeight: '60px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {dup.description.length > 200 ? dup.description.substring(0, 200) + '...' : dup.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suspicious Non-Verified Users */}
      {fakeCveData.suspiciousNonVerifiedUsers && fakeCveData.suspiciousNonVerifiedUsers.length > 0 && (
        <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '20px',
          padding: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '800',
            color: darkTheme.warning,
            marginBottom: '1rem'
          }}>
            ⚠️ Suspicious Non-Verified Users
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {fakeCveData.suspiciousNonVerifiedUsers.slice(0, 20).map((user, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  background: darkTheme.surface,
                  borderRadius: '12px',
                  border: `1px solid ${darkTheme.warning}`
                }}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', color: darkTheme.text, fontWeight: '600' }}>
                    User ID: {user.userId.substring(0, 8)}...
                  </div>
                  <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted, marginTop: '0.25rem' }}>
                    Non-verified with multiple submissions
                  </div>
                </div>
                <div style={{
                  padding: '0.5rem 1rem',
                  background: darkTheme.warningGradient,
                  color: 'white',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '700'
                }}>
                  {user.submissionCount} submissions
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submissions by Day Chart */}
      {fakeCveData.submissionsByDay && fakeCveData.submissionsByDay.length > 0 && (
        <div style={{
          background: darkTheme.card,
          border: `1px solid ${darkTheme.border}`,
          borderRadius: '20px',
          padding: '1.5rem'
        }}>
          <h3 style={{
            fontSize: '1.25rem',
            fontWeight: '800',
            color: darkTheme.text,
            marginBottom: '1rem'
          }}>
            Submission Trends (Last 7 Days)
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '200px', paddingTop: '1rem' }}>
            {fakeCveData.submissionsByDay.map((day, idx) => {
              const maxCount = Math.max(...fakeCveData.submissionsByDay.map(d => d.count), 1)
              const height = (day.count / maxCount) * 100
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '100%',
                    height: `${height}%`,
                    minHeight: '4px',
                    background: day.count >= 10 ? darkTheme.dangerGradient : darkTheme.primaryGradient,
                    borderRadius: '8px 8px 0 0',
                    transition: 'all 0.3s ease'
                  }} />
                  <div style={{ fontSize: '0.75rem', color: darkTheme.textMuted, textAlign: 'center' }}>
                    {day.count}
                  </div>
                  <div style={{ fontSize: '0.625rem', color: darkTheme.textSubtle, textAlign: 'center', transform: 'rotate(-45deg)', transformOrigin: 'center' }}>
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function UsersTab({ analytics, darkTheme, loading }) {
  const [users, setUsers] = useState([])
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
