const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070'

export async function apiRequest(endpoint, options) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`)
  }

  return response.json()
}

export async function getUserStatus(userId) {
  return apiRequest(`/user/${userId}/status`)
}

export async function getAdminAnalytics(apiKey) {
  return apiRequest(`/admin/analytics?api_key=${encodeURIComponent(apiKey)}`)
}

export async function getDashboardStats() {
  return apiRequest(`/admin/analytics/stats`)
}

