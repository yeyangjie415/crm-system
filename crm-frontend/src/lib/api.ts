/* ------------------------------------------------------------------ */
/*  Unified API client — falls back to local state when backend is    */
/*  unavailable (dev / demo mode).                                    */
/* ------------------------------------------------------------------ */

const API_BASE = '/api'
const TOKEN_KEY = 'crm_token'

let authToken: string | null = (() => {
  try {
    return localStorage.getItem(TOKEN_KEY) || null
  } catch { return null }
})()

export function setToken(token: string | null) {
  authToken = token
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch { /* private browsing */ }
}

export function getToken(): string | null {
  return authToken
}

export function clearToken() {
  authToken = null
  try { localStorage.removeItem(TOKEN_KEY) } catch { /* */ }
}

/** Dispatched when an authenticated request gets 401 (token expired/invalid). */
export const AUTH_EXPIRED_EVENT = 'crm:auth-expired'

export interface ApiError extends Error {
  status?: number
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: { raw?: boolean }
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const wasAuthenticated = !!authToken
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const parsed = await res.json().catch(() => ({ error: res.statusText }))
    // A request that carried a token but was rejected means the session expired.
    // Notify the app so it can clear the session (login itself is unauthenticated
    // and its 401 means wrong credentials — not session expiry).
    if (res.status === 401 && wasAuthenticated) {
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    }
    const err: ApiError = new Error(parsed.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }

  if (res.status === 204) return undefined as T
  return options?.raw ? (res as T) : res.json()
}

/* ------------------------------------------------------------------ */
/*  Auth                                                               */
/* ------------------------------------------------------------------ */

export async function login(username: string, password: string) {
  const data = await request<{ token: string; user: any }>('POST', '/auth/login', { username, password })
  setToken(data.token)
  return data
}

export async function getMe() {
  return request<any>('GET', '/auth/me')
}

/* ------------------------------------------------------------------ */
/*  Customers                                                          */
/* ------------------------------------------------------------------ */

export const customersApi = {
  list: () => request<any[]>('GET', '/customers'),
  get: (id: string) => request<any>('GET', `/customers/${id}`),
  create: (data: any) => request<any>('POST', '/customers', data),
  update: (id: string, data: any) => request<any>('PUT', `/customers/${id}`, data),
  delete: (id: string, userId: string, userName: string) =>
    request<any>('DELETE', `/customers/${id}`, { userId, userName }),
  hardDelete: (id: string) =>
    request<any>('DELETE', `/customers/${id}/hard`),
  claim: (id: string, userId: string, userName: string) =>
    request<any>('POST', `/customers/${id}/claim`, { userId, userName }),
  release: (id: string) =>
    request<any>('POST', `/customers/${id}/release`),
  publicPool: () => request<any[]>('GET', '/customers/pool/public'),
  addContact: (customerId: string, data: any) =>
    request<any>('POST', `/customers/${customerId}/contacts`, data),
  updateContact: (customerId: string, contactId: string, data: any) =>
    request<any>('PUT', `/customers/${customerId}/contacts/${contactId}`, data),
  deleteContact: (customerId: string, contactId: string) =>
    request<any>('DELETE', `/customers/${customerId}/contacts/${contactId}`),
}

/* ------------------------------------------------------------------ */
/*  Contracts                                                          */
/* ------------------------------------------------------------------ */

export const contractsApi = {
  list: () => request<any[]>('GET', '/contracts'),
  get: (id: string) => request<any>('GET', `/contracts/${id}`),
  create: (data: any) => request<any>('POST', '/contracts', data),
  update: (id: string, data: any) => request<any>('PUT', `/contracts/${id}`, data),
  delete: (id: string) => request<any>('DELETE', `/contracts/${id}`),
  updatePayment: (contractId: string, paymentId: string, data: any) =>
    request<any>('PUT', `/contracts/${contractId}/payments/${paymentId}`, data),
  addPayment: (contractId: string, data: any) =>
    request<any>('POST', `/contracts/${contractId}/payments`, data),
  removePayment: (contractId: string, paymentId: string) =>
    request<any>('DELETE', `/contracts/${contractId}/payments/${paymentId}`),
  addArchivedFile: (contractId: string, data: any) =>
    request<any>('POST', `/contracts/${contractId}/archived-files`, data),
  removeArchivedFile: (contractId: string, fileId: string) =>
    request<any>('DELETE', `/contracts/${contractId}/archived-files/${fileId}`),
}

/* ------------------------------------------------------------------ */
/*  Reports                                                            */
/* ------------------------------------------------------------------ */

export const reportsApi = {
  summary: (params?: { year?: string; month?: string }) => {
    const qs = new URLSearchParams()
    if (params?.year) qs.set('year', params.year)
    if (params?.month) qs.set('month', params.month)
    const suffix = qs.toString() ? `?${qs}` : ''
    return request<any>('GET', `/reports/summary${suffix}`)
  },
  collections: () => request<any>('GET', '/reports/collections'),
  customers: () => request<any>('GET', '/reports/customers'),
}

/* ------------------------------------------------------------------ */
/*  Visits                                                             */
/* ------------------------------------------------------------------ */

export const visitsApi = {
  list: () => request<any[]>('GET', '/visits'),
  get: (id: string) => request<any>('GET', `/visits/${id}`),
  create: (data: any) => request<any>('POST', '/visits', data),
  update: (id: string, data: any) => request<any>('PUT', `/visits/${id}`, data),
  delete: (id: string) => request<any>('DELETE', `/visits/${id}`),
}

