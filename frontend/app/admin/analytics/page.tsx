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
}

export default function AdminAnalytics() {
  const router = useRouter()
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState<string>('')
  const [showApiKeyInput, setShowApiKeyInput] = useState<boolean>(true)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [checkingStoredKey, setCheckingStoredKey] = useState<boolean>(true)

  useEffect(() => {
    // Ensure loading is false on mount
    setLoading(false)
    console.log('Component mounted, loading set to false')
    
    // Check if API key is stored in localStorage
    const storedKey = localStorage.getItem('admin_api_key')
    console.log('Stored key check:', storedKey ? 'Found' : 'Not found')
    setCheckingStoredKey(false)
    if (storedKey && storedKey.trim()) {
      setApiKey(storedKey)
      setShowApiKeyInput(false)
      fetchAnalytics(storedKey)
    } else {
      console.log('No stored key, showing input form')
    }
  }, [])

  const fetchAnalytics = async (key: string) => {
    setLoading(true)
    setError(null)
    try {
      console.log('Fetching analytics with API key...')
      const response = await fetch(`${API_URL}/admin/analytics?api_key=${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      console.log('Response status:', response.status)
      
      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}))
        setError(errorData.error || 'Invalid admin API key. Please check your credentials.')
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
      console.log('Analytics data received:', data)
      setAnalytics(data)
      localStorage.setItem('admin_api_key', key)
      setShowApiKeyInput(false)
    } catch (err) {
      console.error('Analytics error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics. Please check the browser console for details.')
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

  // Show loading only while checking for stored key
  if (checkingStoredKey) {
    return (
      <main style={{
        minHeight: '100vh',
        backgroundColor: '#f5f7fa',
        padding: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <p style={{ color: '#6b7280' }}>Checking for saved credentials...</p>
        </div>
      </main>
    )
  }

  if (showApiKeyInput) {
    return (
      <main style={{
        minHeight: '100vh',
        backgroundColor: '#f5f7fa',
        padding: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem', color: '#1f2937' }}>
            Admin Analytics Access
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
            Enter your admin API key to access analytics dashboard.
          </p>
          {error && (
            <div style={{
              padding: '0.75rem',
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              borderRadius: '6px',
              color: '#991b1b',
              marginBottom: '1rem'
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
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '0.9375rem',
                marginBottom: '1rem'
              }}
            />
            <button
              type="submit"
              disabled={!apiKey.trim() || loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.9375rem',
                fontWeight: '600',
                backgroundColor: (!apiKey.trim() || loading) ? '#9ca3af' : '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: (!apiKey.trim() || loading) ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              {(() => {
                console.log('Button render - loading:', loading, 'apiKey:', apiKey ? 'has value' : 'empty')
                if (loading) return 'Loading...'
                if (!apiKey.trim()) return 'Enter API Key'
                return 'Access Analytics'
              })()}
            </button>
          </form>
        </div>
      </main>
    )
  }

  // Only show full-page loading if we're fetching and not showing input
  if (loading && !showApiKeyInput && !analytics) {
    return (
      <main style={{
        minHeight: '100vh',
        backgroundColor: '#f5f7fa',
        padding: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: '#6b7280' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Loading analytics...</div>
        </div>
      </main>
    )
  }

  if (error || !analytics) {
    return (
      <main style={{
        minHeight: '100vh',
        backgroundColor: '#f5f7fa',
        padding: '2rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          maxWidth: '800px',
          margin: '0 auto',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem', color: '#ef4444' }}>
            Error Loading Analytics
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>{error || 'Unknown error'}</p>
          <button
            onClick={() => {
              localStorage.removeItem('admin_api_key')
              setShowApiKeyInput(true)
              setError(null)
            }}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </main>
    )
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
          borderLeft: '4px solid #8b5cf6'
        }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1f2937', margin: 0 }}>
              Admin Analytics Dashboard
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', margin: '0.25rem 0 0 0' }}>
              System-wide metrics and user activity
            </p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('admin_api_key')
              setShowApiKeyInput(true)
              setAnalytics(null)
            }}
            style={{
              padding: '0.625rem 1.25rem',
              fontSize: '0.875rem',
              backgroundColor: '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Logout
          </button>
        </div>

        {/* Key Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <MetricCard
            title="Total Users"
            value={analytics.totalUsers.toLocaleString()}
            color="#3b82f6"
          />
          <MetricCard
            title="Verified Users"
            value={analytics.verifiedUsers.toLocaleString()}
            color="#10b981"
          />
          <MetricCard
            title="Non-Verified Users"
            value={analytics.nonVerifiedUsers.toLocaleString()}
            color="#f59e0b"
          />
          <MetricCard
            title="Verification Rate"
            value={`${analytics.verificationRate}%`}
            color="#8b5cf6"
          />
        </div>

        {/* Activity Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <MetricCard
            title="Activity (24h)"
            value={analytics.recentActivity24h.toLocaleString()}
            color="#ef4444"
          />
          <MetricCard
            title="Activity (7d)"
            value={analytics.recentActivity7d.toLocaleString()}
            color="#f59e0b"
          />
          <MetricCard
            title="Activity (30d)"
            value={analytics.recentActivity30d.toLocaleString()}
            color="#3b82f6"
          />
        </div>

        {/* Status Distribution */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
            Status Distribution (Last 30 Days)
          </h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {Object.entries(analytics.statusDistribution).map(([status, count]) => (
              <div
                key={status}
                style={{
                  padding: '0.75rem 1rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  {status}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                  {count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Verifications */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
            Recent Verifications (Last 7 Days)
          </h2>
          {analytics.recentVerifications.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {analytics.recentVerifications.map((verification, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '0.75rem',
                    backgroundColor: '#f9fafb',
                    borderRadius: '6px',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>
                      User: {verification.userId.substring(0, 8)}...
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {new Date(verification.createdAt).toLocaleString()}
                    </div>
                  </div>
                  {verification.scoreBin && (
                    <div style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      Score: {verification.scoreBin}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
              No recent verifications
            </div>
          )}
        </div>

        {/* Extension Point Note */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#eff6ff',
          borderRadius: '8px',
          border: '1px solid #bfdbfe'
        }}>
          <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>
            <strong>Extension Point:</strong> This page can be extended to embed Power BI dashboards or other analytics tools. 
            The data comes from the same backend endpoint, ensuring consistency across all analytics views.
          </div>
        </div>
      </div>
    </main>
  )
}

function MetricCard({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div style={{
      backgroundColor: 'white',
      padding: '1.5rem',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      borderTop: `3px solid ${color}`
    }}>
      <div style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
        {title}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: '700', color: color }}>
        {value}
      </div>
    </div>
  )
}

