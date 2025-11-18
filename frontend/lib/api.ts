const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7070'

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
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

export async function getUserStatus(userId: string) {
  return apiRequest<{
    user_id: string
    status: string
    last_verified_at: string | null
  }>(`/user/${userId}/status`)
}

export async function getAdminAnalytics(apiKey: string) {
  return apiRequest<{
    totalUsers: number
    verifiedUsers: number
    nonVerifiedUsers: number
    recentActivity24h: number
    recentActivity7d: number
    recentActivity30d: number
    verificationRate: number
    recentVerifications: Array<{
      userId: string
      createdAt: string
      scoreBin: string | null
    }>
    statusDistribution: Record<string, number>
  }>(`/admin/analytics?api_key=${encodeURIComponent(apiKey)}`)
}

export async function getDashboardStats() {
  return apiRequest<{
    totalThreats: number
    criticalAlerts: number
    verifiedUsers: number
    activeIssues: number
    resolvedIssues: number
  }>(`/admin/analytics/stats`)
}

