'use client'

import { useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070'

export default function Home() {
  const [apiResult, setApiResult] = useState<string | null>(null)
  const [dbResult, setDbResult] = useState<string | null>(null)
  const [loading, setLoading] = useState({ api: false, db: false })

  const checkAPI = async () => {
    setLoading({ ...loading, api: true })
    setApiResult(null)
    try {
      const res = await fetch(`${API_URL}/health`)
      const data = await res.json()
      setApiResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setApiResult(JSON.stringify({ error: String(error) }, null, 2))
    } finally {
      setLoading({ ...loading, api: false })
    }
  }

  const checkDatabase = async () => {
    setLoading({ ...loading, db: true })
    setDbResult(null)
    try {
      const res = await fetch(`${API_URL}/db/ping`)
      const data = await res.json()
      setDbResult(JSON.stringify(data, null, 2))
    } catch (error) {
      setDbResult(JSON.stringify({ error: String(error) }, null, 2))
    } finally {
      setLoading({ ...loading, db: false })
    }
  }

  return (
    <main style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Project Tutwiler</h1>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          onClick={checkAPI}
          disabled={loading.api}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            cursor: loading.api ? 'not-allowed' : 'pointer',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          {loading.api ? 'Checking...' : 'Check API'}
        </button>
        
        <button
          onClick={checkDatabase}
          disabled={loading.db}
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            cursor: loading.db ? 'not-allowed' : 'pointer',
            backgroundColor: '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
        >
          {loading.db ? 'Checking...' : 'Check Database'}
        </button>
        
        <a
          href="/portal"
          style={{
            padding: '0.75rem 1.5rem',
            fontSize: '1rem',
            cursor: 'pointer',
            backgroundColor: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            textDecoration: 'none',
            display: 'inline-block',
          }}
        >
          Security Portal →
        </a>
      </div>

      {apiResult && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>API Result</h2>
          <pre
            style={{
              padding: '1rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              overflow: 'auto',
            }}
          >
            {apiResult}
          </pre>
        </div>
      )}

      {dbResult && (
        <div>
          <h2 style={{ marginBottom: '0.5rem' }}>Database Result</h2>
          <pre
            style={{
              padding: '1rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              overflow: 'auto',
            }}
          >
            {dbResult}
          </pre>
        </div>
      )}
    </main>
  )
}

