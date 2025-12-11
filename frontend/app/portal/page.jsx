'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// API URL
const API_URL = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) 
  ? process.env.NEXT_PUBLIC_API_URL 
  : 'http://localhost:7070'

export default function Portal() {
  const router = useRouter()
  const [messages, setMessages] = useState([
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
  const [apiKey, setApiKey] = useState(null)
  const [apiKeyValidated, setApiKeyValidated] = useState(false)
  const [userInfo, setUserInfo] = useState({
    name: '',
    role: '',
    problem: ''
  })
  const [currentStep, setCurrentStep] = useState('api_key_check')
  const messagesEndRef = useRef(null)
  const [cookiesAccepted, setCookiesAccepted] = useState(false)
  const [analyzingTime, setAnalyzingTime] = useState(0) // Time elapsed during analysis
  const analyzingTimeRef = useRef(null) // Ref to store interval ID

  // Check for cookie consent on mount
  useEffect(() => {
    const checkCookieConsent = () => {
      // Check if cookie consent cookie exists
      if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';')
        const consentCookie = cookies.find(cookie => cookie.trim().startsWith('cookie_consent='))
        if (consentCookie && consentCookie.includes('accepted=true')) {
          setCookiesAccepted(true)
        }
      }
    }
    checkCookieConsent()
  }, [])

  // Function to set cookie
  const setCookie = (name, value, days = 365) => {
    if (typeof document !== 'undefined') {
      const expires = new Date()
      expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)
      document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
    }
  }

  // Safe localStorage helper
  const safeLocalStorage = {
    setItem: (key, value) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.setItem(key, value)
        } catch (e) {
          console.warn('localStorage.setItem failed:', e)
        }
      }
    },
    getItem: (key) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          return window.localStorage.getItem(key)
        } catch (e) {
          console.warn('localStorage.getItem failed:', e)
          return null
        }
      }
      return null
    }
  }

  // Handle cookie acceptance
  const handleAcceptCookies = () => {
    setCookie('cookie_consent', 'accepted=true', 365)
    setCookiesAccepted(true)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const addMessage = (role, content) => {
    setMessages(prev => [...prev, { role, content, timestamp: new Date() }])
  }

  const validateApiKey = async (key) => {
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

  // Validate if input has real value (not spam/generic)
  const validateInputQuality = async (input, fieldType) => {
    // Basic checks
    const trimmed = input.trim()
    if (trimmed.length < 3) {
      return { valid: false, reason: 'too_short' }
    }

    // For names, be very lenient - only reject obvious single-word spam
    if (fieldType === 'name') {
      const lowerInput = trimmed.toLowerCase()
      // Only reject if it's exactly one of these obvious spam words (no partial matches)
      const obviousSpam = ['test', 'user', 'admin', 'asdf', 'qwerty', '123', 'abc', 'name', 'me', 'hi', 'hello']
      if (obviousSpam.includes(lowerInput)) {
        return { valid: false, reason: 'generic' }
      }
      // If it has spaces or multiple words, it's likely a real name - accept it
      if (trimmed.includes(' ') || trimmed.length >= 4) {
        return { valid: true }
      }
      // Single word names of 3+ characters are acceptable
      return { valid: true }
    }

    // Check for generic/low-value responses for role and problem
    const genericResponses = {
      role: ['test', 'user', 'admin', 'asdf', 'qwerty', '123', 'abc', 'role', 'job', 'work', 'employee'],
      problem: ['test', 'asdf', 'qwerty', '123', 'abc', 'nothing', 'n/a', 'na', 'none', 'lol', 'haha']
    }

    const lowerInput = trimmed.toLowerCase()
    // Check for exact matches or whole word matches only (not substring matches)
    if (genericResponses[fieldType]?.some(generic => {
      // Exact match
      if (lowerInput === generic) return true
      // Whole word match (word boundary check)
      const wordBoundaryRegex = new RegExp(`\\b${generic}\\b`, 'i')
      return wordBoundaryRegex.test(lowerInput)
    })) {
      return { valid: false, reason: 'generic' }
    }

    // For problem description, use AI to check if it's meaningful
    if (fieldType === 'problem') {
      try {
        const response = await fetch(`${API_URL}/ai-rag/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Is this a legitimate security concern or just spam/test input? Respond with only "LEGITIMATE" or "SPAM": "${input}"`,
            context: 'spam_detection',
            limit_features: true
          }),
        })

        if (response.ok) {
          const data = await response.json()
          const aiResponse = (data.response || '').toUpperCase()
          if (aiResponse.includes('SPAM') || aiResponse.includes('TEST') || aiResponse.includes('NOT LEGITIMATE')) {
            return { valid: false, reason: 'spam_detected' }
          }
        }
      } catch (err) {
        console.error('Spam detection error:', err)
        // Continue with submission if AI check fails
      }
    }

    return { valid: true }
  }

  const handleCollectInfo = async (userInput) => {
    if (!userInput.trim()) return

    addMessage('user', userInput)

    // Check for demo login text FIRST - grants verified, non-verified, or admin access
    // This should work regardless of current step
    const demoLoginText = 'DEMO_LOGIN_VERIFIED'
    const demoLoginNonVerified = 'DEMO_LOGIN_NON_VERIFIED'
    const demoLoginAdmin = 'DEMO_LOGIN_ADMIN'
    
    if (userInput.trim() === demoLoginAdmin) {
      addMessage('assistant', '✓ Admin demo login detected. Redirecting to admin dashboard...')
      
      // Store admin API key in localStorage for the admin dashboard
      safeLocalStorage.setItem('admin_api_key', DEMO_ADMIN_API_KEY)
      
      // Redirect immediately for demo
      router.push('/admin/analytics')
      return
    }
    
    if (userInput.trim() === demoLoginText) {
      addMessage('assistant', '✓ Demo login detected. Granting verified access...')
      
      // For demo, skip API call and redirect immediately
      safeLocalStorage.setItem('user_verified', 'true')
      safeLocalStorage.setItem('user_id', 'demo-verified-user')
      safeLocalStorage.setItem('dashboard_user_id', 'demo-verified-user')
      setCookie('user_verification_status', 'verified', 30) // Set cookie for 30 days
      
      addMessage('assistant', '✓ Verified access granted. Redirecting to dashboard...')
      
      // Redirect immediately for demo
      router.push('/dashboard/verified')
      return
    }
    
    if (userInput.trim() === demoLoginNonVerified) {
      addMessage('assistant', '✓ Non-verified demo login detected. Routing to non-verified dashboard...')
      
      // For demo, skip API call and redirect immediately
      safeLocalStorage.setItem('user_verified', 'false')
      safeLocalStorage.setItem('user_id', 'demo-non-verified-user')
      safeLocalStorage.setItem('dashboard_user_id', 'demo-non-verified-user')
      setCookie('user_verification_status', 'non-verified', 30) // Set cookie for 30 days
      
      addMessage('assistant', '✓ Non-verified access granted. Redirecting to non-verified dashboard...')
      
      // Redirect immediately for demo
      router.push('/dashboard/non-verified')
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
          safeLocalStorage.setItem('admin_api_key', userInput)
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
      setLoading(true)
      const validation = await validateInputQuality(userInput, 'name')
      setLoading(false)

      if (!validation.valid) {
        if (validation.reason === 'too_short') {
          addMessage('assistant', 'Please provide your full name. A name should be at least 3 characters long.')
        } else if (validation.reason === 'generic') {
          addMessage('assistant', 'Please provide your real name, not a generic placeholder. This helps us verify your identity and provide better support.')
        } else {
          addMessage('assistant', 'Please provide a valid name. This helps us verify your identity.')
        }
        return
      }

      setUserInfo(prev => ({ ...prev, name: userInput }))
      setCurrentStep('role')
      setTimeout(() => {
        addMessage('assistant', `Thank you, ${userInput}. What is your role or organization? (e.g., "Security Analyst at BioTech Corp" or "IT Manager at Research Lab")`)
      }, 500)
    } else if (currentStep === 'role') {
      setLoading(true)
      const validation = await validateInputQuality(userInput, 'role')
      setLoading(false)

      if (!validation.valid) {
        if (validation.reason === 'too_short') {
          addMessage('assistant', 'Please provide more details about your role or organization. For example: "Security Analyst at BioTech Corp" or "IT Manager at Research Lab".')
        } else if (validation.reason === 'generic') {
          addMessage('assistant', 'Please provide specific information about your role and organization. This helps us understand your security context and provide appropriate access. For example: "Security Analyst at BioTech Corp" or "IT Manager at Research Lab".')
        } else {
          addMessage('assistant', 'Please provide a valid role or organization name. This helps us understand your security context.')
        }
        return
      }

      setUserInfo(prev => ({ ...prev, role: userInput }))
      setCurrentStep('problem')
      setTimeout(() => {
        addMessage('assistant', 'Now, please describe your security concern or the issue you\'re experiencing. Be as detailed as possible - this helps me understand the biological context and potential impact.')
      }, 500)
    } else if (currentStep === 'problem') {
      setLoading(true)
      const validation = await validateInputQuality(userInput, 'problem')
      setLoading(false)

      if (!validation.valid) {
        if (validation.reason === 'too_short') {
          addMessage('assistant', 'Please provide a more detailed description of your security concern. A good description should:\n- Explain what the issue is\n- Describe the potential impact\n- Include relevant technical details\n\nFor example: "We discovered a vulnerability in our biosecurity monitoring system that could allow unauthorized access to sensitive research data."')
        } else if (validation.reason === 'generic' || validation.reason === 'spam_detected') {
          addMessage('assistant', 'I need more specific information about your security concern. Please provide:\n\n• What is the actual security issue or threat?\n• What systems or data are affected?\n• What is the potential impact?\n• Any relevant technical details\n\nFor example: "We discovered a vulnerability in our biosecurity monitoring system that could allow unauthorized access to sensitive research data. The issue affects our database authentication and could expose patient genetic information."')
        } else {
          addMessage('assistant', 'Please provide a detailed description of your security concern. This helps our AI system verify the legitimacy of your request and route you to the appropriate resources.')
        }
        return
      }

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


  const handleSubmit = async (submissionInfo) => {
    setLoading(true)
    setAnalyzingTime(0) // Reset timer

    // Start countdown timer
    analyzingTimeRef.current = setInterval(() => {
      setAnalyzingTime(prev => {
        const newTime = prev + 1
        // Update the analyzing message with time
        return newTime
      })
    }, 1000) // Update every second

    // Use provided info or fall back to state
    const infoToSubmit = submissionInfo || userInfo

    // Add timeout to prevent hanging - verification is instant but DB/ETL operations may take a moment
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout (verification is instant, but DB writes take time)

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
        signal: controller.signal
      })

      clearTimeout(timeoutId)
      
      // Stop the countdown timer when response is received
      if (analyzingTimeRef.current) {
        clearInterval(analyzingTimeRef.current)
        analyzingTimeRef.current = null
      }

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

      const data = await response.json()
      
      // Stop the countdown timer
      if (analyzingTimeRef.current) {
        clearInterval(analyzingTimeRef.current)
        analyzingTimeRef.current = null
      }
      
      // Store user_id from backend response - this links portal and dashboard
      // Backend returns 'UserId' (capital U) in JSON, but we check all formats
      const userId = data.user_id || data.userId || data.UserId
      if (userId) {
        safeLocalStorage.setItem('user_id', userId)
        // Also store in dashboard_user_id for backward compatibility
        safeLocalStorage.setItem('dashboard_user_id', userId)
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

      // Store verification status in localStorage and cookies
      if (data.status === 'verified') {
        safeLocalStorage.setItem('user_verified', 'true')
        setCookie('user_verification_status', 'verified', 30) // 30 days
      } else {
        safeLocalStorage.setItem('user_verified', 'false')
        setCookie('user_verification_status', 'non-verified', 30) // 30 days
      }

      // Route immediately - no artificial delays
      if (data.status === 'verified') {
        addMessage('assistant', 'Redirecting you to your dashboard with full access...')
        // Small delay just for message visibility (500ms)
        setTimeout(() => {
          router.push('/dashboard')
        }, 500)
      } else {
        addMessage('assistant', 'Redirecting you to your dashboard with limited access...')
        // Small delay just for message visibility (500ms)
        setTimeout(() => {
          router.push('/dashboard/non-verified')
        }, 500)
      }

    } catch (err) {
      clearTimeout(timeoutId)
      let errorMessage = 'Failed to submit your information. Please try again.'
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out after 30 seconds. Please try again.'
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        errorMessage = 'Network error: Unable to connect to the server. Please check your connection and try again.'
      } else if (err instanceof Error) {
        errorMessage = `Error: ${err.message}`
      }
      addMessage('assistant', `⚠️ ${errorMessage}`)
      console.error('Portal submission error:', err)
    } finally {
      // Stop the countdown timer
      if (analyzingTimeRef.current) {
        clearInterval(analyzingTimeRef.current)
        analyzingTimeRef.current = null
      }
      setLoading(false)
      setAnalyzingTime(0)
    }
  }

  const handleSend = async (e) => {
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
    // Stripe-inspired dark base colors
    bg: '#0a0a0a',
    bgGradient: 'linear-gradient(180deg, #0a0a0a 0%, #111111 100%)',
    surface: '#161616',
    surfaceHover: '#1f1f1f',
    card: '#1a1a1a',
    cardHover: '#242424',
    border: 'rgba(22, 163, 74, 0.2)',
    borderLight: 'rgba(22, 163, 74, 0.1)',
    borderHover: 'rgba(22, 163, 74, 0.4)',
    // Clean text colors
    text: '#fafafa',
    textMuted: '#a3a3a3',
    textSubtle: '#737373',
    // Forest green accents (tactical, cybersecurity feel)
    primary: '#16a34a',
    primaryGradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    primaryHover: '#22c55e',
    // Status colors
    success: '#16a34a',
    successGradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
    warning: '#eab308',
    warningGradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
    danger: '#ef4444',
    dangerGradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
    green: '#16a34a',
    greenGradient: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)'
  }

  // Show cookie consent modal if not accepted
  if (!cookiesAccepted) {
    return (
      <main style={{ 
        minHeight: '100vh', 
        padding: '2rem',
        background: darkTheme.bgGradient,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        {/* Overlay backdrop */}
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          zIndex: 9998
        }} />
        
        {/* Cookie Consent Modal */}
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          maxWidth: '600px',
          width: '90%',
          background: darkTheme.card,
          borderRadius: '32px',
          padding: '2.5rem',
          border: `1px solid ${darkTheme.border}`,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <style>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
                transform: translate(-50%, -48%);
              }
              to {
                opacity: 1;
                transform: translate(-50%, -50%);
              }
            }
          `}</style>
          
          {/* Header */}
          <div style={{
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '16px',
              background: darkTheme.primaryGradient,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}>
              🍪
            </div>
            <div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '800',
                color: darkTheme.text,
                margin: 0,
                marginBottom: '0.25rem',
                letterSpacing: '-0.02em'
              }}>
                Cookie Consent Required
              </h2>
              <p style={{
                fontSize: '0.875rem',
                color: darkTheme.textMuted,
                margin: 0,
                fontWeight: '500'
              }}>
                We use cookies to enhance your experience
              </p>
            </div>
          </div>

          {/* Content */}
          <div style={{
            marginBottom: '2rem',
            color: darkTheme.text,
            lineHeight: '1.7',
            fontSize: '0.9375rem'
          }}>
            <p style={{ marginBottom: '1rem', color: darkTheme.text }}>
              This application uses cookies to:
            </p>
            <ul style={{
              margin: 0,
              paddingLeft: '1.5rem',
              color: darkTheme.textMuted,
              marginBottom: '1.5rem'
            }}>
              <li style={{ marginBottom: '0.5rem' }}>Store your user session and preferences</li>
              <li style={{ marginBottom: '0.5rem' }}>Track your verification status</li>
              <li style={{ marginBottom: '0.5rem' }}>Remember your authentication state</li>
              <li style={{ marginBottom: '0.5rem' }}>Improve security and user experience</li>
            </ul>
            <p style={{
              margin: 0,
              padding: '1rem',
              background: darkTheme.surface,
              borderRadius: '16px',
              border: `1px solid ${darkTheme.border}`,
              color: darkTheme.text,
              fontWeight: '600'
            }}>
              ⚠️ You must accept cookies to continue using this portal.
            </p>
          </div>

          {/* Accept Button */}
          <button
            onClick={handleAcceptCookies}
            style={{
              width: '100%',
              padding: '1rem 2rem',
              background: darkTheme.primaryGradient,
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              fontSize: '1rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(22, 163, 74, 0.4)',
              letterSpacing: '0.02em'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 30px rgba(22, 163, 74, 0.5)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(22, 163, 74, 0.4)'
            }}
          >
            Accept Cookies & Continue
          </button>
        </div>
      </main>
    )
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
        background: darkTheme.card,
        borderRadius: '32px',
        padding: '0',
        border: `1px solid ${darkTheme.border}`,
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: `1px solid ${darkTheme.border}`,
          background: darkTheme.surface,
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
          background: darkTheme.surface,
          borderBottom: `1px solid ${darkTheme.border}`
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
              background: darkTheme.card,
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
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(22, 163, 74, 0.35)'
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
                  border: `1px solid ${darkTheme.border}`,
                  color: darkTheme.text,
                  transition: 'all 0.3s ease'
                }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)'
                e.currentTarget.style.borderColor = darkTheme.success
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)'
                e.currentTarget.style.borderColor = darkTheme.border
              }}
                >{DEMO_LOGIN_TEXT}</code>
              </div>
            </div>
            
            {/* Non-Verified Login */}
            <div style={{
              padding: '1rem',
              background: darkTheme.card,
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
                  border: `1px solid ${darkTheme.border}`,
                  color: darkTheme.text,
                  transition: 'all 0.3s ease'
                }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)'
              e.currentTarget.style.borderColor = darkTheme.warning
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)'
              e.currentTarget.style.borderColor = darkTheme.border
            }}
                >{DEMO_LOGIN_NON_VERIFIED}</code>
              </div>
            </div>

            {/* Admin Login */}
            <div style={{
              padding: '1rem',
              background: darkTheme.card,
              borderRadius: '20px',
              border: `1px solid ${darkTheme.primary}40`,
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)'
              e.currentTarget.style.borderColor = darkTheme.primary
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(139, 92, 246, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
              e.currentTarget.style.borderColor = darkTheme.borderHover
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
                background: `radial-gradient(circle, rgba(22, 163, 74, 0.12), transparent 70%)`,
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
                  border: `1px solid ${darkTheme.border}`,
                  color: darkTheme.text,
                  transition: 'all 0.3s ease'
                }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.3)'
                e.currentTarget.style.borderColor = darkTheme.primary
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.2)'
                e.currentTarget.style.borderColor = darkTheme.border
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
                color: message.role === 'user' ? 'white' : darkTheme.text,
                border: message.role === 'system' ? `1px solid ${darkTheme.border}` : 'none',
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
                  border: `1px solid ${darkTheme.border}`,
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
                background: darkTheme.cardHover,
                border: `1px solid ${darkTheme.border}`,
                color: darkTheme.text,
                fontSize: '0.9375rem',
                fontWeight: '500'
              }}>
                <span style={{ display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }}>
                  Analyzing... ({analyzingTime}s / ~30s max)
                </span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} style={{
          padding: '1.5rem 2rem',
          borderTop: `1px solid ${darkTheme.border}`,
          background: darkTheme.surface,
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
                border: `1px solid ${darkTheme.border}`,
                borderRadius: '20px',
                fontSize: '0.9375rem',
                transition: 'all 0.3s ease',
                outline: 'none',
                background: darkTheme.card,
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
                e.target.style.borderColor = darkTheme.border
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
