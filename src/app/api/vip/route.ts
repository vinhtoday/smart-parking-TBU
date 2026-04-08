import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/api-auth'

// GET - List all VIP teachers, or check VIP status by RFID
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu quyền quản trị' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    let rfidUid = searchParams.get('rfidUid') || ''

    // Normalize UID
    rfidUid = rfidUid.replace(/\s+/g, '').toUpperCase()

    // VIP lookup by RFID
    if (rfidUid) {
      const teacher = await db.teacher.findUnique({ where: { rfidUid } })
      if (!teacher) {
        return NextResponse.json({ success: true, isVip: false, message: 'Không tìm thấy giảng viên' })
      }
      return NextResponse.json({
        success: true,
        isVip: teacher.isVip,
        data: {
          id: teacher.id,
          name: teacher.name,
          rfidUid: teacher.rfidUid,
          department: teacher.department,
          isVip: teacher.isVip,
        },
      })
    }

    // List all VIP teachers
    const vipTeachers = await db.teacher.findMany({
      where: { isVip: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, data: vipTeachers })
  } catch (error: unknown) {
    console.error('Error fetching VIP data:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể tải danh sách VIP' },
      { status: 500 }
    )
  }
}

// POST - Toggle VIP status (supports both teacherId and rfidUid)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu quyền quản trị' }, { status: 401 })
    }

    const body = await request.json()
    const { teacherId, rfidUid: rawRfidUid, isVip } = body
    const rfidUid = rawRfidUid ? rawRfidUid.replace(/\s+/g, '').toUpperCase() : ''

    let teacher

    // Support both teacherId and rfidUid for flexibility
    if (teacherId) {
      if (isVip === undefined) {
        // Toggle mode: find teacher first to get current state
        const existing = await db.teacher.findUnique({ where: { id: teacherId } })
        if (!existing) {
          return NextResponse.json(
            { success: false, error: 'Không tìm thấy giảng viên' },
            { status: 404 }
          )
        }
        teacher = await db.teacher.update({
          where: { id: teacherId },
          data: { isVip: !existing.isVip },
        })
      } else {
        teacher = await db.teacher.update({
          where: { id: teacherId },
          data: { isVip },
        })
      }
    } else if (rfidUid) {
      // Find teacher by RFID UID and toggle
      const existing = await db.teacher.findUnique({ where: { rfidUid } })
      if (!existing) {
        return NextResponse.json(
          { success: false, error: 'Không tìm thấy giảng viên với RFID này' },
          { status: 404 }
        )
      }
      const newIsVip = isVip !== undefined ? isVip : !existing.isVip
      teacher = await db.teacher.update({
        where: { rfidUid },
        data: { isVip: newIsVip },
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin: teacherId hoặc rfidUid' },
        { status: 400 }
      )
    }

    // Also update VIP flag if currently parked
    await db.parkedVehicle.updateMany({
      where: { rfidUid: teacher.rfidUid },
      data: { isVip: teacher.isVip },
    })

    return NextResponse.json({
      success: true,
      data: teacher,
      message: teacher.isVip
        ? `Đã thêm ${teacher.name} vào danh sách VIP`
        : `Đã xóa ${teacher.name} khỏi danh sách VIP`,
    })
  } catch (error: unknown) {
    console.error('Error toggling VIP:', error)
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy giảng viên' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Không thể cập nhật trạng thái VIP' },
      { status: 500 }
    )
  }
}
