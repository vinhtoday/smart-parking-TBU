'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Car, LogIn, LogOut, GraduationCap, UserCheck,
  Settings, Users, Star, ChevronLeft, ChevronRight, Filter,
} from 'lucide-react'

interface ActivityLogsTabProps {
  activityLogs: Array<{ id: string; action: string; details: string; username: string; createdAt: string }>
  logsTotal: number
  logsOffset: number
  fetchActivityLogs: (limit: number, offset: number, actionFilter: string) => void
}

const ACTION_TYPES = [
  { value: '', label: 'Tất cả hành động' },
  { value: 'LOGIN', label: 'Đăng nhập' },
  { value: 'LOGOUT', label: 'Đăng xuất' },
  { value: 'VEHICLE_ENTRY', label: 'Xe vào bãi' },
  { value: 'VEHICLE_EXIT', label: 'Xe ra bãi' },
  { value: 'VEHICLE_DELETE', label: 'Xóa xe' },
  { value: 'STUDENT_ADD', label: 'Thêm sinh viên' },
  { value: 'STUDENT_UPDATE', label: 'Sửa sinh viên' },
  { value: 'STUDENT_DELETE', label: 'Xóa sinh viên' },
  { value: 'TEACHER_ADD', label: 'Thêm giảng viên' },
  { value: 'TEACHER_UPDATE', label: 'Sửa giảng viên' },
  { value: 'TEACHER_DELETE', label: 'Xóa giảng viên' },
  { value: 'TEACHER_VIP_TOGGLE', label: 'Đổi VIP' },
  { value: 'CONFIG_UPDATE', label: 'Cập nhật cấu hình' },
  { value: 'USER_CREATE', label: 'Tạo tài khoản' },
  { value: 'USER_UPDATE', label: 'Sửa tài khoản' },
  { value: 'USER_DELETE', label: 'Xóa tài khoản' },
  { value: 'SEED', label: 'Seed dữ liệu' },
] as const

const PAGE_SIZE = 30

