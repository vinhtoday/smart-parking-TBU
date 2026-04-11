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
          maxSlots: 6,
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

    // Validate feePerTrip
    if (feePerTrip !== undefined) {
      if (typeof feePerTrip !== 'number' || !Number.isInteger(feePerTrip) || feePerTrip < 0 || feePerTrip > 1_000_000) {
        return NextResponse.json(
          { success: false, error: 'Phí mỗi lượt phải là số nguyên từ 0 đến 1.000.000' },
          { status: 400 }
        )
      }
    }

    // Ensure config exists or create, then update
    const config = await db.parkingConfig.upsert({
      where: { id: 'default' },
      update: {
        ...(feePerTrip !== undefined && { feePerTrip }),
      },
      create: {
        id: 'default',
        maxSlots: 6,
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
    } catch { /* non-critical: activity log best-effort */ }

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
