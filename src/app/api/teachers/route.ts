import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'

// GET - List all teachers with visit count
export async function GET() {
  try {
    const auth = await requireAuth()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu đăng nhập' }, { status: 401 })
    }

    const teachers = await db.teacher.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Count completed visits (entry + exit) from ParkingHistory
    const visitCounts = await db.parkingHistory.groupBy({
      by: ['rfidUid'],
      where: { exitTime: { not: null } },
      _count: { id: true },
    })
    const visitMap = new Map(visitCounts.map(v => [v.rfidUid, v._count.id]))

    const data = teachers.map(t => ({
      ...t,
      visitCount: visitMap.get(t.rfidUid) || 0,
    }))

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    console.error('Error fetching teachers:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể tải danh sách giảng viên' },
      { status: 500 }
    )
  }
}

// POST - Register new teacher
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu quyền quản trị' }, { status: 401 })
    }

    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateCheck = rateLimit(`api:teachers:${ip}`, 30, 60 * 1000)
    if (!rateCheck.success) {
      return NextResponse.json(
        { success: false, error: `Quá nhiều yêu cầu. Vui lòng đợi ${rateCheck.retryAfter} giây` },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { name, rfidUid, department, phone, isVip } = body

    // Strip spaces from UID for consistency
    const cleanRfidUid = (rfidUid || '').replace(/\s+/g, '').toUpperCase()

    if (!name || !cleanRfidUid) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc: name, rfidUid' },
        { status: 400 }
      )
    }

    // Check if RFID already registered in Teacher table
    const existingTeacher = await db.teacher.findUnique({ where: { rfidUid: cleanRfidUid } })
    if (existingTeacher) {
      return NextResponse.json(
        { success: false, error: 'RFID này đã được đăng ký cho giảng viên khác' },
        { status: 409 }
      )
    }

    // Check if RFID already registered in Student table (cross-table uniqueness)
    const existingStudent = await db.student.findUnique({ where: { rfidUid: cleanRfidUid } })
    if (existingStudent) {
      return NextResponse.json(
        { success: false, error: `RFID này đã được đăng ký cho sinh viên "${existingStudent.name}". Mỗi UID chỉ được dùng cho 1 người duy nhất!` },
        { status: 409 }
      )
    }

    const teacher = await db.teacher.create({
      data: {
        name,
        rfidUid: cleanRfidUid,
        department: department || '',
        phone: phone || '',
        isVip: isVip !== undefined ? isVip : true,
      },
    })

    // Log TEACHER_ADD activity
    try {
      await db.activityLog.create({
        data: { action: 'TEACHER_ADD', details: `Thêm giảng viên: ${name} (${cleanRfidUid})` },
      })
    } catch {}

    return NextResponse.json({ success: true, data: teacher })
  } catch (error: unknown) {
    console.error('Error creating teacher:', error)
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'RFID đã tồn tại trong hệ thống' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Không thể tạo giảng viên mới' },
      { status: 500 }
    )
  }
}

// PUT - Update teacher
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu quyền quản trị' }, { status: 401 })
    }

    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateCheck = rateLimit(`api:teachers:${ip}`, 30, 60 * 1000)
    if (!rateCheck.success) {
      return NextResponse.json(
        { success: false, error: `Quá nhiều yêu cầu. Vui lòng đợi ${rateCheck.retryAfter} giây` },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { id, name, department, phone, isVip } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Thiếu id giảng viên' },
        { status: 400 }
      )
    }

    const teacher = await db.teacher.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(department !== undefined && { department }),
        ...(phone !== undefined && { phone }),
        ...(isVip !== undefined && { isVip }),
      },
    })

    // Log TEACHER_UPDATE activity
    try {
      await db.activityLog.create({
        data: { action: 'TEACHER_UPDATE', details: `Sửa giảng viên: ${teacher.name} (${teacher.rfidUid})` },
      })
    } catch {}

    return NextResponse.json({ success: true, data: teacher })
  } catch (error: unknown) {
    console.error('Error updating teacher:', error)
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy giảng viên' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Không thể cập nhật giảng viên' },
      { status: 500 }
    )
  }
}

// DELETE - Delete teacher
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu quyền quản trị' }, { status: 401 })
    }

    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateCheck = rateLimit(`api:teachers:${ip}`, 30, 60 * 1000)
    if (!rateCheck.success) {
      return NextResponse.json(
        { success: false, error: `Quá nhiều yêu cầu. Vui lòng đợi ${rateCheck.retryAfter} giây` },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Thiếu id giảng viên' },
        { status: 400 }
      )
    }

    // Check if teacher is currently parked
    const teacher = await db.teacher.findUnique({ where: { id } })
    if (teacher) {
      const parked = await db.parkedVehicle.findUnique({
        where: { rfidUid: teacher.rfidUid },
      })
      if (parked) {
        return NextResponse.json(
          { success: false, error: 'Không thể xóa giảng viên đang đỗ xe trong bãi' },
          { status: 409 }
        )
      }
    }

    await db.teacher.delete({ where: { id } })

    // Log TEACHER_DELETE activity
    try {
      await db.activityLog.create({
        data: { action: 'TEACHER_DELETE', details: `Xóa giảng viên: ${teacher?.name || id}` },
      })
    } catch {}

    return NextResponse.json({ success: true, message: 'Đã xóa giảng viên thành công' })
  } catch (error: unknown) {
    console.error('Error deleting teacher:', error)
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy giảng viên' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Không thể xóa giảng viên' },
      { status: 500 }
    )
  }
}
