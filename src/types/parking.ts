// Shared type definitions for Smart Parking System

export interface Stats {
  parkedCount: number
  studentCount: number
  teacherCount: number
  freeSlots: number
  maxSlots: number
  feePerTrip: number
  todayEntries: number
  todayExits: number
  todayRevenue: number
  isOpen: boolean
  systemName: string
}

export interface ParkedVehicle {
  id: string
  rfidUid: string
  personName: string
  personType: 'student' | 'teacher' | 'guest'
  isVip: boolean
  entryTime: string
}

export interface Student {
  id: string
  name: string
  rfidUid: string
  class: string
  phone: string
  createdAt: string
  visitCount?: number
  totalFee?: number
}

export interface Teacher {
  id: string
  name: string
  rfidUid: string
  department: string
  phone: string
  isVip: boolean
  createdAt: string
  visitCount?: number
}

export interface HistoryRecord {
  id: string
  rfidUid: string
  personName: string
  personType: 'student' | 'teacher' | 'guest'
  isVip: boolean
  entryTime: string
  exitTime: string | null
  duration: number
  fee: number
  createdAt: string
}

export type ReportPeriod = 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface ReportData {
  persons: Array<{
    rfidUid: string
    personName: string
    personType: string
    isVip: boolean
    visitCount: number
    totalFee: number
    totalDuration: number
    currentlyParked: boolean
  }>
  totalPersons: number
  totalVisits: number
  totalRevenue: number
  studentCount: number
  teacherCount: number
  guestCount: number
  currentlyParkedCount: number
  dailyRevenue: Array<{ date: string; revenue: number }>
  startDate: string
  endDate: string
}

export interface ParkingConfig {
  id: string
  maxSlots: number
  feePerTrip: number
  systemName: string
  isOpen: boolean
}
