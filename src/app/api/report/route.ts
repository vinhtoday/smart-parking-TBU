import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { toDateLocal } from '@/lib/format'
import { requireAuth } from '@/lib/api-auth'

interface PersonReport {
  rfidUid: string
  personName: string
  personType: string
  isVip: boolean
  visitCount: number
  totalFee: number
  totalDuration: number
  currentlyParked: boolean
}

// GET - Báo cáo theo khoảng thời gian: chi tiết từng người (bao gồm xe đang đỗ)
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth()
    if (!auth) {
      return NextResponse.json({ success: false, error: 'Yêu cầu đăng nhập' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    // Default to current month if not provided
    const now = new Date()
    const startDate = startDateStr
      ? new Date(startDateStr + 'T00:00:00.000')
      : new Date(now.getFullYear(), now.getMonth(), 1)
    const endDate = endDateStr
      ? new Date(endDateStr + 'T23:59:59.999')
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Get all parking history in the date range (only completed visits: exitTime not null)
    const history = await db.parkingHistory.findMany({
      where: {
        entryTime: { gte: startDate, lte: endDate },
        exitTime: { not: null },
      },
      orderBy: { entryTime: 'asc' },
    })

    // Get currently parked vehicles
    const parkedVehicles = await db.parkedVehicle.findMany({
      where: {
        entryTime: { gte: startDate, lte: endDate },
      },
      orderBy: { entryTime: 'asc' },
    })

    // Group by person (rfidUid)
    const personMap = new Map<string, PersonReport>()

    // Process completed visits from history
    for (const h of history) {
      const existing = personMap.get(h.rfidUid)
      if (existing) {
        existing.visitCount++
        existing.totalFee += h.fee
        existing.totalDuration += h.duration
        // Use the latest personName if available
        if (h.personName && h.personName !== 'Khách') {
          existing.personName = h.personName
        }
      } else {
        personMap.set(h.rfidUid, {
          rfidUid: h.rfidUid,
          personName: h.personName || '',
          personType: h.personType || 'guest',
          isVip: h.isVip || false,
          visitCount: 1,
          totalFee: h.fee,
          totalDuration: h.duration,
          currentlyParked: false,
        })
      }
    }

    // Process currently parked vehicles (still in the parking lot)
    for (const v of parkedVehicles) {
      const existing = personMap.get(v.rfidUid)
      if (existing) {
        existing.currentlyParked = true
        // Update name if newer info available
        if (v.personName && v.personName !== 'Khách') {
          existing.personName = v.personName
        }
      } else {
        personMap.set(v.rfidUid, {
          rfidUid: v.rfidUid,
          personName: v.personName || '',
          personType: v.personType || 'guest',
          isVip: v.isVip || false,
          visitCount: 0,
          totalFee: 0,
          totalDuration: 0,
          currentlyParked: true,
        })
      }
    }

    // Sort: currently parked first, then student, teacher, guest; within group by totalFee desc
    const persons = Array.from(personMap.values()).sort((a, b) => {
      // Currently parked first
      if (a.currentlyParked && !b.currentlyParked) return -1
      if (!a.currentlyParked && b.currentlyParked) return 1

      const typeOrder = { student: 0, teacher: 1, guest: 2 }
      const typeDiff = (typeOrder[a.personType as keyof typeof typeOrder] ?? 3) - (typeOrder[b.personType as keyof typeof typeOrder] ?? 3)
      if (typeDiff !== 0) return typeDiff
      return b.totalFee - a.totalFee
    })

    // Summary totals
    const totalPersons = persons.length
    const totalVisits = persons.reduce((s, p) => s + p.visitCount, 0)
    const totalRevenue = persons.reduce((s, p) => s + p.totalFee, 0)
    const studentCount = persons.filter(p => p.personType === 'student').length
    const teacherCount = persons.filter(p => p.personType === 'teacher').length
    const guestCount = persons.filter(p => p.personType === 'guest').length
    const currentlyParkedCount = persons.filter(p => p.currentlyParked).length

    // Daily revenue for chart
    const dailyRevenueMap = new Map<string, number>()
    for (const h of history) {
      const day = toDateLocal(h.entryTime)
      if (day) {
        dailyRevenueMap.set(day, (dailyRevenueMap.get(day) || 0) + h.fee)
      }
    }
    const dailyRevenue = Array.from(dailyRevenueMap.entries())
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({
      success: true,
      data: {
        persons,
        totalPersons,
        totalVisits,
        totalRevenue,
        studentCount,
        teacherCount,
        guestCount,
        currentlyParkedCount,
        dailyRevenue,
        startDate: toDateLocal(startDate),
        endDate: toDateLocal(endDate),
      },
    })
  } catch (error: unknown) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { success: false, error: 'Không thể tạo báo cáo' },
      { status: 500 }
    )
  }
}
