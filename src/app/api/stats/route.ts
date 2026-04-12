import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { todayStr } from '@/lib/format'

// GET - Get current dashboard stats (optimized with parallel queries)
export async function GET() {
  try {
    const today = new Date()
    const todayStrVal = todayStr()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    // Run all independent queries in parallel for faster response
    const [config, parkedVehicles, todayHistory, dailyStats] = await Promise.all([
      db.parkingConfig.findUnique({ where: { id: 'default' } }),
      db.parkedVehicle.findMany(),
      db.parkingHistory.findMany({
        where: { createdAt: { gte: todayStart, lt: todayEnd } },
      }),
      db.dailyStats.findUnique({ where: { date: todayStrVal } }),
    ])

    const parkedCount = parkedVehicles.length
    const studentCount = parkedVehicles.filter((v) => v.personType === 'student').length
    const teacherCount = parkedVehicles.filter((v) => v.personType === 'teacher').length
    const guestCount = parkedVehicles.filter((v) => v.personType === 'guest').length
    const maxSlots = config?.maxSlots ?? 6
    const freeSlots = Math.max(0, maxSlots - parkedCount)
    const feePerTrip = config?.feePerTrip ?? 2000
    const isOpen = config?.isOpen ?? true

    const todayExits = todayHistory.filter((h) => h.exitTime).length
    const todayGuestHistory = todayHistory.filter((h) => h.personType === 'guest')
    const todayGuestRevenue = todayGuestHistory.reduce((sum, h) => sum + h.fee, 0)
    const todayRevenue = todayHistory.reduce((sum, h) => sum + h.fee, 0)
    const todayEntries = dailyStats?.totalEntries ?? todayHistory.length

    return NextResponse.json({
      success: true,
      data: {
        parkedCount,
        studentCount,
        teacherCount,
        guestCount,
        freeSlots,
        maxSlots,
        feePerTrip,
        todayEntries,
        todayExits: dailyStats ? Math.max(dailyStats.totalExits, todayExits) : todayExits,
        todayRevenue: dailyStats ? Math.max(dailyStats.totalRevenue, todayRevenue) : todayRevenue,
        todayGuestRevenue: dailyStats ? todayGuestRevenue : todayGuestRevenue,
        isOpen,
        systemName: config?.systemName || 'Bãi Đỗ Xe Thông Minh',
      },
    })
  } catch (error: unknown) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể tải thống kê' },
      { status: 500 }
    )
  }
}
