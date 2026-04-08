import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'

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
