import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// GET - Get paginated parking history with date filter
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu đăng nhập' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10', 10) || 10))
    const search = searchParams.get('search') || ''
    const startDateStr = searchParams.get('startDate') || ''
    const endDateStr = searchParams.get('endDate') || ''

    const skip = (page - 1) * limit

    // Build where clause
    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { personName: { contains: search } },
        { rfidUid: { contains: search } },
      ]
    }

    // Date filter on entryTime
    if (startDateStr || endDateStr) {
      const entryTimeFilter: Record<string, Date> = {}
      if (startDateStr) {
        entryTimeFilter.gte = new Date(startDateStr + 'T00:00:00.000')
      }
      if (endDateStr) {
        entryTimeFilter.lte = new Date(endDateStr + 'T23:59:59.999')
      }
      where.entryTime = entryTimeFilter
    }

    // Get total count
    const total = await db.parkingHistory.count({ where })

    // Get paginated results
    const history = await db.parkingHistory.findMany({
      where,
      orderBy: { entryTime: 'desc' },
      skip,
      take: limit,
    })

    return NextResponse.json({
      success: true,
      data: {
        records: history,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    })
  } catch (error: unknown) {
    console.error('Error fetching history:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể tải lịch sử đỗ xe' },
      { status: 500 }
    )
  }
}
