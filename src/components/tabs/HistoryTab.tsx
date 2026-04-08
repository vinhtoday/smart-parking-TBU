'use client'

import { useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  History, Search, FileText, ChevronLeft, ChevronRight, CalendarIcon, X, Download,
} from 'lucide-react'

import { formatVND, formatDuration, formatDateTime, formatDate, formatDateParam } from '@/lib/format'
import { PersonTypeBadge, VipBadge } from '@/components/PersonTypeBadge'
import type { HistoryRecord } from '@/types/parking'

interface HistoryTabProps {
  history: HistoryRecord[]
  historyTotal: number
  historyPage: number
  historySearch: string
  setHistorySearch: (v: string) => void
  fetchHistory: (page?: number, search?: string, startDate?: string, endDate?: string) => void
  handleExportHistoryPDF: () => void
  handleExportHistoryExcel: () => void
}

export default function HistoryTab({
  history,
  historyTotal,
  historyPage,
  historySearch,
  setHistorySearch,
  fetchHistory,
  handleExportHistoryPDF,
  handleExportHistoryExcel,
}: HistoryTabProps) {
  const [startDate, setStartDate] = useState<Date | undefined>(undefined)
  const [endDate, setEndDate] = useState<Date | undefined>(undefined)

  const historyTotalPages = Math.ceil(historyTotal / 10)

  const handleApplyDateFilter = () => {
    const start = startDate ? formatDateParam(startDate) : undefined
    const end = endDate ? formatDateParam(endDate) : undefined
    fetchHistory(1, historySearch, start, end)
  }

  const handleClearDateFilter = () => {
    setStartDate(undefined)
    setEndDate(undefined)
    fetchHistory(1, historySearch)
  }

  const handlePageChange = (page: number) => {
    const start = startDate ? formatDateParam(startDate) : undefined
    const end = endDate ? formatDateParam(endDate) : undefined
    fetchHistory(page, historySearch, start, end)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-emerald-600" />
                Lịch sử gửi xe
              </CardTitle>
              <CardDescription className="text-xs">
                Tổng cộng {historyTotal} bản ghi
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên hoặc RFID..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportHistoryPDF}>
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Xuất PDF</span>
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportHistoryExcel}>
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Xuất Excel</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Date filter row */}
        <div className="px-6 pb-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Từ ngày</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    className="inline-flex items-center justify-start gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm font-normal hover:bg-accent hover:text-accent-foreground cursor-pointer h-9 w-[9rem]"
                  >
                    <CalendarIcon className="mr-1 h-4 w-4" />
                    {startDate ? formatDate(formatDateParam(startDate)) : 'Chọn ngày'}
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Đến ngày</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    className="inline-flex items-center justify-start gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm font-normal hover:bg-accent hover:text-accent-foreground cursor-pointer h-9 w-[9rem]"
                  >
                    <CalendarIcon className="mr-1 h-4 w-4" />
                    {endDate ? formatDate(formatDateParam(endDate)) : 'Chọn ngày'}
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button size="sm" variant="default" className="h-9 text-xs" onClick={handleApplyDateFilter}>
              <Search className="h-3.5 w-3.5 mr-1" />
              Lọc
            </Button>
            {(startDate || endDate) && (
              <Button size="sm" variant="ghost" className="h-9 text-xs text-muted-foreground" onClick={handleClearDateFilter}>
                <X className="h-3.5 w-3.5 mr-1" />
                Xóa bộ lọc
              </Button>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          <div className="overflow-x-auto parking-scrollbar max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">RFID UID</TableHead>
                  <TableHead className="text-xs">Tên</TableHead>
                  <TableHead className="text-xs">Loại</TableHead>
                  <TableHead className="text-xs">VIP</TableHead>
                  <TableHead className="text-xs">Thời gian vào</TableHead>
                  <TableHead className="text-xs">Thời gian ra</TableHead>
                  <TableHead className="text-xs">Thời gian đỗ</TableHead>
                  <TableHead className="text-xs text-right">Phí</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                      {historySearch ? 'Không tìm thấy' : 'Chưa có lịch sử nào'}
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs font-mono">{h.rfidUid.replace(/\s+/g, '')}</TableCell>
                      <TableCell className="text-xs font-medium">{h.personName && h.personName !== 'Khách' ? h.personName : '—'}</TableCell>
                      <TableCell><PersonTypeBadge personType={h.personType} /></TableCell>
                      <TableCell>{h.isVip && <VipBadge />}</TableCell>
                      <TableCell className="text-xs">{h.entryTime ? formatDateTime(h.entryTime) : '—'}</TableCell>
                      <TableCell className="text-xs">{h.exitTime ? formatDateTime(h.exitTime) : '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDuration(h.duration)}</TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {h.fee === 0 ? (
                          <span className="text-emerald-600">Miễn phí</span>
                        ) : (
                          formatVND(h.fee)
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {historyTotalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-xs text-muted-foreground">
                Trang {historyPage}/{historyTotalPages} ({historyTotal} bản ghi)
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={historyPage <= 1}
                  onClick={() => handlePageChange(historyPage - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, historyTotalPages) }, (_, i) => {
                  let page: number
                  if (historyTotalPages <= 5) {
                    page = i + 1
                  } else if (historyPage <= 3) {
                    page = i + 1
                  } else if (historyPage >= historyTotalPages - 2) {
                    page = historyTotalPages - 4 + i
                  } else {
                    page = historyPage - 2 + i
                  }
                  return (
                    <Button
                      key={page}
                      variant={page === historyPage ? 'default' : 'outline'}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={historyPage >= historyTotalPages}
                  onClick={() => handlePageChange(historyPage + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
