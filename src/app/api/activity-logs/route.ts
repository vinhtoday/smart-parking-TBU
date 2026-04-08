import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'

// GET - List activity logs
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu quyền quản trị' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

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
    const { action, details, username } = body

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Thiếu action' },
        { status: 400 }
      )
    }

    const log = await db.activityLog.create({
      data: {
        action,
        details: details || '',
        username: username || '',
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
