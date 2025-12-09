'use client'

import { useState, useEffect } from 'react'
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

interface ThreatAnalysis {
  submission_id: string
  is_real_threat: boolean
  is_flagged: boolean
  confidence: number
  flags: string[]
  analysis: string
  risk_score: number
}

type TabType = 'dashboard' | 'cves' | 'actions' | 'ai-scanner'

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
  const [cveFilters, setCveFilters] = useState({
    severity: '',
    status: '',
    userType: '',
    sortBy: 'created_at',
    sortOrder: 'desc'
  })
  const [graphView, setGraphView] = useState<'users' | 'verification' | 'activity'>('users')
  const [threatAnalyses, setThreatAnalyses] = useState<Record<string, ThreatAnalysis>>({})
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

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

  useEffect(() => {
    setLoading(false)
    const storedKey = localStorage.getItem('admin_api_key')
    setCheckingStoredKey(false)
    if (storedKey && storedKey.trim()) {
      setApiKey(storedKey)
      setShowApiKeyInput(false)
      fetchAnalytics(storedKey)
      if (activeTab === 'cves') {
        fetchCves(storedKey)
      }
    }
  }, [activeTab])

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

      const response = await fetch(`${API_URL}/admin/cves?${params}`)
      if (!response.ok) throw new Error('Failed to fetch CVEs')
      
      const data = await response.json()
      setCves(data.cves || [])
    } catch (err) {
      console.error('CVE fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load CVEs')
    } finally {
      setLoading(false)
    }
  }

  const analyzeThreat = async (submissionId: string) => {
    const key = localStorage.getItem('admin_api_key')
    if (!key) return

    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/admin/analyze-threat?api_key=${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ SubmissionId: submissionId })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to analyze threat')
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
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${darkTheme.glassBorder}`,
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
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${darkTheme.glassBorder}`,
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
              background: 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${darkTheme.glassBorder}`,
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
                background: 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${darkTheme.glassBorder}`,
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
                e.currentTarget.style.borderColor = darkTheme.glassBorder
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
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: darkTheme.text,
                  border: `1px solid ${darkTheme.glassBorder}`,
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
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${darkTheme.glassBorder}`,
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
                background: 'rgba(255, 255, 255, 0.05)',
                color: darkTheme.text,
                border: `1px solid ${darkTheme.glassBorder}`,
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
            <span style={{ fontWeight: '800', fontSize: '1.5rem', color: '#000000', letterSpacing: '-0.02em' }}>BioGate Admin</span>
            <nav style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {[
                { label: 'Home', path: '/' },
                { label: 'Dashboard', path: '/admin/analytics', active: activeTab === 'dashboard' },
                { label: 'CVEs', path: '/admin/analytics', active: activeTab === 'cves' },
                { label: 'Actions', path: '/admin/analytics', active: activeTab === 'actions' },
                { label: 'AI Scanner', path: '/admin/analytics', active: activeTab === 'ai-scanner' },
                { label: 'Users', path: '/admin/analytics', active: false }
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.path === '/admin/analytics' && item.label !== 'Dashboard') {
                      const tabMap: Record<string, TabType> = {
                        'CVEs': 'cves',
                        'Actions': 'actions',
                        'AI Scanner': 'ai-scanner'
                      }
                      if (tabMap[item.label]) {
                        setActiveTab(tabMap[item.label])
                        if (tabMap[item.label] === 'cves') {
                          const key = localStorage.getItem('admin_api_key')
                          if (key) fetchCves(key)
                        }
                      }
                    } else if (item.path !== '#') {
                      router.push(item.path)
                    }
                  }}
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
        {activeTab === 'cves' && <CvesTab cves={cves} cveFilters={cveFilters} setCveFilters={setCveFilters} darkTheme={darkTheme} loading={loading} onRefresh={() => {
          const key = localStorage.getItem('admin_api_key')
          if (key) fetchCves(key)
        }} />}
        {activeTab === 'actions' && <ActionsTab darkTheme={darkTheme} analytics={analytics} />}
        {activeTab === 'ai-scanner' && <AiScannerTab cves={cves} threatAnalyses={threatAnalyses} darkTheme={darkTheme} onAnalyze={analyzeThreat} loading={loading} />}
          </div>
        </main>
    </div>
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
        <MetricCard title="Verification Rate" value={`${analytics.verificationRate}%`} color={darkTheme.purple} darkTheme={darkTheme} />
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
                background: 'rgba(255, 255, 255, 0.05)',
                color: darkTheme.text,
                border: `1px solid ${darkTheme.glassBorder}`,
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
                e.currentTarget.style.borderColor = darkTheme.glassBorder
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
            background: 'rgba(255, 255, 255, 0.02)',
            border: `1px solid ${darkTheme.glassBorder}`,
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
              background: `radial-gradient(circle, ${darkTheme.primary}20 0%, transparent 70%)`,
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
                background: 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${darkTheme.glassBorder}`,
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
        <MetricCard title="Total CVEs" value={(analytics.totalCveSubmissions || 0).toLocaleString()} color={darkTheme.purple} darkTheme={darkTheme} />
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
        background: hovered ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${hovered ? darkTheme.primary + '40' : darkTheme.glassBorder}`,
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
          background: `radial-gradient(circle at 50% 0%, ${darkTheme.primary}15, transparent 70%)`,
          pointerEvents: 'none'
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 1, height: '100%' }}>
        {children}
      </div>
    </div>
  )
}

// CVEs Tab Component
function CvesTab({ cves, cveFilters, setCveFilters, darkTheme, loading, onRefresh }: {
  cves: CveSubmission[]
  cveFilters: any
  setCveFilters: (filters: any) => void
  darkTheme: any
  loading: boolean
  onRefresh: () => void
}) {
  return (
    <>
      {/* Filters with Glassmorphism */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${darkTheme.glassBorder}`,
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
            background: 'rgba(255, 255, 255, 0.05)',
            color: darkTheme.text,
            border: `1px solid ${darkTheme.glassBorder}`,
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
            e.currentTarget.style.borderColor = darkTheme.glassBorder
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
            background: 'rgba(255, 255, 255, 0.05)',
            color: darkTheme.text,
            border: `1px solid ${darkTheme.glassBorder}`,
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
            e.currentTarget.style.borderColor = darkTheme.glassBorder
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
            background: 'rgba(255, 255, 255, 0.05)',
            color: darkTheme.text,
            border: `1px solid ${darkTheme.glassBorder}`,
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
            e.currentTarget.style.borderColor = darkTheme.glassBorder
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
            background: 'rgba(255, 255, 255, 0.05)',
            color: darkTheme.text,
            border: `1px solid ${darkTheme.glassBorder}`,
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
            e.currentTarget.style.borderColor = darkTheme.glassBorder
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
            background: 'rgba(255, 255, 255, 0.05)',
            color: darkTheme.text,
            border: `1px solid ${darkTheme.glassBorder}`,
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
            e.currentTarget.style.borderColor = darkTheme.glassBorder
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
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* CVE List with Glassmorphism */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${darkTheme.glassBorder}`,
        borderRadius: '24px',
        maxHeight: '700px',
        overflowY: 'auto',
        padding: '1.5rem'
      }}>
        {cves.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: darkTheme.textMuted }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600' }}>No CVEs found</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {cves.map(cve => (
              <div
                key={cve.submission_id}
                style={{
                  padding: '1.5rem',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: `1px solid ${darkTheme.glassBorder}`,
                  borderRadius: '20px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                  e.currentTarget.style.borderColor = darkTheme.primary + '40'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 0, 0, 0.2)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                  e.currentTarget.style.borderColor = darkTheme.glassBorder
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
                    {cve.is_verified_user ? '✓ Verified' : '⏳ Non-Verified'}
                  </span>
                  <span style={{
                    padding: '0.5rem 1rem',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: darkTheme.text,
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    borderRadius: '12px',
                    border: `1px solid ${darkTheme.glassBorder}`
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
    </>
  )
}

// Actions Tab Component
function ActionsTab({ darkTheme, analytics }: { darkTheme: any, analytics: AnalyticsData | null }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '1.5rem'
    }}>
      {analytics && analytics.pendingCveSubmissions && analytics.pendingCveSubmissions > 0 && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${darkTheme.warning}40`,
          borderRadius: '24px',
          padding: '2rem',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
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
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: `1px solid ${darkTheme.danger}40`,
          borderRadius: '24px',
          padding: '2rem',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
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
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${darkTheme.glassBorder}`,
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
          background: `radial-gradient(circle, ${darkTheme.primary}20, transparent 70%)`,
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
function AiScannerTab({ cves, threatAnalyses, darkTheme, onAnalyze, loading }: {
  cves: CveSubmission[]
  threatAnalyses: Record<string, ThreatAnalysis>
  darkTheme: any
  onAnalyze: (id: string) => void
  loading: boolean
}) {
  const flaggedCves = cves.filter(cve => {
    const analysis = threatAnalyses[cve.submission_id]
    return analysis && analysis.is_flagged
  })

  return (
    <>
      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${darkTheme.glassBorder}`,
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
          onClick={() => {
            cves.forEach(cve => {
              if (!threatAnalyses[cve.submission_id]) {
                onAnalyze(cve.submission_id)
              }
            })
          }}
          disabled={loading}
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
          {loading ? 'Analyzing...' : 'Scan All CVEs'}
        </button>
      </div>

      {flaggedCves.length > 0 && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
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
            🚩 Flagged Threats ({flaggedCves.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {flaggedCves.map(cve => {
              const analysis = threatAnalyses[cve.submission_id]
              return (
                <div
                  key={cve.submission_id}
                  style={{
                    padding: '1.5rem',
                    background: 'rgba(255, 255, 255, 0.05)',
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
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: darkTheme.text,
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      borderRadius: '12px',
                      border: `1px solid ${darkTheme.glassBorder}`
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
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    border: `1px solid ${darkTheme.glassBorder}`
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
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${darkTheme.glassBorder}`,
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
          borderBottom: `1px solid ${darkTheme.glassBorder}`,
          marginBottom: '1.5rem',
          letterSpacing: '-0.02em'
        }}>
          All CVE Analyses
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cves.map(cve => {
            const analysis = threatAnalyses[cve.submission_id]
            if (!analysis) {
              return (
                <div
                  key={cve.submission_id}
                  style={{
                    padding: '1.5rem',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${darkTheme.glassBorder}`,
                    borderRadius: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'
                    e.currentTarget.style.borderColor = darkTheme.primary + '40'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'
                    e.currentTarget.style.borderColor = darkTheme.glassBorder
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
                  border: `1px solid ${analysis.is_flagged ? darkTheme.danger + '40' : darkTheme.glassBorder}`,
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
                    {analysis.is_real_threat ? '✓ Real Threat' : '⚠ Suspicious'}
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
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '12px',
                  border: `1px solid ${darkTheme.glassBorder}`
                }}>
                  {analysis.analysis}
                </div>
              </div>
            )
          })}
        </div>
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
