'use client'

import { useState, useCallback } from 'react'

import type {
  Stats, ParkedVehicle, Student, Teacher, HistoryRecord,
  ReportData, ParkingConfig,
} from '@/types/parking'

export function useParkingData() {
  // === Core State ===
  const [stats, setStats] = useState<Stats | null>(null)
  const [vehicles, setVehicles] = useState<ParkedVehicle[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [config, setConfig] = useState<ParkingConfig | null>(null)
  const [history, setHistory] = useState<HistoryRecord[]>([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyPage, setHistoryPage] = useState(1)
  const [report, setReport] = useState<ReportData | null>(null)
  const [users, setUsers] = useState<Array<{ id: string; username: string; name: string; admin: number; active: boolean; createdAt: string }>>([])
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  // === Fetch Functions ===
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats')
      const json = await res.json()
      if (json.success) {
        setStats(json.data)
        setLastSync(new Date())
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e)
    }
  }, [])

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await fetch('/api/vehicles')
      const json = await res.json()
      if (json.success) setVehicles(json.data)
    } catch (e) {
      console.error('Failed to fetch vehicles:', e)
    }
  }, [])

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch('/api/students')
      const json = await res.json()
      if (json.success) setStudents(json.data)
    } catch (e) {
      console.error('Failed to fetch students:', e)
    }
  }, [])

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch('/api/teachers')
      const json = await res.json()
      if (json.success) setTeachers(json.data)
    } catch (e) {
      console.error('Failed to fetch teachers:', e)
    }
  }, [])

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/config')
      const json = await res.json()
      if (json.success) {
        setConfig(json.data)
      }
    } catch (e) {
      console.error('Failed to fetch config:', e)
    }
  }, [])

  const fetchHistory = useCallback(async (page = 1, search = '', startDate?: string, endDate?: string) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' })
      if (search) params.set('search', search)
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      const res = await fetch(`/api/history?${params}`)
      const json = await res.json()
      if (json.success) {
        setHistory(json.data.records)
        setHistoryTotal(json.data.pagination.total)
        setHistoryPage(json.data.pagination.page)
      }
    } catch (e) {
      console.error('Failed to fetch history:', e)
    }
  }, [])

  const fetchReport = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      const params = new URLSearchParams()
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      const res = await fetch(`/api/report?${params}`)
      const json = await res.json()
      if (json.success) setReport(json.data)
    } catch (e) {
      console.error('Failed to fetch report:', e)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      const json = await res.json()
      if (json.success) setUsers(json.data)
    } catch (e) {
      console.error('Failed to fetch users:', e)
    }
  }, [])

  // === Composed Loaders ===
  const loadAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchStats(), fetchVehicles(), fetchStudents(), fetchTeachers(),
      fetchConfig(), fetchHistory(1, ''), fetchReport(), fetchUsers(),
    ])
    setLoading(false)
  }, [fetchStats, fetchVehicles, fetchStudents, fetchTeachers, fetchConfig, fetchHistory, fetchReport, fetchUsers])

  // Refresh core data (stats + vehicles) — used by Socket.IO events
  const refreshCore = useCallback(() => {
    fetchStats()
    fetchVehicles()
  }, [fetchStats, fetchVehicles])

  // Refresh all data
  const refreshAll = useCallback(() => {
    fetchStats()
    fetchVehicles()
    fetchStudents()
    fetchTeachers()
    fetchConfig()
    fetchUsers()
  }, [fetchStats, fetchVehicles, fetchStudents, fetchTeachers, fetchConfig, fetchUsers])

  return {
    stats, setStats,
    vehicles, setVehicles,
    students, setStudents,
    teachers, setTeachers,
    config, setConfig,
    history, setHistory, historyTotal, historyPage,
    report, setReport,
    users, setUsers,
    lastSync,
    loading,
    fetchStats, fetchVehicles, fetchStudents, fetchTeachers,
    fetchConfig, fetchHistory, fetchReport, fetchUsers,
    loadAll, refreshCore, refreshAll,
  }
}
