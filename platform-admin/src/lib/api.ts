const apiBase = (import.meta.env.VITE_API_URL || window.location.origin).replace(/\/$/, '')

const buildUrl = (path: string) => {
  if (!path.startsWith('/')) {
    return `${apiBase}/${path}`
  }
  return `${apiBase}${path}`
}

export interface PlatformAdmin {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  companyId?: string | null
  company?: unknown
  permissions: {
    canManageCompanies: boolean
    canManageBilling: boolean
    canViewAllStores: boolean
  }
}

export const API_BASE_URL = apiBase

export const storeSession = (token: string, admin: PlatformAdmin) => {
  localStorage.setItem('platformToken', token)
  localStorage.setItem('platformAdmin', JSON.stringify(admin))
}

export const clearSession = () => {
  localStorage.removeItem('platformToken')
  localStorage.removeItem('platformAdmin')
}

const authorizedFetch = (path: string, init: RequestInit = {}, tokenOverride?: string) => {
  const headers = new Headers(init.headers || undefined)
  const token = tokenOverride ?? localStorage.getItem('platformToken')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return fetch(buildUrl(path), {
    ...init,
    headers,
    credentials: 'include',
  })
}

export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    const response = await fetch(buildUrl('/api/platform/refresh'), {
      method: 'POST',
      credentials: 'include',
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    storeSession(data.token, data.admin)
    return data.token as string
  } catch (error) {
    console.error('Failed to refresh access token', error)
    return null
  }
}

export const fetchWithAuth = async (path: string, init: RequestInit = {}) => {
  const response = await authorizedFetch(path, init)

  if (response.status !== 401) {
    return response
  }

  const refreshed = await refreshAccessToken()

  if (!refreshed) {
    clearSession()
    throw new Error('Session expired. Please log in again.')
  }

  return authorizedFetch(path, init, refreshed)
}

export const logoutRequest = async () => {
  try {
    await fetch(buildUrl('/api/platform/logout'), {
      method: 'POST',
      credentials: 'include',
    })
  } finally {
    clearSession()
  }
}