// Action badge color mapping
function getActionBadgeStyle(action: string): { bg: string; text: string; icon: React.ReactNode } {
  switch (action) {
    case 'VEHICLE_ENTRY':
      return { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', icon: <Car className="h-3 w-3 mr-1" /> }
    case 'VEHICLE_EXIT':
      return { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-700 dark:text-red-300', icon: <LogOut className="h-3 w-3 mr-1" /> }
    case 'VEHICLE_DELETE':
      return { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-700 dark:text-orange-300', icon: <Car className="h-3 w-3 mr-1" /> }
    case 'STUDENT_ADD':
    case 'STUDENT_CREATE':
      return { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', icon: <GraduationCap className="h-3 w-3 mr-1" /> }
    case 'STUDENT_UPDATE':
      return { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', icon: <GraduationCap className="h-3 w-3 mr-1" /> }
    case 'STUDENT_DELETE':
      return { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', icon: <GraduationCap className="h-3 w-3 mr-1" /> }
    case 'TEACHER_ADD':
    case 'TEACHER_CREATE':
      return { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', icon: <UserCheck className="h-3 w-3 mr-1" /> }
    case 'TEACHER_UPDATE':
      return { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', icon: <UserCheck className="h-3 w-3 mr-1" /> }
    case 'TEACHER_DELETE':
      return { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', icon: <UserCheck className="h-3 w-3 mr-1" /> }
    case 'TEACHER_VIP_TOGGLE':
      return { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-700 dark:text-yellow-300', icon: <Star className="h-3 w-3 mr-1" /> }
    case 'CONFIG_UPDATE':
      return { bg: 'bg-slate-100 dark:bg-slate-900/40', text: 'text-slate-700 dark:text-slate-300', icon: <Settings className="h-3 w-3 mr-1" /> }
    case 'USER_CREATE':
    case 'USER_UPDATE':
    case 'USER_DELETE':
      return { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300', icon: <Users className="h-3 w-3 mr-1" /> }
    case 'LOGIN':
      return { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', icon: <LogIn className="h-3 w-3 mr-1" /> }
    case 'LOGOUT':
      return { bg: 'bg-gray-100 dark:bg-gray-900/40', text: 'text-gray-700 dark:text-gray-300', icon: <LogOut className="h-3 w-3 mr-1" /> }
    case 'SEED':
      return { bg: 'bg-violet-100 dark:bg-violet-900/40', text: 'text-violet-700 dark:text-violet-300', icon: <Settings className="h-3 w-3 mr-1" /> }
    default:
      return { bg: 'bg-gray-100 dark:bg-gray-900/40', text: 'text-gray-700 dark:text-gray-300', icon: null }
  }
}

// Relative time display (Vietnamese)
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 10) return 'vừa xong'
  if (diffSec < 60) return `${diffSec} giây trước`
  if (diffMin < 60) return `${diffMin} phút trước`
  if (diffHour < 24) return `${diffHour} giờ trước`
  if (diffDay < 7) return `${diffDay} ngày trước`
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export default function ActivityLogsTab({
  activityLogs,
  logsTotal,
  logsOffset,
  fetchActivityLogs,
}: ActivityLogsTabProps) {
  const [actionFilter, setActionFilter] = useState('')
  const [currentPage, setCurrentPage] = useState(0)

  // Refetch when filter changes
  const handleFilterChange = useCallback((value: string) => {
    setActionFilter(value)
    setCurrentPage(0)
    fetchActivityLogs(PAGE_SIZE, 0, value)
  }, [fetchActivityLogs])

  // Pagination
  const handlePrev = useCallback(() => {
    const newOffset = Math.max(0, logsOffset - PAGE_SIZE)
    setCurrentPage(prev => prev - 1)
    fetchActivityLogs(PAGE_SIZE, newOffset, actionFilter)
  }, [logsOffset, actionFilter, fetchActivityLogs])

  const handleNext = useCallback(() => {
    const newOffset = logsOffset + PAGE_SIZE
    setCurrentPage(prev => prev + 1)
    fetchActivityLogs(PAGE_SIZE, newOffset, actionFilter)
  }, [logsOffset, actionFilter, fetchActivityLogs])

  const totalPages = Math.ceil(logsTotal / PAGE_SIZE)
  const hasNext = logsOffset + PAGE_SIZE < logsTotal
  const hasPrev = logsOffset > 0

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Nhật ký hoạt động
          </CardTitle>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground">Lọc:</label>
            <select
              value={actionFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-w-[200px]"
            >
              {ACTION_TYPES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs w-[140px]">Hành động</TableHead>
                <TableHead className="text-xs w-[100px]">Người dùng</TableHead>
                <TableHead className="text-xs">Chi tiết</TableHead>
                <TableHead className="text-xs w-[120px] text-right">Thời gian</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    Chưa có hoạt động nào
                  </TableCell>
                </TableRow>
              ) : (
                activityLogs.map((log) => {
                  const badge = getActionBadgeStyle(log.action)
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="py-2">
                        <Badge
                          variant="secondary"
                          className={`${badge.bg} ${badge.text} text-[10px] font-medium gap-0.5`}
                        >
                          {badge.icon}
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className={`text-xs font-mono font-semibold ${log.username === 'arduino' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                          {log.username}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-xs text-muted-foreground truncate max-w-[300px] block">
                          {log.details || '—'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {formatRelativeTime(log.createdAt)}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t">
          <p className="text-xs text-muted-foreground">
            {logsTotal > 0 ? (
              <>
                Hiển thị <span className="font-medium">{logsOffset + 1}</span>–
                <span className="font-medium">{Math.min(logsOffset + PAGE_SIZE, logsTotal)}</span>
                / <span className="font-medium">{logsTotal}</span> bản ghi
              </>
            ) : (
              '0 bản ghi'
            )}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handlePrev}
              disabled={!hasPrev}
            >
              <ChevronLeft className="h-3 w-3 mr-0.5" />
              Trước
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {totalPages > 0 ? `${currentPage + 1}/${totalPages}` : '—'}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={handleNext}
              disabled={!hasNext}
            >
              Sau
              <ChevronRight className="h-3 w-3 ml-0.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
