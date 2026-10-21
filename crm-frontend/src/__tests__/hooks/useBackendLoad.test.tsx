import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useBackendLoad } from '@/hooks/useBackendLoad'
import { isBackendAvailable, getToken } from '@/lib/api'
import { toast } from 'sonner'

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    isBackendAvailable: vi.fn(async () => true),
    getToken: vi.fn(() => 'test-token'),
  }
})

const mockBackendAvailable = vi.mocked(isBackendAvailable)
const mockGetToken = vi.mocked(getToken)

describe('useBackendLoad', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockBackendAvailable.mockResolvedValue(true)
    mockGetToken.mockReturnValue('test-token')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads data on mount when token exists', async () => {
    const fetcher = vi.fn(async () => [{ id: '1' }, { id: '2' }])
    const setData = vi.fn()
    renderHook(() => useBackendLoad(fetcher, setData, { trigger: 0 }))
    await waitFor(() => expect(setData).toHaveBeenCalledWith([{ id: '1' }, { id: '2' }]))
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('sets empty arrays too (no stale-data linger)', async () => {
    const fetcher = vi.fn(async () => [])
    const setData = vi.fn()
    renderHook(() => useBackendLoad(fetcher, setData, { trigger: 0 }))
    await waitFor(() => expect(setData).toHaveBeenCalledWith([]))
  })

  it('skips fetching entirely when logged in but no token (offline mode)', async () => {
    mockGetToken.mockReturnValue(null)
    const fetcher = vi.fn(async () => [])
    const setData = vi.fn()
    renderHook(() => useBackendLoad(fetcher, setData, { trigger: 0 }))
    // give any accidental async chains time to run
    await act(async () => { await new Promise(r => setTimeout(r, 20)) })
    expect(fetcher).not.toHaveBeenCalled()
    expect(setData).not.toHaveBeenCalled()
  })

  it('clears data when logged out with clearOnLogout, and does not fetch', async () => {
    const fetcher = vi.fn(async () => [])
    const setData = vi.fn()
    renderHook(() => useBackendLoad(fetcher, setData, { trigger: 0, loggedIn: false, clearOnLogout: true }))
    expect(setData).toHaveBeenCalledWith([])
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('does not retry on 401 (session expiry is handled globally)', async () => {
    vi.useFakeTimers()
    const err = Object.assign(new Error('登录已过期'), { status: 401 })
    const fetcher = vi.fn().mockRejectedValue(err)
    const setData = vi.fn()
    const toastSpy = vi.spyOn(toast, 'error')
    renderHook(() => useBackendLoad(fetcher, setData, { trigger: 0 }))
    await act(async () => { await vi.advanceTimersByTimeAsync(6 * 5000 + 1000) })
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(toastSpy).not.toHaveBeenCalled()
    toastSpy.mockRestore()
  })

  it('retries on failure and toasts once after retries are exhausted', async () => {
    vi.useFakeTimers()
    const err = Object.assign(new Error('HTTP 500'), { status: 500 })
    const fetcher = vi.fn().mockRejectedValue(err)
    const setData = vi.fn()
    const toastSpy = vi.spyOn(toast, 'error')
    renderHook(() => useBackendLoad(fetcher, setData, { trigger: 0 }))
    // initial attempt + 6 retries (5s apart), then give-up toast
    await act(async () => { await vi.advanceTimersByTimeAsync(6 * 5000 + 1000) })
    expect(fetcher).toHaveBeenCalledTimes(7)
    expect(toastSpy).toHaveBeenCalledTimes(1)
    expect(toastSpy).toHaveBeenCalledWith(
      expect.stringContaining('数据加载失败'),
      expect.objectContaining({ id: 'data-load-failed' }),
    )
    toastSpy.mockRestore()
  })

  it('stops retrying after unmount (no ghost chains)', async () => {
    vi.useFakeTimers()
    const err = Object.assign(new Error('HTTP 500'), { status: 500 })
    const fetcher = vi.fn().mockRejectedValue(err)
    const setData = vi.fn()
    const toastSpy = vi.spyOn(toast, 'error')
    const { unmount } = renderHook(() => useBackendLoad(fetcher, setData, { trigger: 0 }))
    await act(async () => { await vi.advanceTimersByTimeAsync(100) }) // first attempt fails
    const callsAtUnmount = fetcher.mock.calls.length
    unmount()
    await act(async () => { await vi.advanceTimersByTimeAsync(10 * 5000) })
    expect(fetcher.mock.calls.length).toBe(callsAtUnmount)
    expect(toastSpy).not.toHaveBeenCalled()
    toastSpy.mockRestore()
  })

  it('reloads when trigger changes', async () => {
    const fetcher = vi.fn(async () => [{ id: '1' }])
    const setData = vi.fn()
    const { rerender } = renderHook(
      ({ trigger }) => useBackendLoad(fetcher, setData, { trigger }),
      { initialProps: { trigger: 0 } },
    )
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1))
    rerender({ trigger: 1 })
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2))
  })
})
