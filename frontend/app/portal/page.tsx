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
  user_id?: string
  userId?: string  // Backend returns 'UserId' (capital U) in JSON
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

        localStorage.setItem('user_verified', 'true')
        addMessage('assistant', '✓ Verified access granted. Redirecting to dashboard...')
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } catch (err) {
        // Even on error, route to verified dashboard for demo
        addMessage('assistant', 'Redirecting to verified dashboard...')
        setTimeout(() => {
          localStorage.setItem('user_verified', 'true')
          router.push('/dashboard')
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
          localStorage.setItem('user_verified', 'false')
          router.push('/dashboard')
        }, 1500)
      } catch (err) {
        // Even on error, route to non-verified dashboard for demo
        addMessage('assistant', 'Redirecting to non-verified dashboard...')
        setTimeout(() => {
          localStorage.setItem('user_verified', 'false')
          router.push('/dashboard')
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
      
      // Store user_id from backend response - this links portal and dashboard
      // Backend returns 'UserId' (capital U) in JSON, but we check all formats
      const userId = data.user_id || data.userId || data.UserId
      if (userId) {
        localStorage.setItem('user_id', userId)
        // Also store in dashboard_user_id for backward compatibility
        localStorage.setItem('dashboard_user_id', userId)
      }
      
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

      // Store verification status
      if (data.status === 'verified') {
        localStorage.setItem('user_verified', 'true')
      } else {
        localStorage.setItem('user_verified', 'false')
      }

      // Route to unified dashboard after a delay
      setTimeout(() => {
        if (data.status === 'verified') {
          addMessage('assistant', 'Redirecting you to your dashboard with full access...')
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
        } else {
          addMessage('assistant', 'Redirecting you to your dashboard with limited access...')
          setTimeout(() => {
            router.push('/dashboard')
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
    primary: '#10b981',
    primaryGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    success: '#10b981',
    successGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    warning: '#f59e0b',
    warningGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    danger: '#ef4444',
    green: '#10b981',
    greenGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
  }

  return (
    <main style={{ 
      minHeight: '100vh', 
      padding: '2rem',
      background: darkTheme.bgGradient,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        maxWidth: '900px',
        width: '100%',
        height: '92vh',
        maxHeight: '900px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '32px',
        padding: '0',
        border: `1px solid ${darkTheme.glassBorder}`,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: `1px solid ${darkTheme.glassBorder}`,
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}>
          <h1 style={{ 
            fontSize: '1.75rem',
            fontWeight: '800',
            marginBottom: '0.25rem',
            background: darkTheme.primaryGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.02em'
          }}>
            BioGate Portal
          </h1>
          <p style={{ 
            color: darkTheme.textMuted, 
            fontSize: '0.875rem',
            margin: 0,
            fontWeight: '500'
          }}>
            AI-powered cyberbiosecurity assistant for BIO-ISAC
          </p>
        </div>

        {/* Demo Login Section - Modern Glassmorphism */}
        <div style={{
          padding: '1rem 1.5rem',
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${darkTheme.glassBorder}`
        }}>
          <div style={{ 
            fontWeight: '800', 
            marginBottom: '1rem', 
            color: darkTheme.text,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}>
            <span>🚀</span>
            <span>Demo Logins</span>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '0.75rem'
          }}>
            {/* Verified Login */}
            <div style={{
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderRadius: '20px',
              border: `1px solid ${darkTheme.success}40`,
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'
              e.currentTarget.style.borderColor = darkTheme.success
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.borderColor = darkTheme.success + '40'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '60px',
                height: '60px',
                background: `radial-gradient(circle, ${darkTheme.success}20, transparent 70%)`,
                borderRadius: '50%',
                transform: 'translate(30%, -30%)'
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontWeight: '700', color: darkTheme.text, marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                  ✅ Verified
                </div>
                <code style={{ 
                  background: 'rgba(0, 0, 0, 0.2)', 
                  padding: '0.5rem 0.75rem', 
                  borderRadius: '12px',
                  fontFamily: 'monospace',
                  fontWeight: '700',
                  fontSize: '0.6875rem',
                  display: 'block',
                  cursor: 'pointer',
                  userSelect: 'all',
                  border: `1px solid ${darkTheme.glassBorder}`,
                  color: darkTheme.text,
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)'
                  e.currentTarget.style.borderColor = darkTheme.success
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)'
                  e.currentTarget.style.borderColor = darkTheme.glassBorder
                }}
                >{DEMO_LOGIN_TEXT}</code>
              </div>
            </div>
            
            {/* Non-Verified Login */}
            <div style={{
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderRadius: '20px',
              border: `1px solid ${darkTheme.warning}40`,
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'
              e.currentTarget.style.borderColor = darkTheme.warning
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(245, 158, 11, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.borderColor = darkTheme.warning + '40'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '60px',
                height: '60px',
                background: `radial-gradient(circle, ${darkTheme.warning}20, transparent 70%)`,
                borderRadius: '50%',
                transform: 'translate(30%, -30%)'
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontWeight: '700', color: darkTheme.text, marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                  ⏳ Non-Verified
                </div>
                <code style={{ 
                  background: 'rgba(0, 0, 0, 0.2)', 
                  padding: '0.5rem 0.75rem', 
                  borderRadius: '12px',
                  fontFamily: 'monospace',
                  fontWeight: '700',
                  fontSize: '0.6875rem',
                  display: 'block',
                  cursor: 'pointer',
                  userSelect: 'all',
                  border: `1px solid ${darkTheme.glassBorder}`,
                  color: darkTheme.text,
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)'
                  e.currentTarget.style.borderColor = darkTheme.warning
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)'
                  e.currentTarget.style.borderColor = darkTheme.glassBorder
                }}
                >{DEMO_LOGIN_NON_VERIFIED}</code>
              </div>
            </div>

            {/* Admin Login */}
            <div style={{
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              borderRadius: '20px',
              border: `1px solid ${darkTheme.purple}40`,
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'
              e.currentTarget.style.borderColor = darkTheme.purple
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.borderColor = darkTheme.purple + '40'
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            >
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '60px',
                height: '60px',
                background: `radial-gradient(circle, ${darkTheme.purple}20, transparent 70%)`,
                borderRadius: '50%',
                transform: 'translate(30%, -30%)'
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontWeight: '700', color: darkTheme.text, marginBottom: '0.5rem', fontSize: '0.75rem' }}>
                  🔐 Admin
                </div>
                <code style={{ 
                  background: 'rgba(0, 0, 0, 0.2)', 
                  padding: '0.5rem 0.75rem', 
                  borderRadius: '12px',
                  fontFamily: 'monospace',
                  fontWeight: '700',
                  fontSize: '0.6875rem',
                  display: 'block',
                  cursor: 'pointer',
                  userSelect: 'all',
                  border: `1px solid ${darkTheme.glassBorder}`,
                  color: darkTheme.text,
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)'
                  e.currentTarget.style.borderColor = darkTheme.purple
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)'
                  e.currentTarget.style.borderColor = darkTheme.glassBorder
                }}
                >{DEMO_LOGIN_ADMIN}</code>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Container */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1.5rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          background: 'rgba(255, 255, 255, 0.02)'
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
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: message.role === 'assistant' ? darkTheme.primaryGradient : darkTheme.successGradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: '700',
                  flexShrink: 0,
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)'
                }}>
                  {message.role === 'assistant' ? 'AI' : '✓'}
                </div>
              )}
              <div style={{
                maxWidth: '75%',
                padding: '1rem 1.25rem',
                borderRadius: message.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                background: message.role === 'user' 
                  ? darkTheme.primaryGradient
                  : message.role === 'system'
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(255, 255, 255, 0.08)',
                backdropFilter: message.role !== 'user' ? 'blur(10px)' : 'none',
                WebkitBackdropFilter: message.role !== 'user' ? 'blur(10px)' : 'none',
                color: message.role === 'user' ? 'white' : darkTheme.text,
                border: message.role === 'system' ? `1px solid ${darkTheme.glassBorder}` : 'none',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '0.9375rem',
                lineHeight: '1.6',
                fontWeight: message.role === 'user' ? '500' : '400',
                boxShadow: message.role === 'user' ? '0 4px 20px rgba(99, 102, 241, 0.3)' : '0 2px 10px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (message.role !== 'user') {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (message.role !== 'user') {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
              >
                {message.content}
              </div>
              {message.role === 'user' && (
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  border: `1px solid ${darkTheme.glassBorder}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: darkTheme.text,
                  fontSize: '0.875rem',
                  fontWeight: '700',
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
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: darkTheme.primaryGradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: '700',
                flexShrink: 0,
                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                animation: 'pulse 2s ease-in-out infinite'
              }}>
                AI
              </div>
              <div style={{
                padding: '1rem 1.25rem',
                borderRadius: '20px 20px 20px 4px',
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                border: `1px solid ${darkTheme.glassBorder}`,
                color: darkTheme.text,
                fontSize: '0.9375rem',
                fontWeight: '500'
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
          borderTop: `1px solid ${darkTheme.glassBorder}`,
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
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
                padding: '1rem 1.25rem',
                border: `1px solid ${darkTheme.glassBorder}`,
                borderRadius: '20px',
                fontSize: '0.9375rem',
                transition: 'all 0.3s ease',
                outline: 'none',
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                color: darkTheme.text,
                fontWeight: '500'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = darkTheme.primary
                e.target.style.background = 'rgba(255, 255, 255, 0.08)'
                e.target.style.transform = 'scale(1.02)'
                e.target.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.2)'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = darkTheme.glassBorder
                e.target.style.background = 'rgba(255, 255, 255, 0.05)'
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = 'none'
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              style={{
                padding: '1rem 2rem',
                fontSize: '0.9375rem',
                fontWeight: '700',
                color: 'white',
                background: (!input.trim() || loading) 
                  ? 'rgba(255, 255, 255, 0.05)' 
                  : darkTheme.primaryGradient,
                border: 'none',
                borderRadius: '20px',
                cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                whiteSpace: 'nowrap',
                boxShadow: (!input.trim() || loading) ? 'none' : '0 4px 20px rgba(99, 102, 241, 0.4)'
              }}
              onMouseEnter={(e) => {
                if (input.trim() && !loading) {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(99, 102, 241, 0.5)'
                }
              }}
              onMouseLeave={(e) => {
                if (input.trim() && !loading) {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(99, 102, 241, 0.4)'
                }
              }}
            >
              {loading ? 'Sending...' : 'Send →'}
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
