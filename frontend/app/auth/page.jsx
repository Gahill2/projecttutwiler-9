'use client'

import { useState, useEffect } from 'react'
import styles from './auth.module.css'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070'

export default function AuthPage() {
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Get or create demo user ID
    if (typeof window !== 'undefined') {
      let demoUserId = window.localStorage.getItem('demo_user_id')
      if (!demoUserId) {
        demoUserId = crypto.randomUUID()
        window.localStorage.setItem('demo_user_id', demoUserId)
      }
      setUserId(demoUserId)
    }
  }, [])

  const handleStartVerification = () => {
    if (!userId) return
    
    setLoading(true)
    // Redirect to gateway auth start endpoint
    window.location.href = `${API_URL}/auth/start?user_id=${userId}`
  }

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Identity Verification</h1>
      
      <div className={styles.section}>
        <p>Click the button below to start the verification process.</p>
      </div>

      <button
        onClick={handleStartVerification}
        disabled={!userId || loading}
        className={styles.button}
      >
        {loading ? 'Starting...' : 'Start Verification'}
      </button>

      {userId && (
        <div className={styles.userInfo}>
          <p>User ID: {userId}</p>
        </div>
      )}
    </main>
  )
}

