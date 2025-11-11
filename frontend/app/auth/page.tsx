'use client'

import { useState, useEffect } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070'

export default function AuthPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Get or create demo user ID
    let demoUserId = localStorage.getItem('demo_user_id')
    if (!demoUserId) {
      demoUserId = crypto.randomUUID()
      localStorage.setItem('demo_user_id', demoUserId)
    }
    setUserId(demoUserId)
  }, [])

  const handleStartVerification = () => {
    if (!userId) return
    
    setLoading(true)
    // Redirect to gateway auth start endpoint
    window.location.href = `${API_URL}/auth/start?user_id=${userId}`
  }

  return (
    <main style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Identity Verification</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <p>Click the button below to start the verification process.</p>
      </div>

      <button
        onClick={handleStartVerification}
        disabled={!userId || loading}
        style={{
          padding: '1rem 2rem',
          fontSize: '1.1rem',
          cursor: (!userId || loading) ? 'not-allowed' : 'pointer',
          backgroundColor: '#0070f3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
        }}
      >
        {loading ? 'Starting...' : 'Start Verification'}
      </button>

      {userId && (
        <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: '#666' }}>
          <p>User ID: {userId}</p>
        </div>
      )}
    </main>
  )
}

