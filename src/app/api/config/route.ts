import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'

// GET - Get parking config (singleton) — unprotected for Arduino
export async function GET() {
  try {
    let config = await db.parkingConfig.findUnique({ where: { id: 'default' } })

    if (!config) {
      config = await db.parkingConfig.create({
        data: {
          id: 'default',
          maxSlots: 4,
          feePerTrip: 2000,
          systemName: 'BAI DO XE THONG MINH',
          isOpen: true,
        },
      })
    }

    return NextResponse.json({ success: true, data: config })
  } catch (error: unknown) {
    console.error('Error fetching config:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể tải cấu hình' },
      { status: 500 }
    )
  }
}

// PUT - Update config — admin only
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu quyền quản trị' }, { status: 401 })
    }

    const body = await request.json()
    const { feePerTrip } = body

    // Ensure config exists or create, then update
    const config = await db.parkingConfig.upsert({
      where: { id: 'default' },
      update: {
        ...(feePerTrip !== undefined && { feePerTrip }),
      },
      create: {
        id: 'default',
        maxSlots: 4,
        feePerTrip: feePerTrip ?? 2000,
        systemName: 'BAI DO XE THONG MINH',
        isOpen: true,
      },
    })

    // Log CONFIG_UPDATE activity
    try {
      await db.activityLog.create({
        data: { action: 'CONFIG_UPDATE', details: `Cập nhật cấu hình: feePerTrip=${config.feePerTrip}` },
      })
    } catch {}

    return NextResponse.json({
      success: true,
      data: config,
      message: 'Đã cập nhật cấu hình thành công',
    })
  } catch (error: unknown) {
    console.error('Error updating config:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể cập nhật cấu hình' },
      { status: 500 }
    )
  }
}
