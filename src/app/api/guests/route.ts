import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Guest data: currently parked guests, today stats, recent history
export async function GET() {
  try {
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    const [parkedGuests, todayGuestHistory, config] = await Promise.all([
      db.parkedVehicle.findMany({
        where: { personType: 'guest' },
        orderBy: { entryTime: 'desc' },
      }),
      db.parkingHistory.findMany({
        where: {
          personType: 'guest',
          createdAt: { gte: todayStart, lt: todayEnd },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      db.parkingConfig.findUnique({ where: { id: 'default' } }),
    ])

    const feePerTrip = config?.feePerTrip ?? 2000
    const todayEntries = todayGuestHistory.length
    const todayExits = todayGuestHistory.filter((h) => h.exitTime).length
    const todayRevenue = todayGuestHistory.reduce((sum, h) => sum + h.fee, 0)
    const currentlyParked = parkedGuests.length

    // Group by unique RFID to count unique guests today
    const uniqueUids = new Set(todayGuestHistory.map((h) => h.rfidUid))

    return NextResponse.json({
      success: true,
      data: {
        parkedGuests,
        todayHistory: todayGuestHistory,
        feePerTrip,
        stats: {
          currentlyParked,
          todayEntries,
          todayExits,
          todayRevenue,
          uniqueGuestsToday: uniqueUids.size,
        },
      },
    })
  } catch (error: unknown) {
    console.error('Error fetching guest data:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể tải dữ liệu khách' },
      { status: 500 },
    )
  }
}
