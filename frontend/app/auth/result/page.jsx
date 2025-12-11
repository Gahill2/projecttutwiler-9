'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { getUserStatus } from '../../../../lib/api'
import styles from './result.module.css'

export default function ResultPage() {
  const searchParams = useSearchParams()
  const status = searchParams.get('status')
  const [userStatus, setUserStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStatus = async () => {
      if (typeof window === 'undefined') return
      
      const userId = window.localStorage.getItem('demo_user_id')
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
    <main className={styles.main}>
      <h1 className={styles.title}>Verification Result</h1>

      <div className={styles.section}>
        <h2 className={styles.subtitle}>Status: {statusText}</h2>
      </div>

      {loading && <p>Loading user status...</p>}
      
      {error && (
        <div className={styles.error}>
          <p className={styles.errorText}>Error: {error}</p>
        </div>
      )}

      {userStatus && (
        <div>
          <h2 className={styles.subtitle}>User Status</h2>
          <pre className={styles.code}>
            {JSON.stringify(userStatus, null, 2)}
          </pre>
        </div>
      )}

      <div className={styles.linkSection}>
        <a href="/auth" className={styles.link}>
          Start New Verification
        </a>
      </div>
    </main>
  )
}