/* ------------------------------------------------------------------ */
/*  Expenses                                                           */
/* ------------------------------------------------------------------ */

export const expensesApi = {
  list: () => request<any[]>('GET', '/expenses'),
  get: (id: string) => request<any>('GET', `/expenses/${id}`),
  create: (data: any) => request<any>('POST', '/expenses', data),
  update: (id: string, data: any) => request<any>('PUT', `/expenses/${id}`, data),
  delete: (id: string) => request<any>('DELETE', `/expenses/${id}`),
  /** 一级审核（直属主管）：approved=false 时 comment 必填 */
  managerReview: (id: string, approved: boolean, comment?: string) =>
    request<any>('POST', `/expenses/${id}/manager-review`, { approved, comment }),
  /** 二级审核（财务）：approved=false 时 comment 必填 */
  financeReview: (id: string, approved: boolean, comment?: string) =>
    request<any>('POST', `/expenses/${id}/finance-review`, { approved, comment }),
  /** 财务核销打款 */
  pay: (id: string, comment?: string) =>
    request<any>('POST', `/expenses/${id}/pay`, { comment }),
  /** 申请人签收确认 */
  settle: (id: string) =>
    request<any>('POST', `/expenses/${id}/settle`, {}),
}

/* ------------------------------------------------------------------ */
/*  Notifications                                                      */
/* ------------------------------------------------------------------ */

export const notificationsApi = {
  list: (toUserId?: string) =>
    request<any[]>('GET', `/notifications${toUserId ? `?toUserId=${toUserId}` : ''}`),
  create: (data: any) => request<any>('POST', '/notifications', data),
  update: (id: string, data: any) => request<any>('PUT', `/notifications/${id}`, data),
}

/* ------------------------------------------------------------------ */
/*  Tasks                                                              */
/* ------------------------------------------------------------------ */

export const tasksApi = {
  list: () => request<any[]>('GET', '/tasks'),
  get: (id: string) => request<any>('GET', `/tasks/${id}`),
  create: (data: any) => request<any>('POST', '/tasks', data),
  update: (id: string, data: any) => request<any>('PUT', `/tasks/${id}`, data),
  delete: (id: string) => request<any>('DELETE', `/tasks/${id}`),
  submit: (id: string) => request<any>('POST', `/tasks/${id}/submit`),
  approve: (id: string) => request<any>('POST', `/tasks/${id}/approve`),
  reject: (id: string, reason: string) => request<any>('POST', `/tasks/${id}/reject`, { reason }),
}

/* ------------------------------------------------------------------ */
/*  Follow Records                                                      */
/* ------------------------------------------------------------------ */

export const followRecordsApi = {
  list: (projectId?: string) => {
    const qs = projectId ? `?projectId=${projectId}` : ''
    return request<any[]>('GET', `/follow-records${qs}`)
  },
  create: (data: any) => request<any>('POST', '/follow-records', data),
  delete: (id: string) => request<any>('DELETE', `/follow-records/${id}`),
}

/* ------------------------------------------------------------------ */
/*  Users                                                               */
/* ------------------------------------------------------------------ */

export const usersApi = {
  list: () => request<any[]>('GET', '/users'),
  create: (data: any) => request<any>('POST', '/users', data),
  update: (id: string, data: any) => request<any>('PUT', `/users/${id}`, data),
  delete: (id: string) => request<any>('DELETE', `/users/${id}`),
}

/* ------------------------------------------------------------------ */
/*  System                                                             */
/* ------------------------------------------------------------------ */

export const systemApi = {
  health: () => request<any>('GET', '/system/health'),
  restart: () => request<any>('POST', '/system/restart'),
  getAutoStart: () => request<{ enabled: boolean }>('GET', '/system/auto-start'),
  setAutoStart: (enabled: boolean) => request<{ enabled: boolean; message: string }>('POST', '/system/auto-start', { enabled }),
  backup: () => request<any>('GET', '/system/backup', undefined, { raw: true }),
  restore: (data: string) => request<{ message: string }>('POST', '/system/backup/restore', { data }),
  listBackups: () => request<{ backups: Array<{ name: string; size: number; createdAt: string }>; latestBackup: string | null }>('GET', '/system/backup/list'),
}

let backendAvailable: boolean | null = null
let lastCheckTime = 0
let checkingBackend = false
let checkQueue: Array<(ok: boolean) => void> = []

export async function isBackendAvailable(): Promise<boolean> {
  // Return cached true if checked within 30s
  if (backendAvailable === true && Date.now() - lastCheckTime < 30_000) return true
  // If another check is in flight, queue and wait
  if (checkingBackend) {
    return new Promise(resolve => { checkQueue.push(resolve) })
  }
  checkingBackend = true
  try {
    const headers: Record<string, string> = {}
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`
    const res = await fetch(`${API_BASE}/auth/me`, { method: 'HEAD', headers })
    backendAvailable = res.ok || res.status === 401
    lastCheckTime = Date.now()
    return backendAvailable
  } catch {
    backendAvailable = null
    lastCheckTime = 0
    return false
  } finally {
    checkingBackend = false
    const queue = checkQueue
    checkQueue = []
    queue.forEach(resolve => resolve(backendAvailable === true))
  }
}
