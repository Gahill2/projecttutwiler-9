'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070'

export default function VerifiedDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [recentCves, setRecentCves] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalThreats: 1247,
    criticalAlerts: 23,
    verifiedUsers: 156,
    activeIssues: 8,
    resolvedIssues: 142
  })

  useEffect(() => {
    const fetchData = async () => {
      try {
        const cveResponse = await fetch(`${API_URL}/cve-ingestor/cves/recent?limit=10`)
        if (cveResponse.ok) {
          const cveData = await cveResponse.json()
          setRecentCves(cveData.cves || [])
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  return (
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#f5f7fa',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        {/* Professional Header */}
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
              Comprehensive threat intelligence and security management
            </p>
          </div>
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

        {/* Key Metrics Row */}
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
              Critical Alerts
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#ef4444' }}>
              {stats.criticalAlerts}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Requires immediate attention
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
              Active Issues
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
              {stats.activeIssues}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Under investigation
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
              Threats Tracked
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#3b82f6' }}>
              {stats.totalThreats.toLocaleString()}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              Total vulnerabilities
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
              Resolved Issues
            </div>
            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
              {stats.resolvedIssues}
            </div>
            <div style={{ color: '#9ca3af', fontSize: '0.75rem', marginTop: '0.25rem' }}>
              This month
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
          {/* Recent Critical Vulnerabilities */}
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
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
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

          {/* Security Issue Reporting */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#1f2937', marginBottom: '1.5rem' }}>
              Report Security Issue
            </h2>
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#eff6ff',
              borderRadius: '6px',
              border: '1px solid #bfdbfe',
              marginBottom: '1rem'
            }}>
              <div style={{ color: '#1e40af', fontSize: '0.875rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Verified users can post security concerns for AI analysis
              </div>
              <div style={{ color: '#1e3a8a', fontSize: '0.8125rem', lineHeight: '1.5' }}>
                Submit detailed security issues that will be analyzed by our AI system. If deemed worthy, your issue will be posted to the community with suggested remediation steps.
              </div>
            </div>
            <button
              onClick={() => router.push('/portal')}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Submit New Security Issue
            </button>
          </div>
        </div>

        {/* Bottom Row - Additional Features */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '1.5rem'
        }}>
          {/* Threat Intelligence */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
              Threat Intelligence
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                  Active Threats
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  {stats.criticalAlerts} critical threats detected
                </div>
              </div>
              <div style={{ padding: '0.75rem', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.25rem' }}>
                  Bio-Specific Threats
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  Monitoring biotech infrastructure
                </div>
              </div>
            </div>
          </div>

          {/* Security Controls */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
              Security Controls
            </h3>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Compliance Score</span>
                <span style={{ fontSize: '0.875rem', fontWeight: '600', color: '#1f2937' }}>78%</span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e5e7eb',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: '78%',
                  height: '100%',
                  backgroundColor: '#10b981',
                  transition: 'width 0.3s'
                }} />
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              Last updated: {new Date().toLocaleDateString()}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1f2937', marginBottom: '1rem' }}>
              Quick Actions
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button
                onClick={() => window.open('https://www.cisa.gov/known-exploited-vulnerabilities-catalog', '_blank')}
                style={{
                  padding: '0.625rem',
                  fontSize: '0.875rem',
                  textAlign: 'left',
                  backgroundColor: '#f9fafb',
                  color: '#1f2937',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                CISA KEV Catalog
              </button>
              <button
                onClick={() => window.open('https://nvd.nist.gov/vuln/search', '_blank')}
                style={{
                  padding: '0.625rem',
                  fontSize: '0.875rem',
                  textAlign: 'left',
                  backgroundColor: '#f9fafb',
                  color: '#1f2937',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                NVD Database
              </button>
              <button
                onClick={() => window.open('https://www.cisa.gov/cybersecurity', '_blank')}
                style={{
                  padding: '0.625rem',
                  fontSize: '0.875rem',
                  textAlign: 'left',
                  backgroundColor: '#f9fafb',
                  color: '#1f2937',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                CISA Resources
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
