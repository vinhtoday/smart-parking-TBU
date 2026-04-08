import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, requireAdmin } from '@/lib/api-auth'
import { rateLimit } from '@/lib/rate-limit'

// GET - List all students with visit count and total fee
export async function GET() {
  try {
    const auth = await requireAuth()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu đăng nhập' }, { status: 401 })
    }

    const students = await db.student.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Count completed visits (entry + exit) from ParkingHistory
    const visitCounts = await db.parkingHistory.groupBy({
      by: ['rfidUid'],
      where: { exitTime: { not: null } },
      _count: { id: true },
      _sum: { fee: true },
    })
    const visitMap = new Map(visitCounts.map(v => [v.rfidUid, {
      count: v._count.id,
      totalFee: v._sum.fee || 0,
    }]))

    const data = students.map(s => {
      const visit = visitMap.get(s.rfidUid) || { count: 0, totalFee: 0 }
      return {
        ...s,
        visitCount: visit.count,
        totalFee: visit.totalFee,
      }
    })

    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    console.error('Error fetching students:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể tải danh sách sinh viên' },
      { status: 500 }
    )
  }
}

// POST - Register new student
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu quyền quản trị' }, { status: 401 })
    }

    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateCheck = rateLimit(`api:students:${ip}`, 30, 60 * 1000)
    if (!rateCheck.success) {
      return NextResponse.json(
        { success: false, error: `Quá nhiều yêu cầu. Vui lòng đợi ${rateCheck.retryAfter} giây` },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { name, rfidUid, class: studentClass, phone } = body

    // Strip spaces from UID for consistency
    const cleanRfidUid = (rfidUid || '').replace(/\s+/g, '').toUpperCase()

    if (!name || !cleanRfidUid) {
      return NextResponse.json(
        { success: false, error: 'Thiếu thông tin bắt buộc: name, rfidUid' },
        { status: 400 }
      )
    }

    // Check if RFID already registered in Student table
    const existingStudent = await db.student.findUnique({ where: { rfidUid: cleanRfidUid } })
    if (existingStudent) {
      return NextResponse.json(
        { success: false, error: 'RFID này đã được đăng ký cho sinh viên khác' },
        { status: 409 }
      )
    }

    // Check if RFID already registered in Teacher table (cross-table uniqueness)
    const existingTeacher = await db.teacher.findUnique({ where: { rfidUid: cleanRfidUid } })
    if (existingTeacher) {
      return NextResponse.json(
        { success: false, error: `RFID này đã được đăng ký cho giảng viên "${existingTeacher.name}". Mỗi UID chỉ được dùng cho 1 người duy nhất!` },
        { status: 409 }
      )
    }

    const student = await db.student.create({
      data: {
        name,
        rfidUid: cleanRfidUid,
        class: studentClass || '',
        phone: phone || '',
      },
    })

    // Log STUDENT_ADD activity
    try {
      await db.activityLog.create({
        data: { action: 'STUDENT_ADD', details: `Thêm sinh viên: ${name} (${cleanRfidUid})` },
      })
    } catch {}

    return NextResponse.json({ success: true, data: student })
  } catch (error: unknown) {
    console.error('Error creating student:', error)
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'RFID đã tồn tại trong hệ thống' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Không thể tạo sinh viên mới' },
      { status: 500 }
    )
  }
}

// PUT - Update student
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu quyền quản trị' }, { status: 401 })
    }

    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateCheck = rateLimit(`api:students:${ip}`, 30, 60 * 1000)
    if (!rateCheck.success) {
      return NextResponse.json(
        { success: false, error: `Quá nhiều yêu cầu. Vui lòng đợi ${rateCheck.retryAfter} giây` },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { id, name, class: studentClass, phone } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Thiếu id sinh viên' },
        { status: 400 }
      )
    }

    const student = await db.student.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(studentClass !== undefined && { class: studentClass }),
        ...(phone !== undefined && { phone }),
      },
    })

    // Log STUDENT_UPDATE activity
    try {
      await db.activityLog.create({
        data: { action: 'STUDENT_UPDATE', details: `Sửa sinh viên: ${student.name} (${student.rfidUid})` },
      })
    } catch {}

    return NextResponse.json({ success: true, data: student })
  } catch (error: unknown) {
    console.error('Error updating student:', error)
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy sinh viên' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Không thể cập nhật sinh viên' },
      { status: 500 }
    )
  }
}

// DELETE - Delete student
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu quyền quản trị' }, { status: 401 })
    }

    // Rate limit
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateCheck = rateLimit(`api:students:${ip}`, 30, 60 * 1000)
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
        { success: false, error: 'Thiếu id sinh viên' },
        { status: 400 }
      )
    }

    // Check if student is currently parked
    const student = await db.student.findUnique({ where: { id } })
    if (student) {
      const parked = await db.parkedVehicle.findUnique({
        where: { rfidUid: student.rfidUid },
      })
      if (parked) {
        return NextResponse.json(
          { success: false, error: 'Không thể xóa sinh viên đang đỗ xe trong bãi' },
          { status: 409 }
        )
      }
    }

    await db.student.delete({ where: { id } })

    // Log STUDENT_DELETE activity
    try {
      await db.activityLog.create({
        data: { action: 'STUDENT_DELETE', details: `Xóa sinh viên: ${student?.name || id}` },
      })
    } catch {}

    return NextResponse.json({ success: true, message: 'Đã xóa sinh viên thành công' })
  } catch (error: unknown) {
    console.error('Error deleting student:', error)
    if ((error as { code?: string }).code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy sinh viên' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { success: false, error: 'Không thể xóa sinh viên' },
      { status: 500 }
    )
  }
}
