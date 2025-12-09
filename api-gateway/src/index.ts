import express from 'express'
import cors from 'cors'
import axios from 'axios'

// Initialize Sentry if DSN is provided (optional, will fail silently if not available)
const initSentry = (serviceName: string) => {
  const dsn = process.env.SENTRY_DSN
  if (!dsn) return
  
  // Use require with try-catch to avoid TypeScript errors if package not installed
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Sentry = require('@sentry/node')
    Sentry.init({
      dsn,
      environment: process.env.APP_ENV || process.env.NODE_ENV || 'dev',
      release: process.env.GIT_SHA,
      tracesSampleRate: 1.0,
    })
    Sentry.setTag('service', serviceName)
  } catch {
    // Sentry SDK not installed, silently continue
  }
}

initSentry('api-gateway')

const app = express()
const PORT = 7070

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:8080'
const CVE_INGESTOR_URL = process.env.CVE_INGESTOR_URL || 'http://localhost:9095'
const PUBLIC_WEB_ORIGIN = process.env.PUBLIC_WEB_ORIGIN || 'http://localhost:3000'

app.use(cors({ origin: PUBLIC_WEB_ORIGIN }))
app.use(express.json())

// TODO: Uncomment to enable security middleware
// import { verifyApiKey, verifySignature, verifyTimestamp } from './security'
// app.use((req, res, next) => {
//   const apiKey = req.headers['x-api-key']
//   const signature = req.headers['x-signature']
//   const timestamp = req.headers['x-timestamp']
//   
//   if (!verifyApiKey(apiKey)) {
//     return res.status(401).json({ error: 'Invalid API key' })
//   }
//   if (!verifyTimestamp(timestamp)) {
//     return res.status(401).json({ error: 'Invalid timestamp' })
//   }
//   if (!verifySignature(req.body, signature, timestamp)) {
//     return res.status(401).json({ error: 'Invalid signature' })
//   }
//   next()
// })

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.get('/db/ping', async (req, res) => {
  try {
    const response = await axios.get(`${ORCHESTRATOR_URL}/db/ping`)
    res.json(response.data)
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to ping database' })
  }
})

// Auth routes - proxy to orchestrator and follow redirects
app.get('/auth/start', async (req, res) => {
  try {
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString()
    const response = await axios.get(`${ORCHESTRATOR_URL}/auth/start?${queryString}`, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    })
    
    // If orchestrator returns a redirect, pass it through
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      res.redirect(response.status, response.headers.location)
    } else {
      res.status(response.status).json(response.data)
    }
  } catch (error: any) {
    if (error.response?.status >= 300 && error.response?.status < 400 && error.response?.headers?.location) {
      // Follow redirect from orchestrator
      res.redirect(error.response.status, error.response.headers.location)
    } else {
      res.status(500).json({ error: error.message || 'Failed to start verification' })
    }
  }
})

app.get('/auth/callback', async (req, res) => {
  try {
    const queryString = new URLSearchParams(req.query as Record<string, string>).toString()
    const response = await axios.get(`${ORCHESTRATOR_URL}/auth/callback?${queryString}`, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 200 && status < 400
    })
    
    // If orchestrator returns a redirect, pass it through
    if (response.status >= 300 && response.status < 400 && response.headers.location) {
      res.redirect(response.status, response.headers.location)
    } else {
      res.status(response.status).json(response.data)
    }
  } catch (error: any) {
    if (error.response?.status >= 300 && error.response?.status < 400 && error.response?.headers?.location) {
      // Follow redirect from orchestrator
      res.redirect(error.response.status, error.response.headers.location)
    } else {
      res.status(500).json({ error: error.message || 'Failed to handle callback' })
    }
  }
})

// API key validation endpoint
app.post('/portal/validate-api-key', async (req, res) => {
  try {
    const response = await axios.post(`${ORCHESTRATOR_URL}/portal/validate-api-key`, req.body)
    res.json(response.data)
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || error.message || 'Failed to validate API key' 
    })
  }
})

// Portal submission endpoint
app.post('/portal/submit', async (req, res) => {
  try {
    const response = await axios.post(`${ORCHESTRATOR_URL}/portal/submit`, req.body)
    res.json(response.data)
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || error.message || 'Failed to submit portal request' 
    })
  }
})

// CVE ingestor routes - proxy to CVE ingestor service
app.get('/cve-ingestor/cves/recent', async (req, res) => {
  try {
    const limit = req.query.limit || 10
    const response = await axios.get(`${CVE_INGESTOR_URL}/cves/recent?limit=${limit}`)
    res.json(response.data)
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || error.message || 'Failed to fetch recent CVEs' 
    })
  }
})

// AI-RAG routes - proxy to AI-RAG service
const AI_RAG_URL = process.env.AI_RAG_URL || 'http://localhost:9090'

app.post('/ai-rag/chat', async (req, res) => {
  try {
    const response = await axios.post(`${AI_RAG_URL}/chat`, req.body)
    res.json(response.data)
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.detail || error.message || 'Failed to process chat request' 
    })
  }
})

