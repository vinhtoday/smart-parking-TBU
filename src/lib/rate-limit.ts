interface RateLimitEntry {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetTime <= now) store.delete(key)
  }
}, 5 * 60 * 1000)

/**
 * Rate limit check.
 * Returns { success, remaining, retryAfter? }.
 * success=false means the request should be blocked (too many requests).
 *
 * @param key - Identifier (usually IP + endpoint, or username for login)
 * @param maxRequests - Max requests in the window
 * @param windowMs - Time window in milliseconds
 */
export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { success: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetTime <= now) {
    store.set(key, { count: 1, resetTime: now + windowMs })
    return { success: true, remaining: maxRequests - 1 }
  }

  if (entry.count >= maxRequests) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
    return { success: false, remaining: 0, retryAfter }
  }

  entry.count++
  return { success: true, remaining: maxRequests - entry.count }
}
