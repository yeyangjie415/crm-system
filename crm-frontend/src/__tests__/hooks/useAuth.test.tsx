import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { AuthProvider, useAuth } from '@/hooks/useAuth'
import { UserProvider } from '@/hooks/useUsers'
import { AuditLogProvider } from '@/hooks/useAuditLog'
import { PermissionConfigProvider } from '@/hooks/usePermissionConfig'
import { login as apiLogin, getMe, clearToken, getToken, AUTH_EXPIRED_EVENT } from '@/lib/api'

/* Mock the API layer: login/getMe behavior is what these tests exercise. */
vi.mock('@/lib/api', () => ({
  AUTH_EXPIRED_EVENT: 'crm:auth-expired',
  login: vi.fn(),
  getMe: vi.fn(),
  setToken: vi.fn(),
  clearToken: vi.fn(),
  getToken: vi.fn(() => null),
  isBackendAvailable: vi.fn(async () => false),
  usersApi: {
    list: vi.fn(async () => []),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))

const mockApiLogin = vi.mocked(apiLogin)
const mockGetMe = vi.mocked(getMe)
const mockClearToken = vi.mocked(clearToken)
const mockGetToken = vi.mocked(getToken)

const BACKEND_USER = {
  id: 'u1',
  name: '张管理',
  username: 'admin',
  role: 'general_manager',
  permissionLevel: 'super_admin',
  createdAt: '2024-01-01',
  disabled: false,
}

function createCollector() {
  let captured: ReturnType<typeof useAuth> | null = null
  function Collector() {
    captured = useAuth()
    return null
  }
  return {
    Collector,
    get: () => {
      if (!captured) throw new Error('Context not captured')
      return captured
    },
  }
}

function renderAuth() {
  const { Collector, get } = createCollector()
  render(
    <UserProvider>
      <AuditLogProvider>
        <PermissionConfigProvider>
          <AuthProvider>
            <Collector />
          </AuthProvider>
        </PermissionConfigProvider>
      </AuditLogProvider>
    </UserProvider>,
  )
  return get
}

describe('AuthProvider login', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockGetToken.mockReturnValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('backend login succeeds: user set, not offline, loginVersion bumped', async () => {
    mockApiLogin.mockResolvedValue({ token: 'jwt', user: BACKEND_USER })
    const get = renderAuth()
    let ok: boolean | undefined
    await act(async () => { ok = await get().login('admin', 'admin123') })
    expect(ok).toBe(true)
    expect(mockApiLogin).toHaveBeenCalledTimes(1)
    expect(get().user?.username).toBe('admin')
    expect(get().offlineMode).toBe(false)
    expect(get().loginVersion).toBe(1)
  })

  it('explicit credential rejection (401) fails fast: no retry, no offline fallback', async () => {
    const err = Object.assign(new Error('用户名或密码错误'), { status: 401 })
    mockApiLogin.mockRejectedValue(err)
    const warnSpy = vi.spyOn(toast, 'warning')
    const get = renderAuth()
    let ok: boolean | undefined
    await act(async () => { ok = await get().login('admin', 'wrong-password') })
    expect(ok).toBe(false)
    expect(mockApiLogin).toHaveBeenCalledTimes(1)
    expect(get().user).toBeNull()
    expect(warnSpy).not.toHaveBeenCalled()
    warnSpy.mockRestore()
  })

  it('backend unreachable: retries, then falls back to offline mode WITH an explicit toast', async () => {
    vi.useFakeTimers()
    mockApiLogin.mockRejectedValue(new TypeError('fetch failed'))
    const warnSpy = vi.spyOn(toast, 'warning')
    const get = renderAuth()
    let ok: boolean | undefined
    await act(async () => {
      const promise = get().login('admin', 'admin123')
      await vi.advanceTimersByTimeAsync(3 * 2500 + 500)
      ok = await promise
    })
    expect(ok).toBe(true)
    expect(mockApiLogin).toHaveBeenCalledTimes(4) // initial + 3 retries
    expect(get().offlineMode).toBe(true)
    expect(get().user?.name).toBe('张管理') // seed fallback
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('离线模式'),
      expect.objectContaining({ id: 'offline-mode' }),
    )
    warnSpy.mockRestore()
  })

  it('auth-expired event clears the session visibly', async () => {
    mockApiLogin.mockResolvedValue({ token: 'jwt', user: BACKEND_USER })
    const errSpy = vi.spyOn(toast, 'error')
    const get = renderAuth()
    await act(async () => { await get().login('admin', 'admin123') })
    expect(get().user).not.toBeNull()
    act(() => { window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT)) })
    expect(get().user).toBeNull()
    expect(mockClearToken).toHaveBeenCalled()
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('登录已过期'),
      expect.objectContaining({ id: 'session-expired' }),
    )
    errSpy.mockRestore()
  })
})

describe('AuthProvider session restoration', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function seedRestoredSession() {
    localStorage.setItem('crm_users', JSON.stringify([{ ...BACKEND_USER, password: 'admin123' }]))
    localStorage.setItem('crm_user', JSON.stringify(BACKEND_USER))
    mockGetToken.mockReturnValue('stale-token')
  }

  it('expired restored session (getMe 401) is cleared instead of showing a dataless app', async () => {
    seedRestoredSession()
    mockGetMe.mockRejectedValue(Object.assign(new Error('登录已过期'), { status: 401 }))
    const errSpy = vi.spyOn(toast, 'error')
    const get = renderAuth()
    // restored at first...
    expect(get().user?.username).toBe('admin')
    expect(get().sessionReady).toBe(false)
    // ...then validation clears it
    await waitFor(() => expect(get().sessionReady).toBe(true))
    expect(get().user).toBeNull()
    expect(localStorage.getItem('crm_user')).toBeNull()
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('登录已过期'),
      expect.objectContaining({ id: 'session-expired' }),
    )
    errSpy.mockRestore()
  })

  it('valid restored session is kept and refreshed from the backend', async () => {
    seedRestoredSession()
    mockGetMe.mockResolvedValue({ ...BACKEND_USER, name: '最新昵称' })
    const get = renderAuth()
    await waitFor(() => expect(get().sessionReady).toBe(true))
    expect(get().user?.username).toBe('admin')
    expect(get().user?.name).toBe('最新昵称')
  })

  it('backend down during restore keeps the session (offline) rather than logging out', async () => {
    seedRestoredSession()
    mockGetMe.mockRejectedValue(new TypeError('fetch failed')) // no status
    const get = renderAuth()
    await waitFor(() => expect(get().sessionReady).toBe(true))
    expect(get().user?.username).toBe('admin')
    expect(mockClearToken).not.toHaveBeenCalled()
  })
})
