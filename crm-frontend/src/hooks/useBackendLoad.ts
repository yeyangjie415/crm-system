import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { getToken, isBackendAvailable } from '@/lib/api'

const RETRY_INTERVAL = 5000
const MAX_RETRIES = 6
const LOAD_FAILED_TOAST_ID = 'data-load-failed'

interface BackendLoadOptions {
  /** Re-run the load whenever this value changes (e.g. loginVersion). */
  trigger: number
  /** Whether a user is currently logged in. Defaults to true. */
  loggedIn?: boolean
  /** Reset the data to [] when logged out (prevents previous user's data lingering). */
  clearOnLogout?: boolean
}

/**
 * Shared backend data loader replacing the per-provider retry boilerplate.
 *
 * Behavior contract:
 * - Cancelable: a `cancelled` flag is checked at every async boundary, so
 *   cleanup kills in-flight chains (no ghost retry loops).
 * - No token -> no request: in offline mode (logged in without a JWT) the
 *   guaranteed-401 requests are skipped and local data is preserved.
 * - Logged out -> optionally clears stale data.
 * - Retries every 5s up to 6 times; when exhausted, shows ONE toast
 *   (deduped across providers via a fixed toast id).
 * - 401 responses are not retried — session expiry is handled globally via
 *   the `crm:auth-expired` event dispatched by the API client.
 */
export function useBackendLoad<T>(
  fetcher: () => Promise<T[]>,
  setData: (data: T[]) => void,
  { trigger, loggedIn = true, clearOnLogout = false }: BackendLoadOptions,
) {
  // Always call the latest callbacks without re-triggering the effect.
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const setRef = useRef(setData)
  setRef.current = setData

  useEffect(() => {
    if (!loggedIn) {
      if (clearOnLogout) setRef.current([])
      return
    }
    // Offline mode (logged in but no JWT): preserve local data, don't spin
    // on requests that can never authenticate.
    if (!getToken()) return

    let cancelled = false
    let attempts = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const scheduleRetry = () => {
      if (cancelled) return
      attempts++
      if (attempts <= MAX_RETRIES) {
        timer = setTimeout(load, RETRY_INTERVAL)
      } else {
        toast.error('数据加载失败，请检查后端服务是否正常运行', { id: LOAD_FAILED_TOAST_ID, duration: 8000 })
      }
    }

    const load = () => {
      if (cancelled) return
      isBackendAvailable().then(ok => {
        if (cancelled) return
        if (!ok) { scheduleRetry(); return }
        fetcherRef.current().then(data => {
          if (cancelled) return
          setRef.current(Array.isArray(data) ? data : [])
        }).catch((err: unknown) => {
          if (cancelled) return
          if ((err as { status?: number })?.status === 401) return // handled by crm:auth-expired
          scheduleRetry()
        })
      }).catch(() => {
        scheduleRetry()
      })
    }

    load()

    return () => {
      cancelled = true
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [trigger, loggedIn, clearOnLogout])
}
