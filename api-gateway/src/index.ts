import express from 'express'
import cors from 'cors'
import axios from 'axios'

const app = express()
const PORT = 7070

const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:8080'
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

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`)
})

