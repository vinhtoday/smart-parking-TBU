'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTheme } from 'next-themes'
import { useSession, signOut } from 'next-auth/react'
import { toast } from 'sonner'

import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Car, GraduationCap, UserCheck, Settings,
  History, BarChart3, Wifi, WifiOff, Clock,
  Eye, Users,
  Sun, Moon, Activity, Radio, DollarSign,
  Copy, Flame, Wind, LogOut, UserCircle,
} from 'lucide-react'

import {
  formatVND, formatDateParam, downloadPDF, downloadExcel,
} from '@/lib/format'
import { personTypeLabel } from '@/components/PersonTypeBadge'

import type {
  Student, Teacher, ReportPeriod,
} from '@/types/parking'
import type { SocketAlarmData } from '@/types/arduino'

import { APP_VERSION } from '@/lib/constants'
import { useParkingData } from '@/hooks/useParkingData'
import { useAlarmSound } from '@/hooks/useAlarmSound'
import { useSocketIO } from '@/hooks/useSocketIO'
import { useArduinoConnection } from '@/hooks/useArduinoConnection'

import OverviewTab from '@/components/tabs/OverviewTab'
import StudentsTab from '@/components/tabs/StudentsTab'
import TeachersTab from '@/components/tabs/TeachersTab'
import HistoryTab from '@/components/tabs/HistoryTab'
import ReportsTab from '@/components/tabs/ReportsTab'
import SettingsTab from '@/components/tabs/SettingsTab'
import ManageTab from '@/components/tabs/ManageTab'
import ActivityLogsTab from '@/components/tabs/ActivityLogsTab'

/* =============================================
   MAIN DASHBOARD COMPONENT
   ============================================= */
