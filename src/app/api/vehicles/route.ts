import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { todayStr } from '@/lib/format'
import { verifyArduinoSecret, requireAuth } from '@/lib/api-auth'

// GET - Get all currently parked vehicles
export async function GET() {
  try {
    const vehicles = await db.parkedVehicle.findMany({
      orderBy: { entryTime: 'asc' },
    })
    return NextResponse.json({ success: true, data: vehicles })
  } catch (error: unknown) {
    console.error('Error fetching parked vehicles:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể tải danh sách xe đang đỗ' },
      { status: 500 }
    )
  }
}

// POST - Add a vehicle entry (manual or RFID)
// Auth: Arduino shared secret OR authenticated user session
export async function POST(request: NextRequest) {
  try {
    // Allow if Arduino secret matches, OR user has valid session
    const isArduino = verifyArduinoSecret(request)
    const auth = isArduino ? null : await requireAuth(request)
    if (!isArduino && !auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    let { rfidUid, personName, personType, isVip } = body

    // Normalize UID: strip spaces + uppercase (Arduino may send "A3 B2 C1 D0")
    rfidUid = (rfidUid || '').replace(/\s+/g, '').toUpperCase()

    if (!rfidUid) {
      return NextResponse.json(
        { success: false, error: 'Thiếu rfidUid' },
        { status: 400 }
      )
    }

    // Check if vehicle already parked
    const existing = await db.parkedVehicle.findUnique({
      where: { rfidUid },
    })

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Xe này đã đang trong bãi đỗ' },
        { status: 409 }
      )
    }

    // ALWAYS look up from DB — never trust incoming personType/name
    // Arduino may send stale data (e.g. old personType from its memory)
    let realName = ''
    let realType = ''
    let realVip = false

    const teacher = await db.teacher.findUnique({ where: { rfidUid } })
    if (teacher) {
      realName = teacher.name
      realType = 'teacher'
      realVip = teacher.isVip
    } else {
      const student = await db.student.findUnique({ where: { rfidUid } })
      if (student) {
        realName = student.name
        realType = 'student'
      }
    }

    // DB lookup found nothing → always guest
    // DO NOT trust personType from client/Arduino — only DB lookup is authoritative
    if (!realName) realName = personName || 'Khách'
    if (!realType) realType = 'guest'
    if (!realVip) realVip = false

    // Check max slots from config
    const config = await db.parkingConfig.findUnique({ where: { id: 'default' } })
    if (!config) {
      return NextResponse.json(
        { success: false, error: 'Chưa cấu hình hệ thống' },
        { status: 500 }
      )
    }

    if (!config.isOpen) {
      return NextResponse.json(
        { success: false, error: 'Bãi đỗ xe hiện đang đóng cửa' },
        { status: 403 }
      )
    }

    const currentCount = await db.parkedVehicle.count()
    if (currentCount >= config.maxSlots) {
      return NextResponse.json(
        { success: false, error: `Bãi đỗ xe đã đầy (${config.maxSlots}/${config.maxSlots})` },
        { status: 403 }
      )
    }

    const vehicle = await db.parkedVehicle.create({
      data: {
        rfidUid,
        personName: realName,
        personType: realType,
        isVip: realVip,
      },
    })

    // Log VEHICLE_ENTRY activity
    try {
      await db.activityLog.create({
        data: { action: 'VEHICLE_ENTRY', details: `Xe vào: ${realName} (${rfidUid}) - Loại: ${realType}${realVip ? ' VIP' : ''}` },
      })
    } catch {}

    // Update daily stats
    const today = todayStr()
    await db.dailyStats.upsert({
      where: { date: today },
      update: {
        totalEntries: { increment: 1 },
        ...(realType === 'student'
          ? { studentCount: { increment: 1 } }
          : realType === 'teacher'
            ? { teacherCount: { increment: 1 } }
            : {}),
      },
      create: {
        date: today,
        totalEntries: 1,
        ...(realType === 'student'
          ? { studentCount: 1, teacherCount: 0 }
          : realType === 'teacher'
            ? { studentCount: 0, teacherCount: 1 }
            : { studentCount: 0, teacherCount: 0 }),
      },
    })

    return NextResponse.json({ success: true, data: vehicle })
  } catch (error: unknown) {
    console.error('Error adding vehicle entry:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể thêm xe vào bãi đỗ' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a vehicle (exit)
// Auth: Arduino shared secret OR authenticated user session
export async function DELETE(request: NextRequest) {
  try {
    // Allow if Arduino secret matches, OR user has valid session
    const isArduino = verifyArduinoSecret(request)
    const auth = isArduino ? null : await requireAuth(request)
    if (!isArduino && !auth) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    let { rfidUid } = body

    // Normalize UID: strip spaces + uppercase
    rfidUid = (rfidUid || '').replace(/\s+/g, '').toUpperCase()

    if (!rfidUid) {
      return NextResponse.json(
        { success: false, error: 'Thiếu rfidUid' },
        { status: 400 }
      )
    }

    const vehicle = await db.parkedVehicle.findUnique({
      where: { rfidUid },
    })

    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy xe trong bãi đỗ' },
        { status: 404 }
      )
    }

    const now = new Date()
    const duration = Math.floor(
      (now.getTime() - vehicle.entryTime.getTime()) / 1000
    )

    // Calculate fee: free for VIP and guest, otherwise feePerTrip
    const config = await db.parkingConfig.findUnique({ where: { id: 'default' } })
    const feePerTrip = config?.feePerTrip ?? 2000
    const isGuest = vehicle.personType === 'guest'
    const fee = (vehicle.isVip || isGuest) ? 0 : feePerTrip

    // Wrap exit in a transaction to ensure data consistency
    const today = todayStr()
    const result = await db.$transaction(async (tx) => {
      // Create parking history entry
      const history = await tx.parkingHistory.create({
        data: {
          rfidUid: vehicle.rfidUid,
          personName: vehicle.personName,
          personType: vehicle.personType,
          isVip: vehicle.isVip,
          entryTime: vehicle.entryTime,
          exitTime: now,
          duration,
          fee,
        },
      })

      // Remove from parked vehicles
      await tx.parkedVehicle.delete({ where: { rfidUid } })

      // Update daily stats
      await tx.dailyStats.upsert({
        where: { date: today },
        update: {
          totalExits: { increment: 1 },
          totalRevenue: { increment: fee },
        },
        create: {
          date: today,
          totalExits: 1,
          totalRevenue: fee,
          totalEntries: 0,
          studentCount: 0,
          teacherCount: 0,
        },
      })

      return history
    })

    // Log VEHICLE_EXIT activity
    try {
      await db.activityLog.create({
        data: { action: 'VEHICLE_EXIT', details: `Xe ra: ${vehicle.personName} (${rfidUid}) - ${duration}s - Phí: ${fee}đ` },
      })
    } catch {}

    // Notify Arduino Serial Bridge immediately — tell Arduino to open barrier
    try {
      const serialPort = process.env.SERIAL_PORT || '3004'
      await fetch(`http://127.0.0.1:${serialPort}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: JSON.stringify({ type: 'WEB_RESPONSE', action: 'VEHICLE_EXIT', success: true, rfidUid, fee, duration, message: 'OK_EXIT' }) }),
      })
    } catch {
      // Serial bridge not running — non-critical
    }

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        message: (vehicle.isVip || isGuest)
          ? `${vehicle.personName} ra khỏi bãi - Miễn phí`
          : `${vehicle.personName} ra khỏi bãi - Phí: ${fee.toLocaleString('vi-VN')}đ`,
      },
    })
  } catch (error: unknown) {
    console.error('Error removing vehicle:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể xử lý xe ra' },
      { status: 500 }
    )
  }
}
