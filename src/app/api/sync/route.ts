import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { todayStr } from '@/lib/format'

interface SyncVehicle {
  uid: string
  isVip: boolean
  personName: string
  personType?: string
  entryTime: string
}

// POST - Full sync from Arduino
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { parkedVehicles, parkedCount, studentCount, teacherCount } = body

    if (!parkedVehicles || !Array.isArray(parkedVehicles)) {
      return NextResponse.json(
        { success: false, error: 'Dữ liệu đồng bộ không hợp lệ' },
        { status: 400 }
      )
    }

    // Wrap entire sync in a transaction for data consistency
    // SMART SYNC: Don't delete all + re-insert. Instead, merge to preserve original entryTime!
    await db.$transaction(async (tx) => {
      const syncUids = new Set<string>()

      for (const v of parkedVehicles as SyncVehicle[]) {
        // Normalize UID: strip spaces + uppercase (Arduino may send "A3 B2 C1 D0")
        const cleanUid = (v.uid || '').replace(/\s+/g, '').toUpperCase()
        if (!cleanUid) continue

        syncUids.add(cleanUid)

        // ALWAYS look up from DB — never trust Arduino's personType/name
        let personName = ''
        let personType = ''
        let isVip = false

        const teacher = await tx.teacher.findUnique({ where: { rfidUid: cleanUid } })
        if (teacher) {
          personName = teacher.name
          personType = 'teacher'
          isVip = teacher.isVip
        } else {
          const student = await tx.student.findUnique({ where: { rfidUid: cleanUid } })
          if (student) {
            personName = student.name
            personType = 'student'
          }
        }

        // DB lookup found nothing → guest
        if (!personName) personName = v.personName || 'Khách'
        if (!personType) personType = 'guest'

        // Check if vehicle already parked in DB
        const existing = await tx.parkedVehicle.findUnique({ where: { rfidUid: cleanUid } })

        if (existing) {
          // UPDATE — preserve original entryTime so timer doesn't reset!
          await tx.parkedVehicle.update({
            where: { rfidUid: cleanUid },
            data: { personName, personType, isVip },
          })
        } else {
          // NEW vehicle — create with entryTime from Arduino or current time
          await tx.parkedVehicle.create({
            data: {
              rfidUid: cleanUid,
              personName,
              personType,
              isVip,
              entryTime: v.entryTime ? new Date(v.entryTime) : new Date(),
            },
          }).catch((error: unknown) => {
            if ((error as { code?: string }).code !== 'P2002') throw error
          })
        }
      }

      // Remove vehicles that are in DB but NOT in sync (Arduino says they left)
      const allParked = await tx.parkedVehicle.findMany({ select: { rfidUid: true } })
      for (const v of allParked) {
        if (!syncUids.has(v.rfidUid)) {
          await tx.parkedVehicle.delete({ where: { rfidUid: v.rfidUid } })
        }
      }

      // Update daily stats — only create if not exists, don't overwrite cumulative counters
      const today = todayStr()
      await tx.dailyStats.upsert({
        where: { date: today },
        update: {
          // Don't overwrite cumulative counters maintained by vehicles API
        },
        create: {
          date: today,
          studentCount: studentCount ?? 0,
          teacherCount: teacherCount ?? 0,
        },
      })
    })

    return NextResponse.json({
      success: true,
      data: {
        parkedCount: parkedVehicles.length,
        studentCount: studentCount ?? 0,
        teacherCount: teacherCount ?? 0,
        message: `Đã đồng bộ ${parkedVehicles.length} xe từ Arduino`,
      },
    })
  } catch (error: unknown) {
    console.error('Error syncing from Arduino:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể đồng bộ dữ liệu từ Arduino' },
      { status: 500 }
    )
  }
}