export default function ParkingDashboard() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const isAdmin = session?.user?.role === 'admin'

  // === Custom Hooks ===
  const {
    stats, vehicles, students, teachers, config,
    history, historyTotal, historyPage, report, users,
    activityLogs, logsTotal, logsOffset,
    lastSync, loading,
    fetchStats, fetchVehicles, fetchStudents, fetchTeachers,
    fetchConfig, fetchHistory, fetchReport, fetchUsers, fetchActivityLogs,
    loadAll, refreshCore,
  } = useParkingData()

  const { startAlarmSound, stopAlarmSound } = useAlarmSound()

  // === Fire / Gas Alarm State ===
  const [fireAlarm, setFireAlarm] = useState(false)
  const [gasAlarm, setGasAlarm] = useState(false)
  const [alarmMessage, setAlarmMessage] = useState('')
  const [lastScannedUid, setLastScannedUid] = useState('')

  // Socket.IO — pass callbacks via refs (stable socket connection)
  const { connected: wsConnected, emit: socketEmit } = useSocketIO({
    onVehicleEntry: () => { toast.success('🚗 Xe mới vào bãi đỗ!'); refreshCore() },
    onVehicleExit: () => { toast.info('🚙 Xe đã rời bãi đỗ'); refreshCore() },
    onRfidScan: (uid) => {
      if (uid) setLastScannedUid(uid)
      refreshCore()
    },
    onStatusChange: () => { fetchStats(); fetchConfig() },
    onFullSync: () => { refreshCore() },
    onFireAlarm: (data: SocketAlarmData) => {
      const source = (data.source || 'UNKNOWN').toUpperCase()
      const message = data.message || 'CẢNH BÁO!'
      const isFireSource = source.includes('FLAME') || source === 'UNKNOWN'
      const isGasSource = source.includes('GAS')

      if (data.isAlarm) {
        setAlarmMessage(message)
        if (isFireSource) {
          setFireAlarm(true)
          startAlarmSound(true)
        } else if (isGasSource) {
          setGasAlarm(true)
          startAlarmSound(false)
        }
        socketEmit('web_command', {
          command: JSON.stringify({ type: 'WEB_COMMAND', action: 'ALARM_ON', source }),
        })
      } else {
        // Alarm cleared → TẮT NGAY âm thanh + cập nhật state
        if (isFireSource) setFireAlarm(false)
        else if (isGasSource) setGasAlarm(false)
        if (!isFireSource && !isGasSource) {
          setFireAlarm(false)
          setGasAlarm(false)
        }
        // Luôn gọi stop — không đợi state (vì setState là async, đọc giá trị cũ sẽ sai)
        stopAlarmSound()
        socketEmit('web_command', {
          command: JSON.stringify({ type: 'WEB_COMMAND', action: 'ALARM_OFF', source }),
        })
      }
    },
  })

  // Arduino Serial connection
  const {
    connected: arduinoConnected, status: arduinoStatus,
    serialPorts, customPort, setCustomPort, connecting,
    connectSerial,
  } = useArduinoConnection()

  // === UI State ===
  const [mounted, setMounted] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTab, setActiveTab] = useState('overview')

  // === Search State ===
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [historySearch, setHistorySearch] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [teacherSearch, setTeacherSearch] = useState('')
  const [userSearch, setUserSearch] = useState('')

  // === Dialog State ===
  const [addStudentOpen, setAddStudentOpen] = useState(false)
  const [editStudentOpen, setEditStudentOpen] = useState(false)
  const [addTeacherOpen, setAddTeacherOpen] = useState(false)
  const [editTeacherOpen, setEditTeacherOpen] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)

  // === Form State ===
  const [newStudent, setNewStudent] = useState({ name: '', rfidUid: '', class: '', phone: '' })
  const [editStudentForm, setEditStudentForm] = useState({ name: '', class: '', phone: '' })
  const [newTeacher, setNewTeacher] = useState({ name: '', rfidUid: '', department: '', phone: '', isVip: true })
  const [editTeacherForm, setEditTeacherForm] = useState({ name: '', department: '', phone: '', isVip: false })
  const [addVehicleOpen, setAddVehicleOpen] = useState(false)
  const [newVehicle, setNewVehicle] = useState({ rfidUid: '', personName: '', personType: 'guest' as 'student' | 'teacher' | 'guest', isVip: false })

  const [configForm, setConfigForm] = useState({ feePerTrip: 2000 })
  const [saving, setSaving] = useState(false)

  // === Report State ===
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('month')
  const [reportStart, setReportStart] = useState<Date | undefined>(undefined)
  const [reportEnd, setReportEnd] = useState<Date | undefined>(undefined)

  /* ------------------------------------------
     EFFECTS
     ------------------------------------------ */
  // Clock
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Sync config → configForm when config changes
  useEffect(() => {
    if (config) {
      setConfigForm({
        feePerTrip: config.feePerTrip,
      })
    }
  }, [config])

  // Initial load + polling (30s — rely more on Socket.IO)
  useEffect(() => {
    setMounted(true)
    loadAll()

    const pollInterval = setInterval(() => {
      fetchStats()
      fetchVehicles()
    }, 30000)

    return () => clearInterval(pollInterval)
  }, [loadAll, fetchStats, fetchVehicles])

  // Fetch history when search changes (debounced)
  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchHistory(1, historySearch)
    }, 300)
    return () => clearTimeout(timeout)
  }, [historySearch, fetchHistory])

  /* ------------------------------------------
     ARDUINO SERIAL HANDLER
     ------------------------------------------ */
  const handleConnectSerial = async (port: string) => {
    const result = await connectSerial(port)
    if (result.success) {
      toast.success(`Đang kết nối ${port}...`)
    } else {
      toast.error(result.error || 'Lỗi kết nối')
    }
  }

  /* ------------------------------------------
     EXPORT HANDLERS
     ------------------------------------------ */
  const handleExportHistoryPDF = () => {
    const headers = ['RFID UID', 'Tên', 'Loại', 'VIP', 'Thời gian vào', 'Thời gian ra', 'Thời gian (giây)', 'Phí (đ)']
    const rows = history.map(h => [
      h.rfidUid,
      h.personType !== 'guest' ? h.personName : '',
      personTypeLabel(h.personType),
      h.isVip ? 'Có' : 'Không',
      h.entryTime ? h.entryTime : '',
      h.exitTime ? h.exitTime : '',
      h.duration,
      h.fee,
    ])
    downloadPDF('Lịch sử gửi xe', 'LỊCH SỬ GỬI XE', headers, rows)
    toast.success('Đã mở PDF để in')
  }

  const handleExportReportPDF = () => {
    if (!report) return
    const headers = ['#', 'RFID UID', 'Tên', 'Loại', 'VIP', 'Số lần', 'Tổng thời gian (giây)', 'Tổng tiền (đ)']
    const rows = report.persons.map((p, i) => [
      i + 1, p.rfidUid,
      p.personType !== 'guest' && p.personName ? p.personName : '',
      personTypeLabel(p.personType),
      p.isVip ? 'Có' : 'Không',
      p.visitCount, p.totalDuration, p.totalFee,
    ])
    downloadPDF(`Báo cáo ${report.startDate} → ${report.endDate}`, 'BÁO CÁO DOANH THU', headers, rows, {
      totalRow: ['', '', '', '', '', report.totalVisits, '', report.totalRevenue],
    })
    toast.success('Đã mở PDF để in')
  }

  const handleExportHistoryExcel = async () => {
    const headers = ['RFID UID', 'Tên', 'Loại', 'VIP', 'Thời gian vào', 'Thời gian ra', 'Thời gian (giây)', 'Phí (đ)']
    const rows = history.map(h => [
      h.rfidUid,
      h.personType !== 'guest' ? h.personName : '',
      personTypeLabel(h.personType),
      h.isVip ? 'Có' : 'Không',
      h.entryTime || '',
      h.exitTime || '',
      h.duration,
      h.fee,
    ])
    await downloadExcel('lich_su_gui_xe', 'LỊCH SỬ GỬI XE', headers, rows)
    toast.success('Đã tải file Excel')
  }

  const handleExportReportExcel = async () => {
    if (!report) return
    const headers = ['#', 'RFID UID', 'Tên', 'Loại', 'VIP', 'Số lần', 'Tổng thời gian (giây)', 'Tổng tiền (đ)']
    const rows = report.persons.map((p, i) => [
      i + 1, p.rfidUid,
      p.personType !== 'guest' && p.personName ? p.personName : '',
      personTypeLabel(p.personType),
      p.isVip ? 'Có' : 'Không',
      p.visitCount, p.totalDuration, p.totalFee,
    ])
    await downloadExcel(`bao_cao_${report.startDate}_${report.endDate}`, 'BÁO CÁO DOANH THU', headers, rows, {
      totalRow: ['', '', '', '', '', report.totalVisits, '', report.totalRevenue],
    })
    toast.success('Đã tải file Excel')
  }

  /* ------------------------------------------
     ACTION HANDLERS
     ------------------------------------------ */
  const handleVehicleExit = async (rfidUid: string) => {
    try {
      const res = await fetch('/api/vehicles', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfidUid }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(json.data.message)
        fetchStats()
        fetchVehicles()
        fetchHistory(historyPage, historySearch)
      } else {
        toast.error(json.error || 'Không thể xử lý xe ra')
      }
    } catch {
      toast.error('Lỗi khi xử lý xe ra')
    }
  }

  const handleAddVehicle = async () => {
    if (!newVehicle.rfidUid || !newVehicle.personName) {
      toast.error('Vui lòng nhập UID và tên')
      return
    }
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVehicle),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Đã thêm xe ${newVehicle.personName}`)
        setNewVehicle({ rfidUid: '', personName: '', personType: 'guest', isVip: false })
        setAddVehicleOpen(false)
        fetchStats()
        fetchVehicles()
      } else {
        toast.error(json.error || 'Không thể thêm xe')
      }
    } catch {
      toast.error('Lỗi khi thêm xe')
    }
  }

  const handleAddStudent = async () => {
    if (!newStudent.name || !newStudent.rfidUid) {
      toast.error('Vui lòng nhập tên và RFID')
      return
    }
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Đã đăng ký sinh viên ${newStudent.name}`)
        setNewStudent({ name: '', rfidUid: '', class: '', phone: '' })
        setAddStudentOpen(false)
        fetchStudents()
      } else {
        toast.error(json.error || 'Không thể thêm sinh viên')
      }
    } catch {
      toast.error('Lỗi khi thêm sinh viên')
    }
  }

  const handleEditStudent = async () => {
    if (!selectedStudent) return
    try {
      const res = await fetch('/api/students', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedStudent.id, ...editStudentForm }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Đã cập nhật thông tin sinh viên')
        setEditStudentOpen(false)
        setSelectedStudent(null)
        fetchStudents()
      } else {
        toast.error(json.error || 'Không thể cập nhật')
      }
    } catch {
      toast.error('Lỗi khi cập nhật sinh viên')
    }
  }

  const handleDeleteStudent = async (id: string, name: string) => {
    try {
      const res = await fetch('/api/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Đã xóa sinh viên ${name}`)
        fetchStudents()
      } else {
        toast.error(json.error || 'Không thể xóa')
      }
    } catch {
      toast.error('Lỗi khi xóa sinh viên')
    }
  }

  const handleAddTeacher = async () => {
    if (!newTeacher.name || !newTeacher.rfidUid) {
      toast.error('Vui lòng nhập tên và RFID')
      return
    }
    try {
      const res = await fetch('/api/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeacher),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Đã đăng ký giảng viên ${newTeacher.name}`)
        setNewTeacher({ name: '', rfidUid: '', department: '', phone: '', isVip: true })
        setAddTeacherOpen(false)
        fetchTeachers()
      } else {
        toast.error(json.error || 'Không thể thêm giảng viên')
      }
    } catch {
      toast.error('Lỗi khi thêm giảng viên')
    }
  }

  const handleEditTeacher = async () => {
    if (!selectedTeacher) return
    try {
      const res = await fetch('/api/teachers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedTeacher.id, ...editTeacherForm }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Đã cập nhật thông tin giảng viên')
        setEditTeacherOpen(false)
        setSelectedTeacher(null)
        fetchTeachers()
      } else {
        toast.error(json.error || 'Không thể cập nhật')
      }
    } catch {
      toast.error('Lỗi khi cập nhật giảng viên')
    }
  }

  const handleDeleteTeacher = async (id: string, name: string) => {
    try {
      const res = await fetch('/api/teachers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Đã xóa giảng viên ${name}`)
        fetchTeachers()
      } else {
        toast.error(json.error || 'Không thể xóa')
      }
    } catch {
      toast.error('Lỗi khi xóa giảng viên')
    }
  }

  const handleToggleVip = async (teacher: Teacher) => {
    try {
      const res = await fetch('/api/vip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfidUid: teacher.rfidUid }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Đã ${teacher.isVip ? 'gỡ' : 'kích hoạt'} VIP cho ${teacher.name}`)
        fetchTeachers()
        fetchVehicles()
      } else {
        toast.error(json.error || 'Không thể thay đổi VIP')
      }
    } catch {
      toast.error('Lỗi khi thay đổi VIP')
    }
  }

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configForm),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Đã cập nhật cấu hình hệ thống')
        fetchConfig()
        fetchStats()
      } else {
        toast.error(json.error || 'Không thể cập nhật cấu hình')
      }
    } catch {
      toast.error('Lỗi khi lưu cấu hình')
    } finally {
      setSaving(false)
    }
  }

  /* ------------------------------------------
     COMPUTED VALUES
     ------------------------------------------ */
  const filteredVehicles = vehicles.filter(v =>
    !vehicleSearch ||
    v.personName.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.rfidUid.toLowerCase().includes(vehicleSearch.toLowerCase())
  )

  const filteredStudents = students.filter(s =>
    !studentSearch ||
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.rfidUid.toLowerCase().includes(studentSearch.toLowerCase())
  )

  const filteredTeachers = teachers.filter(t =>
    !teacherSearch ||
    t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    t.rfidUid.toLowerCase().includes(teacherSearch.toLowerCase())
  )

  // Helper: set date range based on period preset
  const setReportRange = useCallback((period: ReportPeriod) => {
    const now = new Date()
    let start: Date, end: Date
    switch (period) {
      case 'day':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        break
      case 'week': {
        // Tuần này: từ thứ 2 (Monday) đến Chủ nhật (Sunday)
        const dayOfWeek = now.getDay() // 0=Sun, 1=Mon, ...
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday)
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday + 6, 23, 59, 59, 999)
        break
      }
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1)
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
        break
      case 'quarter': {
        const q = Math.floor(now.getMonth() / 3)
        start = new Date(now.getFullYear(), q * 3, 1)
        end = new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999)
        break
      }
      case 'year':
        start = new Date(now.getFullYear(), 0, 1)
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
        break
    }
    setReportPeriod(period)
    setReportStart(start)
    setReportEnd(end)
    fetchReport(formatDateParam(start), formatDateParam(end))
  }, [fetchReport])

  /* ------------------------------------------
     RENDER HELPERS
     ------------------------------------------ */
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text.replace(/\s+/g, ''))
    toast.success('Đã copy UID')
  }

  /* ------------------------------------------
     MAIN RENDER
     ------------------------------------------ */
  if (loading && !stats) {
    return (
      <div className="min-h-screen p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-full" />
            <Skeleton className="h-7 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ============= HEADER ============= */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-800 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 shadow-lg shadow-blue-900/20 dark:shadow-[0_4px_30px_rgba(0,0,0,0.3)] border-b border-blue-600/20 dark:border-blue-500/20 relative">
        {/* Subtle top accent line */}
        <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />

        {/* Subtle depth overlays */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_50%,rgba(59,130,246,0.08)_0%,transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(99,102,241,0.06)_0%,transparent_60%)] pointer-events-none" />

        <div className="max-w-[1600px] mx-auto px-4 md:px-6 flex items-center justify-between h-14 relative z-10">
          {/* Left section */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo with gold glow accent */}
            <div className="relative flex-shrink-0">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-amber-400/40 to-amber-600/20 blur-[2px]" />
              <img src="/tbu-logo.jpg" alt="Logo TBU" className="relative h-10 w-10 md:h-11 md:w-11 rounded-full object-cover shadow-lg ring-2 ring-white/20 ring-offset-1 ring-offset-blue-900 dark:ring-offset-slate-900/50" />
            </div>

            {/* Title with gradient text + subtitle */}
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg md:text-xl lg:text-2xl font-extrabold tracking-wide text-white truncate">
                HỆ THỐNG BÃI ĐỖ XE THÔNG MINH
              </h1>
              <p className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] text-amber-300/80 dark:text-amber-200/60 uppercase hidden sm:block">
                Trường đại học Thái Bình
              </p>
            </div>

          </div>

          {/* Right section */}
          <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
            {mounted && (
              <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide uppercase transition-colors ${wsConnected ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20' : 'bg-red-500/10 text-red-300 ring-1 ring-red-500/20'}`}>
                <Wifi className="h-3 w-3" />
                WS {wsConnected ? '✔' : '✘'}
              </div>
            )}
            {mounted && (
              <div className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide uppercase transition-colors ${arduinoConnected ? 'bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/20' : 'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20'}`}>
                {arduinoConnected ? <Radio className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                Arduino {arduinoConnected ? '✔' : '✘'}
              </div>
            )}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 ring-1 ring-white/10 text-[11px] text-blue-200/90 font-mono font-semibold tracking-wider">
              <Clock className="h-3 w-3 text-amber-400/70" />
              {mounted ? currentTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
            </div>
            <div className="w-px h-6 bg-white/10 hidden sm:block mx-0.5" />
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/80 hover:text-amber-300 hover:bg-white/10 rounded-lg transition-colors" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              {mounted && theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </Button>

            {/* User info & Logout */}
            {session && (
              <>
                <div className="w-px h-6 bg-white/10 hidden sm:block mx-0.5" />
                <div className="flex items-center gap-1.5">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[11px] font-semibold text-white/90 leading-tight truncate max-w-[100px]">
                      {session.user?.name}
                    </span>
                    <span className={`text-[9px] font-bold leading-tight px-1.5 py-0 rounded ${isAdmin ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-400/20 text-slate-300'}`}>
                      {isAdmin ? 'Admin' : 'Nhân viên'}
                    </span>
                  </div>
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center ring-1 ring-white/20">
                      <UserCircle className="h-5 w-5 text-white/80" />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/60 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                    title="Đăng xuất"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom accent glow line */}
        <div className="absolute bottom-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
      </header>

      {/* ============= FIRE / GAS ALARM BANNER ============= */}
      {(fireAlarm || gasAlarm) && (
        <div className={`relative z-50 overflow-hidden ${fireAlarm ? 'bg-gradient-to-r from-red-700 via-red-600 to-orange-600' : 'bg-gradient-to-r from-amber-700 via-amber-600 to-yellow-600'} text-white shadow-[0_4px_20px_rgba(0,0,0,0.4)]`}>
          {/* Animated scanning line */}
          <div className={`absolute inset-0 ${fireAlarm ? 'bg-gradient-to-r from-transparent via-red-400/30 to-transparent' : 'bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent'} animate-[scan_1.5s_ease-in-out_infinite]`} />
          <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3 flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-3">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center ${fireAlarm ? 'animate-bounce' : 'animate-pulse'}`}>
                {fireAlarm ? <Flame className="h-6 w-6 text-white" /> : <Wind className="h-6 w-6 text-white" />}
              </div>
              <div>
                <h2 className="text-base md:text-lg font-extrabold tracking-wide">
                  {fireAlarm ? '🔥 CẢNH BÁO CHÁY!' : '💨 CẢNH BÁO KHÍ GAS!'}
                </h2>
                <p className="text-xs md:text-sm font-medium opacity-90">
                  {fireAlarm ? 'Phát hiện lửa! Barrier đã mở tự động. Vui lòng sơ tán ngay!' : 'Phát hiện rò rỉ khí gas! Vui lòng kiểm tra khu vực.'}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="border-white/40 text-white text-xs font-bold bg-white/10 px-3 py-1 hidden sm:flex items-center gap-1.5">
              <Activity className="h-3 w-3" />
              {alarmMessage || 'NGUY HIỂM'}
            </Badge>
          </div>
        </div>
      )}

      {/* ============= MAIN CONTENT ============= */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 md:px-6 py-4 md:py-6 space-y-6">
        {/* Stats Cards - responsive: 1 col on mobile, 2 on sm, 3 on md, 5 on lg */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {/* Card 1: Tổng xe / Vị trí trống */}
          <Card className="parking-card-hover stat-card-emerald overflow-hidden animate-fade-up animate-fade-up-delay-1">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Xe đang gửi</span>
                <Car className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold animate-count-up">
                {stats?.parkedCount ?? 0}
                <span className="text-sm font-normal text-muted-foreground">/{stats?.maxSlots ?? 0}</span>
              </div>
              <Progress value={stats ? (stats.parkedCount / stats.maxSlots) * 100 : 0} className="mt-2 h-1.5" />
              <p className="text-[10px] text-muted-foreground mt-1">
                {(stats?.freeSlots ?? 0) === 0 ? 'Đã đầy!' : `${stats?.freeSlots ?? 0} vị trí trống`}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Sinh viên */}
          <Card className="parking-card-hover stat-card-sky overflow-hidden animate-fade-up animate-fade-up-delay-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Sinh viên</span>
                <GraduationCap className="h-4 w-4 text-sky-600" />
              </div>
              <div className="text-2xl font-bold text-sky-700 dark:text-sky-400 animate-count-up">{stats?.studentCount ?? 0}</div>
              <p className="text-[10px] text-muted-foreground mt-1">đang gửi xe</p>
            </CardContent>
          </Card>

          {/* Card 3: Giảng viên */}
          <Card className="parking-card-hover stat-card-amber overflow-hidden animate-fade-up animate-fade-up-delay-3">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Giảng viên</span>
                <UserCheck className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400 animate-count-up">{stats?.teacherCount ?? 0}</div>
              <p className="text-[10px] text-muted-foreground mt-1">đang gửi xe</p>
            </CardContent>
          </Card>

          {/* Card 4: RFID quét gần nhất */}
          <Card className="parking-card-hover overflow-hidden animate-fade-up animate-fade-up-delay-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">RFID quét gần nhất</span>
                <Radio className="h-4 w-4 text-cyan-500" />
              </div>
              <div className="flex items-center gap-1">
                <p className="text-lg font-mono font-bold text-cyan-600 dark:text-cyan-400 truncate">{lastScannedUid || '—'}</p>
                {lastScannedUid && (
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyToClipboard(lastScannedUid)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">lần quét cuối</p>
            </CardContent>
          </Card>

          {/* Card 5: Thu nhập hôm nay */}
          <Card className="parking-card-hover stat-card-violet overflow-hidden sm:col-span-2 md:col-span-1 animate-fade-up animate-fade-up-delay-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Thu nhập hôm nay</span>
                <DollarSign className="h-4 w-4 text-violet-600" />
              </div>
              <div className="text-2xl font-bold text-violet-700 dark:text-violet-400 animate-count-up">
                {stats ? formatVND(stats.todayRevenue) : '0đ'}
              </div>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ↓ {stats?.todayEntries ?? 0} vào
                </span>
                <span className="text-[10px] text-red-500 dark:text-red-400 font-medium">
                  ↑ {stats?.todayExits ?? 0} ra
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stats?.feePerTrip ?? 2000}đ/lượt</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm">
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tổng quan</span>
              <span className="sm:hidden">View</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="students" className="gap-1.5 text-xs sm:text-sm">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>Sinh viên</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="teachers" className="gap-1.5 text-xs sm:text-sm">
                <UserCheck className="h-3.5 w-3.5" />
                <span>Giảng viên</span>
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="manage" className="gap-1.5 text-xs sm:text-sm">
                <Users className="h-3.5 w-3.5" />
                <span>Tài khoản</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm">
              <History className="h-3.5 w-3.5" />
              <span>Lịch sử</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Báo cáo</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="activity-logs" className="text-xs gap-1.5">
                <Activity className="h-3.5 w-3.5" />Nhật ký
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="settings" className="gap-1.5 text-xs sm:text-sm">
                <Settings className="h-3.5 w-3.5" />
                <span>Cấu hình</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* ========== TAB: OVERVIEW ========== */}
          <TabsContent value="overview">
            <OverviewTab
              stats={stats}
              vehicles={vehicles}
              filteredVehicles={filteredVehicles}
              vehicleSearch={vehicleSearch}
              setVehicleSearch={setVehicleSearch}
              addVehicleOpen={addVehicleOpen}
              setAddVehicleOpen={setAddVehicleOpen}
              newVehicle={newVehicle}
              setNewVehicle={setNewVehicle}
              handleAddVehicle={handleAddVehicle}
              handleVehicleExit={handleVehicleExit}
              copyToClipboard={copyToClipboard}
            />
          </TabsContent>

          {/* ========== TAB: STUDENTS ========== */}
          {isAdmin && (
          <TabsContent value="students">
            <StudentsTab
              students={students}
              filteredStudents={filteredStudents}
              studentSearch={studentSearch}
              setStudentSearch={setStudentSearch}
              addStudentOpen={addStudentOpen}
              setAddStudentOpen={setAddStudentOpen}
              editStudentOpen={editStudentOpen}
              setEditStudentOpen={setEditStudentOpen}
              selectedStudent={selectedStudent}
              newStudent={newStudent}
              setNewStudent={setNewStudent}
              editStudentForm={editStudentForm}
              setEditStudentForm={setEditStudentForm}
              setSelectedStudent={setSelectedStudent}
              handleAddStudent={handleAddStudent}
              handleEditStudent={handleEditStudent}
              handleDeleteStudent={handleDeleteStudent}
              copyToClipboard={copyToClipboard}
            />
          </TabsContent>
          )}

          {/* ========== TAB: TEACHERS ========== */}
          {isAdmin && (
          <TabsContent value="teachers">
            <TeachersTab
              teachers={teachers}
              filteredTeachers={filteredTeachers}
              teacherSearch={teacherSearch}
              setTeacherSearch={setTeacherSearch}
              addTeacherOpen={addTeacherOpen}
              setAddTeacherOpen={setAddTeacherOpen}
              editTeacherOpen={editTeacherOpen}
              setEditTeacherOpen={setEditTeacherOpen}
              selectedTeacher={selectedTeacher}
              newTeacher={newTeacher}
              setNewTeacher={setNewTeacher}
              editTeacherForm={editTeacherForm}
              setEditTeacherForm={setEditTeacherForm}
              setSelectedTeacher={setSelectedTeacher}
              handleAddTeacher={handleAddTeacher}
              handleEditTeacher={handleEditTeacher}
              handleDeleteTeacher={handleDeleteTeacher}
              handleToggleVip={handleToggleVip}
              copyToClipboard={copyToClipboard}
            />
          </TabsContent>
          )}

          {/* ========== TAB: MANAGE (Admin only) ========== */}
          {isAdmin && (
          <TabsContent value="manage">
            <ManageTab
              users={users.filter(u =>
                !userSearch ||
                u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                u.username.toLowerCase().includes(userSearch.toLowerCase())
              )}
              userSearch={userSearch}
              setUserSearch={setUserSearch}
              fetchUsers={fetchUsers}
              currentUserUsername={session?.user?.username}
            />
          </TabsContent>
          )}

          {/* ========== TAB: HISTORY ========== */}
          <TabsContent value="history">
            <HistoryTab
              history={history}
              historyTotal={historyTotal}
              historyPage={historyPage}
              historySearch={historySearch}
              setHistorySearch={setHistorySearch}
              fetchHistory={fetchHistory}
              handleExportHistoryPDF={handleExportHistoryPDF}
              handleExportHistoryExcel={handleExportHistoryExcel}
            />
          </TabsContent>

          {/* ========== TAB: REPORTS ========== */}
          <TabsContent value="reports">
            <ReportsTab
              report={report}
              reportPeriod={reportPeriod}
              setReportPeriod={setReportPeriod}
              reportStart={reportStart}
              setReportStart={setReportStart}
              reportEnd={reportEnd}
              setReportEnd={setReportEnd}
              fetchReport={fetchReport}
              handleExportReportPDF={handleExportReportPDF}
              handleExportReportExcel={handleExportReportExcel}
              setReportRange={setReportRange}
              copyToClipboard={copyToClipboard}
            />
          </TabsContent>

          {/* ========== TAB: ACTIVITY LOGS ========== */}
          {isAdmin && (
          <TabsContent value="activity-logs">
            <ActivityLogsTab
              activityLogs={activityLogs}
              logsTotal={logsTotal}
              logsOffset={logsOffset}
              fetchActivityLogs={fetchActivityLogs}
            />
          </TabsContent>
          )}

          {/* ========== TAB: SETTINGS ========== */}
          {isAdmin && (
          <TabsContent value="settings">
            <SettingsTab
              configForm={configForm}
              setConfigForm={setConfigForm}
              saving={saving}
              handleSaveConfig={handleSaveConfig}
              arduinoConnected={arduinoConnected}
              arduinoStatus={arduinoStatus}
              serialPorts={serialPorts}
              customPort={customPort}
              setCustomPort={setCustomPort}
              connecting={connecting}
              handleConnectSerial={handleConnectSerial}
              stats={stats}
              students={students}
              teachers={teachers}
              historyTotal={historyTotal}
              lastSync={lastSync}
            />
          </TabsContent>
          )}
        </Tabs>
      </main>

      {/* ============= FOOTER ============= */}
      <footer className="border-t mt-auto">
        <div className="max-w-[1600px] mx-auto px-4 md:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-1 text-xs text-muted-foreground">
          <p>{stats?.systemName || 'Bãi Đỗ Xe Thông Minh'} v{APP_VERSION} — Trường đại học Thái Bình</p>
          <p>
            {lastSync ? (
              <>Lần cập nhật cuối: {lastSync.toLocaleTimeString('vi-VN')}</>
            ) : (
              "Đang tải..."
            )}
          </p>
        </div>
      </footer>
    </div>
  )
}
