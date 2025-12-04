'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

interface SubmissionResponse {
  user_id: string
  status: 'verified' | 'non_verified'
  decision: string
  score_bin?: string
  reason_codes?: string[]
}

export default function Portal() {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hello! I'm your security support assistant. I'm here to help you with cyberbiosecurity concerns.\n\nOur AI verification system will:\n- Verify you are a real human (not a bot)\n- Verify you have a legitimate security threat (not spam)\n\nIf you have a verified API key, you can enter it now to skip verification. Otherwise, I'll guide you through the verification process.\n\nDo you have an API key? (Type 'yes' to enter one, or 'no' to continue with verification)",
      timestamp: new Date()
    }
  ])
  
  const DEMO_LOGIN_TEXT = 'DEMO_LOGIN_VERIFIED'
  const DEMO_LOGIN_NON_VERIFIED = 'DEMO_LOGIN_NON_VERIFIED'
  const DEMO_LOGIN_ADMIN = 'DEMO_LOGIN_ADMIN'
  const DEMO_VERIFIED_API_KEY = 'demo-verified-key-123'
  const DEMO_ADMIN_API_KEY = 'demo-admin-key-123'
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [collectingInfo, setCollectingInfo] = useState(true)
  const [apiKey, setApiKey] = useState<string | null>(null)
  const [apiKeyValidated, setApiKeyValidated] = useState(false)
  const [userInfo, setUserInfo] = useState({
    name: '',
    role: '',
    problem: ''
  })
  const [currentStep, setCurrentStep] = useState<'api_key_check' | 'api_key' | 'name' | 'role' | 'problem'>('api_key_check')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const addMessage = (role: 'user' | 'assistant' | 'system', content: string) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }])
  }

  const validateApiKey = async (key: string) => {
    try {
      const response = await fetch(`${API_URL}/portal/validate-api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: key }),
      })

      if (!response.ok) {
        return { valid: false, isAdmin: false }
      }

      const data = await response.json()
      return { valid: data.valid === true, isAdmin: data.isAdmin === true }
    } catch {
      return { valid: false, isAdmin: false }
    }
  }

  const handleCollectInfo = async (userInput: string) => {
    if (!userInput.trim()) return

    addMessage('user', userInput)

    // Check for demo login text FIRST - grants verified, non-verified, or admin access
    // This should work regardless of current step
    const demoLoginText = 'DEMO_LOGIN_VERIFIED'
    const demoLoginNonVerified = 'DEMO_LOGIN_NON_VERIFIED'
    const demoLoginAdmin = 'DEMO_LOGIN_ADMIN'
    
    if (userInput.trim() === demoLoginAdmin) {
      setLoading(true)
      addMessage('assistant', '✓ Admin demo login detected. Redirecting to admin dashboard...')
      
      // Store admin API key in localStorage for the admin dashboard
      localStorage.setItem('admin_api_key', DEMO_ADMIN_API_KEY)
      
      setTimeout(() => {
        router.push('/admin/analytics')
      }, 1500)
      setLoading(false)
      return
    }
    
    if (userInput.trim() === demoLoginText) {
      setLoading(true)
      addMessage('assistant', '✓ Demo login detected. Granting verified access...')
      
      // Submit with demo credentials and route directly to verified dashboard
      try {
        const response = await fetch(`${API_URL}/portal/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Dr. Sarah Chen',
            role: 'Senior Security Analyst at BioTech Research Institute',
            problem: 'CVE-2024-12345: Critical vulnerability in laboratory management system affecting DNA sequencing equipment. Potential for unauthorized access to genetic data and manipulation of research results. Requires immediate patching.',
            apiKey: apiKey || undefined,
          }),
        })

        addMessage('assistant', '✓ Verified access granted. Redirecting to verified dashboard...')
        setTimeout(() => {
          router.push('/dashboard/verified')
        }, 1500)
      } catch (err) {
        // Even on error, route to verified dashboard for demo
        addMessage('assistant', 'Redirecting to verified dashboard...')
        setTimeout(() => {
          router.push('/dashboard/verified')
        }, 1000)
      } finally {
        setLoading(false)
      }
      return
    }
    
    if (userInput.trim() === demoLoginNonVerified) {
      setLoading(true)
      addMessage('assistant', '✓ Non-verified demo login detected. Routing to non-verified dashboard...')
      
      // Submit with non-verified demo credentials
      try {
        const response = await fetch(`${API_URL}/portal/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'John Doe',
            role: 'General User',
            problem: 'General security inquiry about best practices.',
          }),
        })

        addMessage('assistant', '✓ Non-verified access granted. Redirecting to non-verified dashboard...')
        setTimeout(() => {
          router.push('/dashboard/non-verified')
        }, 1500)
      } catch (err) {
        // Even on error, route to non-verified dashboard for demo
        addMessage('assistant', 'Redirecting to non-verified dashboard...')
        setTimeout(() => {
          router.push('/dashboard/non-verified')
        }, 1000)
      } finally {
        setLoading(false)
      }
      return
    }

    // Check for demo logins again here (in case they're entered during API key step)
    if (userInput.trim() === demoLoginText || userInput.trim() === demoLoginNonVerified || userInput.trim() === demoLoginAdmin) {
      // Already handled above, return early
      return
    }

    if (currentStep === 'api_key_check') {
      const lowerInput = userInput.toLowerCase().trim()
      if (lowerInput === 'yes' || lowerInput === 'y') {
        setCurrentStep('api_key')
        setTimeout(() => {
          addMessage('assistant', 'Please enter your API key. This will grant you immediate verified access.')
        }, 500)
      } else {
        setCurrentStep('name')
        setTimeout(() => {
          addMessage('assistant', 'No problem! Let\'s proceed with verification. What is your name?')
        }, 500)
      }
    } else if (currentStep === 'api_key') {
      setLoading(true)
      const keyResult = await validateApiKey(userInput)
      setLoading(false)

      if (keyResult.valid) {
        setApiKey(userInput)
        setApiKeyValidated(true)
        
        // If admin key, store it and route directly to admin dashboard
        if (keyResult.isAdmin) {
          // Store admin API key in localStorage for the admin dashboard
          localStorage.setItem('admin_api_key', userInput)
          addMessage('assistant', '✓ Admin API key validated! Redirecting to admin dashboard...')
          setTimeout(() => {
            router.push('/admin/analytics')
          }, 1500)
          return
        }
        
        // Otherwise, continue with verified user flow
        addMessage('assistant', '✓ API key validated! You have verified access. Let\'s continue with your information.')
        setCurrentStep('name')
        setTimeout(() => {
          addMessage('assistant', 'What is your name?')
        }, 500)
      } else {
        addMessage('assistant', 'Invalid API key. Let\'s proceed with the standard verification process instead.')
        setCurrentStep('name')
        setTimeout(() => {
          addMessage('assistant', 'What is your name?')
        }, 500)
      }
    } else if (currentStep === 'name') {
      setUserInfo(prev => ({ ...prev, name: userInput }))
      setCurrentStep('role')
      setTimeout(() => {
        addMessage('assistant', `Thank you, ${userInput}. What is your role or organization? (e.g., "Security Analyst at BioTech Corp" or "IT Manager at Research Lab")`)
      }, 500)
    } else if (currentStep === 'role') {
      setUserInfo(prev => ({ ...prev, role: userInput }))
      setCurrentStep('problem')
      setTimeout(() => {
        addMessage('assistant', 'Now, please describe your security concern or the issue you\'re experiencing. Be as detailed as possible - this helps me understand the biological context and potential impact.')
      }, 500)
    } else if (currentStep === 'problem') {
      // Update state and immediately use the values for submission
      const finalUserInfo = { ...userInfo, problem: userInput }
      setUserInfo(finalUserInfo)
      setCollectingInfo(false)
      setTimeout(() => {
        if (apiKeyValidated) {
          addMessage('assistant', 'Thank you! Since you\'re using a verified API key, I\'m routing you directly to your verified dashboard...')
        } else {
          addMessage('assistant', 'Thank you for providing that information. I\'m now analyzing your submission to determine the appropriate security response. This may take a moment...')
        }
        handleSubmit(finalUserInfo)
      }, 500)
    }
  }


  const handleSubmit = async (submissionInfo?: { name: string; role: string; problem: string }) => {
    setLoading(true)

    // Use provided info or fall back to state
    const infoToSubmit = submissionInfo || userInfo

    try {
      const response = await fetch(`${API_URL}/portal/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: infoToSubmit.name,
          role: infoToSubmit.role,
          problem: infoToSubmit.problem,
          apiKey: apiKey,
        }),
      })

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const data: SubmissionResponse = await response.json()
      
      // Add verification result message
      const statusMessage = data.status === 'verified' 
        ? apiKeyValidated
          ? `✓ API Key Authentication: You've been granted verified access. Routing you to your verified dashboard with prioritized threat intelligence.`
          : `✓ Verification Complete: You've been verified as a trusted user. Based on your role and the nature of your concern, I'm routing you to the appropriate security resources.`
        : `Your submission has been received. While we're processing your request, I'm routing you to general security resources. Our team will review your concern.`

      addMessage('assistant', statusMessage)

      if (data.score_bin || data.reason_codes) {
        let details = ''
        if (data.score_bin) {
          details += `Confidence Score: ${data.score_bin}\n`
        }
        if (data.reason_codes && data.reason_codes.length > 0) {
          details += `Assessment: ${data.reason_codes.join(', ')}`
        }
        if (details) {
          addMessage('system', details)
        }
      }

      // Route to appropriate dashboard after a delay
      setTimeout(() => {
        if (data.status === 'verified') {
          addMessage('assistant', 'Redirecting you to your verified dashboard with prioritized threat intelligence...')
          setTimeout(() => {
            router.push('/dashboard/verified')
          }, 2000)
        } else {
          addMessage('assistant', 'Redirecting you to general security resources...')
          setTimeout(() => {
            router.push('/dashboard/non-verified')
          }, 2000)
        }
      }, 3000)

    } catch (err) {
      let errorMessage = 'Unknown error'
      if (err instanceof Error) {
        errorMessage = err.message
        // Try to extract error from response if available
        if (err.message.includes('Failed to fetch')) {
          errorMessage = 'Unable to connect to the server. Please check your connection and try again.'
        }
      }
      addMessage('assistant', `I encountered an error processing your request: ${errorMessage}. Please try again or contact support.`)
      console.error('Portal submission error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    if (collectingInfo) {
      handleCollectInfo(input)
    } else {
      // After verification, handle additional questions
      addMessage('user', input)
      addMessage('assistant', 'I\'m processing your request. Please wait while I route you to the appropriate resources...')
    }

    setInput('')
  }

  return (
    <main style={{ 
      minHeight: '100vh', 
      padding: '2rem',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        maxWidth: '800px',
        width: '100%',
        height: '80vh',
        maxHeight: '700px',
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '0',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f7fafc',
          borderTopLeftRadius: '12px',
          borderTopRightRadius: '12px'
        }}>
          <h1 style={{ 
            fontSize: '1.5rem', 
            marginBottom: '0.25rem',
            color: '#1a202c',
            fontWeight: '700'
          }}>
            Security Support Portal
          </h1>
          <p style={{ 
            color: '#718096', 
            fontSize: '0.875rem',
            margin: 0
          }}>
            AI-powered cyberbiosecurity assistant
          </p>
        </div>

        {/* Demo Login Section - Always Visible */}
        <div style={{
          padding: '1.25rem 2rem',
          backgroundColor: '#e6fffa',
          borderBottom: '2px solid #38b2ac',
          borderTop: '1px solid #e2e8f0'
        }}>
          <div style={{ 
            fontWeight: '700', 
            marginBottom: '1rem', 
            color: '#234e52',
            fontSize: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span>🚀</span>
            <span>Team Member Demo Logins</span>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            {/* Verified Login */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              border: '2px solid #10b981'
            }}>
              <div style={{ fontWeight: '600', color: '#234e52', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                ✅ Verified Dashboard Access
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#2d3748', marginBottom: '0.75rem' }}>
                Paste this code to access verified dashboard:
              </div>
              <code style={{ 
                backgroundColor: '#edf2f7', 
                padding: '0.5rem', 
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontWeight: '600',
                fontSize: '0.875rem',
                display: 'block',
                cursor: 'pointer',
                userSelect: 'all',
                border: '1px solid #cbd5e0'
              }}>{DEMO_LOGIN_TEXT}</code>
            </div>
            
            {/* Non-Verified Login */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              border: '2px solid #f59e0b'
            }}>
              <div style={{ fontWeight: '600', color: '#234e52', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                ⏳ Non-Verified Dashboard Access
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#2d3748', marginBottom: '0.75rem' }}>
                Paste this code to access non-verified dashboard:
              </div>
              <code style={{ 
                backgroundColor: '#edf2f7', 
                padding: '0.5rem', 
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontWeight: '600',
                fontSize: '0.875rem',
                display: 'block',
                cursor: 'pointer',
                userSelect: 'all',
                border: '1px solid #cbd5e0'
              }}>{DEMO_LOGIN_NON_VERIFIED}</code>
            </div>

            {/* Admin Login */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              border: '2px solid #8b5cf6'
            }}>
              <div style={{ fontWeight: '600', color: '#234e52', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                🔐 Admin Dashboard Access
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#2d3748', marginBottom: '0.75rem' }}>
                Paste this code to access admin dashboard:
              </div>
              <code style={{ 
                backgroundColor: '#edf2f7', 
                padding: '0.5rem', 
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontWeight: '600',
                fontSize: '0.875rem',
                display: 'block',
                cursor: 'pointer',
                userSelect: 'all',
                border: '1px solid #cbd5e0'
              }}>{DEMO_LOGIN_ADMIN}</code>
            </div>
          </div>

          {/* API Keys Section */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginTop: '1rem'
          }}>
            {/* Verified API Key */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              border: '2px solid #3b82f6'
            }}>
              <div style={{ fontWeight: '600', color: '#1e40af', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                🔑 Verified API Key
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#2d3748', marginBottom: '0.75rem' }}>
                Use this API key to skip verification:
              </div>
              <code style={{ 
                backgroundColor: '#edf2f7', 
                padding: '0.5rem', 
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontWeight: '600',
                fontSize: '0.875rem',
                display: 'block',
                cursor: 'pointer',
                userSelect: 'all',
                border: '1px solid #cbd5e0'
              }}>{DEMO_VERIFIED_API_KEY}</code>
            </div>

            {/* Admin API Key */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              border: '2px solid #8b5cf6'
            }}>
              <div style={{ fontWeight: '600', color: '#6b21a8', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                🔐 Admin API Key
              </div>
              <div style={{ fontSize: '0.8125rem', color: '#2d3748', marginBottom: '0.75rem' }}>
                Use this for admin dashboard access:
              </div>
              <code style={{ 
                backgroundColor: '#edf2f7', 
                padding: '0.5rem', 
                borderRadius: '4px',
                fontFamily: 'monospace',
                fontWeight: '600',
                fontSize: '0.875rem',
                display: 'block',
                cursor: 'pointer',
                userSelect: 'all',
                border: '1px solid #cbd5e0'
              }}>{DEMO_ADMIN_API_KEY}</code>
            </div>
          </div>

          <div style={{ 
            padding: '0.75rem',
            backgroundColor: '#ffffff',
            borderRadius: '4px',
            fontSize: '0.8125rem', 
            color: '#2d3748',
            border: '1px solid #cbd5e0',
            marginTop: '1rem'
          }}>
            <strong>💡 Tip:</strong> Team members can use either login code to test both dashboards. You can navigate between them using the buttons on each dashboard. Use the API keys to skip verification or access the admin dashboard.
          </div>
        </div>

        {/* Messages Container */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          {messages.map((message, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                alignItems: 'flex-start',
                gap: '0.75rem'
              }}
            >
              {message.role !== 'user' && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: message.role === 'assistant' ? '#667eea' : '#48bb78',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  flexShrink: 0
                }}>
                  {message.role === 'assistant' ? 'AI' : '✓'}
                </div>
              )}
              <div style={{
                maxWidth: '70%',
                padding: '0.875rem 1.125rem',
                borderRadius: '12px',
                backgroundColor: message.role === 'user' 
                  ? '#667eea' 
                  : message.role === 'system'
                  ? '#edf2f7'
                  : '#f7fafc',
                color: message.role === 'user' ? 'white' : '#2d3748',
                border: message.role === 'system' ? '1px solid #cbd5e0' : 'none',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '0.9375rem',
                lineHeight: '1.5'
              }}>
                {message.content}
              </div>
              {message.role === 'user' && (
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#cbd5e0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4a5568',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  flexShrink: 0
                }}>
                  You
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#667eea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '600',
                flexShrink: 0
              }}>
                AI
              </div>
              <div style={{
                padding: '0.875rem 1.125rem',
                borderRadius: '12px',
                backgroundColor: '#f7fafc',
                color: '#2d3748'
              }}>
                <span style={{ display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }}>
                  Analyzing...
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} style={{
          padding: '1.5rem 2rem',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#f7fafc',
          borderBottomLeftRadius: '12px',
          borderBottomRightRadius: '12px'
        }}>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={collectingInfo 
                ? (currentStep === 'api_key_check' ? "Type 'yes' or 'no'..."
                   : currentStep === 'api_key' ? "Enter your API key..."
                   : currentStep === 'name' ? "Enter your name..." 
                   : currentStep === 'role' ? "Enter your role or organization..."
                   : "Describe your security concern...")
                : "Type your message..."}
              disabled={loading}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                border: '2px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.9375rem',
                transition: 'border-color 0.2s',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '0.9375rem',
                fontWeight: '600',
                color: 'white',
                backgroundColor: (!input.trim() || loading) ? '#a0aec0' : '#667eea',
                border: 'none',
                borderRadius: '8px',
                cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              Send
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </main>
  )
}
