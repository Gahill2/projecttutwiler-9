'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { getUserStatus } from '../../../lib/api'

export default function ResultPage() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status')
  const [userStatus, setUserStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStatus = async () => {
      const userId = localStorage.getItem('demo_user_id')
      if (!userId) {
        setError('No user ID found')
        setLoading(false)
        return
      }

      try {
        const data = await getUserStatus(userId)
        setUserStatus(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch status')
      } finally {
        setLoading(false)
      }
    }

    fetchStatus()
  }, [])

  const statusText = status === 'verified' ? 'Verified' : status === 'non_verified' ? 'Non Verified' : 'Unknown'

  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Verification Result</h1>

      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '0.5rem' }}>Status: {statusText}</h2>
      </div>

      {loading && <p>Loading user status...</p>}
      
      {error && (
        <div style={{ padding: '1rem', backgroundColor: '#fee', borderRadius: '4px', marginBottom: '2rem' }}>
          <p style={{ color: '#c00' }}>Error: {error}</p>
        </div>
      )}

      {userStatus && (
        <div>
          <h2 style={{ marginBottom: '0.5rem' }}>User Status</h2>
          <pre
            style={{
              padding: '1rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              overflow: 'auto',
            }}
          >
            {JSON.stringify(userStatus, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '2rem' }}>
        <a
          href="/auth"
          style={{
            color: '#0070f3',
            textDecoration: 'underline',
          }}
        >
          Start New Verification
        </a>
      </div>
    </main>
  )
}

