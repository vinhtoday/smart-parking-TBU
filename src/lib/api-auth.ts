import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest } from 'next/server'

/**
 * Verify Arduino API secret from request header.
 * Arduino Serial Bridge sends "X-Arduino-Secret" header on every request.
 * Returns true if valid or if ARDUINO_API_SECRET is not set (dev mode).
 */
export function verifyArduinoSecret(request: NextRequest): boolean {
  const secret = process.env.ARDUINO_API_SECRET
  if (!secret) return true // No secret configured — allow (dev mode)
  const headerSecret = request.headers.get('x-arduino-secret')
  return headerSecret === secret
}

/**
 * Get the current session from the request.
 * Returns null if not authenticated.
 */
export async function getSession(req?: NextRequest) {
  const session = await getServerSession(authOptions)
  return session
}

/**
 * Require authentication for an API route.
 * Returns { session, user } if authenticated, or null if not.
 */
export async function requireAuth(req?: NextRequest) {
  const session = await getSession(req)
  if (!session?.user) return null
  return {
    session,
    user: {
      id: session.user.id as string,
      username: session.user.username as string,
      name: session.user.name as string,
      role: session.user.role as string,
    },
  }
}

/**
 * Require admin role for an API route.
 * Returns { session, user } if admin, or null if not.
 */
export async function requireAdmin(req?: NextRequest) {
  const auth = await requireAuth(req)
  if (!auth) return null
  if (auth.user.role !== 'admin') return null
  return auth
}