app.post('/ai-rag/analyze-threat', async (req, res) => {
  try {
    const response = await axios.post(`${AI_RAG_URL}/analyze`, req.body)
    res.json(response.data)
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.detail || error.message || 'Failed to analyze threat' 
    })
  }
})

// Admin analytics route - proxy to orchestrator
app.get('/admin/analytics', async (req, res) => {
  try {
    // Forward admin API key from header or query param
    const apiKey = req.headers['x-admin-api-key'] || req.query.api_key
    
    if (!apiKey) {
      return res.status(401).json({ error: 'Admin API key required' })
    }
    
    const headers: Record<string, string> = {
      'X-Admin-API-Key': apiKey as string
    }
    
    // Also pass as query param as fallback
    const response = await axios.get(`${ORCHESTRATOR_URL}/admin/analytics?api_key=${encodeURIComponent(apiKey as string)}`, { headers })
    res.json(response.data)
  } catch (error: any) {
    console.error('Admin analytics error:', error.message)
    const status = error.response?.status || 500
    const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch analytics'
    res.status(status).json({ error: errorMessage })
  }
})

// Admin request route - proxy to orchestrator (for verified users to request admin actions)
app.post('/admin/request', async (req, res) => {
  try {
    const response = await axios.post(`${ORCHESTRATOR_URL}/admin/request`, req.body)
    res.json(response.data)
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || error.message || 'Failed to submit admin request' 
    })
  }
})

// Admin CVE listing route
app.get('/admin/cves', async (req, res) => {
  try {
    const apiKey = req.headers['x-admin-api-key'] || req.query.api_key
    if (!apiKey) {
      return res.status(401).json({ error: 'Admin API key required' })
    }
    
    const headers: Record<string, string> = {
      'X-Admin-API-Key': apiKey as string
    }
    
    const queryParams = new URLSearchParams()
    if (req.query.severity) queryParams.append('severity', req.query.severity as string)
    if (req.query.status) queryParams.append('status', req.query.status as string)
    if (req.query.user_type) queryParams.append('user_type', req.query.user_type as string)
    if (req.query.sort_by) queryParams.append('sort_by', req.query.sort_by as string)
    if (req.query.sort_order) queryParams.append('sort_order', req.query.sort_order as string)
    if (req.query.limit) queryParams.append('limit', req.query.limit as string)
    if (req.query.offset) queryParams.append('offset', req.query.offset as string)
    queryParams.append('api_key', apiKey as string)
    
    const response = await axios.get(`${ORCHESTRATOR_URL}/admin/cves?${queryParams.toString()}`, { headers })
    res.json(response.data)
  } catch (error: any) {
    console.error('Admin CVE listing error:', error.message)
    const status = error.response?.status || 500
    const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch CVEs'
    res.status(status).json({ error: errorMessage })
  }
})

// Admin threat analysis route
app.post('/admin/analyze-threat', async (req, res) => {
  try {
    const apiKey = req.headers['x-admin-api-key'] || req.query.api_key
    if (!apiKey) {
      return res.status(401).json({ error: 'Admin API key required' })
    }
    
    const headers: Record<string, string> = {
      'X-Admin-API-Key': apiKey as string,
      'Content-Type': 'application/json'
    }
    
    const response = await axios.post(
      `${ORCHESTRATOR_URL}/admin/analyze-threat?api_key=${encodeURIComponent(apiKey as string)}`,
      req.body,
      { headers }
    )
    res.json(response.data)
  } catch (error: any) {
    console.error('Admin threat analysis error:', error.message)
    const status = error.response?.status || 500
    const errorMessage = error.response?.data?.error || error.message || 'Failed to analyze threat'
    res.status(status).json({ error: errorMessage })
  }
})

// Admin user analytics over time route
app.get('/admin/user-analytics', async (req, res) => {
  try {
    const apiKey = req.headers['x-admin-api-key'] || req.query.api_key
    if (!apiKey) {
      return res.status(401).json({ error: 'Admin API key required' })
    }
    
    const headers: Record<string, string> = {
      'X-Admin-API-Key': apiKey as string
    }
    
    const queryParams = new URLSearchParams()
    if (req.query.days) queryParams.append('days', req.query.days as string)
    queryParams.append('api_key', apiKey as string)
    
    const response = await axios.get(`${ORCHESTRATOR_URL}/admin/user-analytics?${queryParams.toString()}`, { headers })
    res.json(response.data)
  } catch (error: any) {
    console.error('Admin user analytics error:', error.message)
    const status = error.response?.status || 500
    const errorMessage = error.response?.data?.error || error.message || 'Failed to fetch user analytics'
    res.status(status).json({ error: errorMessage })
  }
})

// CVE submission route - proxy to orchestrator
app.post('/cve/submit', async (req, res) => {
  try {
    const response = await axios.post(`${ORCHESTRATOR_URL}/cve/submit`, req.body)
    res.json(response.data)
  } catch (error: any) {
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || error.message || 'Failed to submit CVE' 
    })
  }
})

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`)
})

