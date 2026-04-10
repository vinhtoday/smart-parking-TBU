import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'

// 🔒 Allowed actions whitelist
const ALLOWED_ACTIONS = [
  'LOGIN', 'LOGOUT',
  'VEHICLE_ENTRY', 'VEHICLE_EXIT', 'VEHICLE_DELETE',
  'CONFIG_UPDATE',
  'USER_CREATE', 'USER_UPDATE', 'USER_DELETE',
  'STUDENT_CREATE', 'STUDENT_UPDATE', 'STUDENT_DELETE',
  'TEACHER_CREATE', 'TEACHER_UPDATE', 'TEACHER_DELETE',
] as const

// GET - List activity logs
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu quyền quản trị' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50') || 50, 500)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0') || 0, 0)

    const logs = await db.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    })

    return NextResponse.json({ success: true, data: logs })
  } catch (error: unknown) {
    console.error('Error fetching activity logs:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể tải activity logs' },
      { status: 500 }
    )
  }
}

// POST - Create activity log
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu quyền quản trị' }, { status: 401 })
    }

    const body = await request.json()
    const { action, details } = body

    if (!action || !ALLOWED_ACTIONS.includes(action as typeof ALLOWED_ACTIONS[number])) {
      return NextResponse.json(
        { success: false, error: 'Action không hợp lệ' },
        { status: 400 }
      )
    }

    // 🔒 Force username from session — ignore client-supplied value
    const log = await db.activityLog.create({
      data: {
        action,
        details: typeof details === 'string' ? details.substring(0, 500) : '',
        username: auth.user.username,
      },
    })

    return NextResponse.json({ success: true, data: log })
  } catch (error: unknown) {
    console.error('Error creating activity log:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể tạo activity log' },
      { status: 500 }
    )
  }
}
