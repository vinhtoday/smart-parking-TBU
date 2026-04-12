import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - List all guest UIDs with visit count and total fee (like students API)
export async function GET() {
  try {
    // Get all unique guest UIDs from ParkingHistory
    const guestHistory = await db.parkingHistory.findMany({
      where: { personType: 'guest' },
      orderBy: { createdAt: 'desc' },
    })

    // Get currently parked guests
    const parkedGuests = await db.parkedVehicle.findMany({
      where: { personType: 'guest' },
    })
    const parkedUidSet = new Set(parkedGuests.map((v) => v.rfidUid))

    // Aggregate by UID: visitCount, totalFee, lastVisit
    const guestMap = new Map<string, {
      rfidUid: string
      visitCount: number
      totalFee: number
      lastEntry: string | null
      isParked: boolean
    }>()

    for (const h of guestHistory) {
      const existing = guestMap.get(h.rfidUid)
      if (existing) {
        existing.visitCount++
        existing.totalFee += h.fee
        // Keep the most recent entryTime
        if (h.entryTime && (!existing.lastEntry || h.entryTime.getTime() > new Date(existing.lastEntry).getTime())) {
          existing.lastEntry = h.entryTime.toISOString()
        }
      } else {
        guestMap.set(h.rfidUid, {
          rfidUid: h.rfidUid,
          visitCount: 1,
          totalFee: h.fee,
          lastEntry: h.entryTime ? h.entryTime.toISOString() : null,
          isParked: false,
        })
      }
    }

    // Mark currently parked guests
    for (const uid of parkedUidSet) {
      const entry = guestMap.get(uid)
      if (entry) {
        entry.isParked = true
      } else {
        // Guest is parked but has no history yet (just entered, hasn't exited)
        const parked = parkedGuests.find((v) => v.rfidUid === uid)
        guestMap.set(uid, {
          rfidUid: uid,
          visitCount: 0,
          totalFee: 0,
          lastEntry: parked?.entryTime ? parked.entryTime.toISOString() : new Date().toISOString(),
          isParked: true,
        })
      }
    }

    // Convert to array, sort by lastEntry desc
    const guests = Array.from(guestMap.values()).sort((a, b) => {
      if (!a.lastEntry) return 1
      if (!b.lastEntry) return -1
      return b.lastEntry.localeCompare(a.lastEntry)
    })

    return NextResponse.json({ success: true, data: guests })
  } catch (error: unknown) {
    console.error('Error fetching guest data:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể tải dữ liệu khách' },
      { status: 500 },
    )
  }
}
