'use client'

import { useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  UserRound, Search, Copy, ArrowRightLeft,
} from 'lucide-react'
import { toast } from 'sonner'

import { formatVND, formatDateTime } from '@/lib/format'
import type { Stats } from '@/types/parking'

interface GuestRecord {
  rfidUid: string
  visitCount: number
  totalFee: number
  lastEntry: string | null
  isParked: boolean
}

interface GuestsTabProps {
  guestData: GuestRecord[] | null
  stats: Stats | null
  onRefresh: () => void
}

export default function GuestsTab({
  guestData,
  stats,
  onRefresh,
}: GuestsTabProps) {
  const [guestSearch, setGuestSearch] = useState('')
  const [convertOpen, setConvertOpen] = useState(false)
  const [convertUid, setConvertUid] = useState('')
  const [convertType, setConvertType] = useState<'student' | 'teacher'>('student')
  const [convertName, setConvertName] = useState('')
  const [convertClass, setConvertClass] = useState('')
  const [convertDept, setConvertDept] = useState('')
  const [convertPhone, setConvertPhone] = useState('')
  const [converting, setConverting] = useState(false)

  const guests: GuestRecord[] = guestData ?? []
  const feePerTrip = stats?.feePerTrip ?? 2000

  // Filter by search
  const filteredGuests = guests.filter((g) =>
    !guestSearch ||
    g.rfidUid.toLowerCase().includes(guestSearch.toLowerCase())
  )

  // Stats
  const parkedCount = guests.filter((g) => g.isParked).length
  const totalGuests = guests.length
  const totalRevenue = guests.reduce((sum, g) => sum + g.totalFee, 0)

  // Open convert dialog
  const openConvert = (uid: string) => {
    setConvertUid(uid)
    setConvertType('student')
    setConvertName('')
    setConvertClass('')
    setConvertDept('')
    setConvertPhone('')
    setConvertOpen(true)
  }

  // Handle convert guest → student/teacher
  const handleConvert = async () => {
    if (!convertName.trim()) {
      toast.error('Vui lòng nhập tên')
      return
    }
    setConverting(true)
    try {
      const endpoint = convertType === 'student' ? '/api/students' : '/api/teachers'
      const body = convertType === 'student'
        ? { name: convertName.trim(), rfidUid: convertUid, class: convertClass.trim(), phone: convertPhone.trim() }
        : { name: convertName.trim(), rfidUid: convertUid, department: convertDept.trim(), phone: convertPhone.trim(), isVip: false }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        toast.success(`Đã kê khai ${convertType === 'student' ? 'sinh viên' : 'giảng viên'}: ${convertName}`)
        setConvertOpen(false)
        onRefresh()
      } else {
        toast.error(json.error || `Không thể kê khai ${convertType}`)
      }
    } catch {
      toast.error('Lỗi khi kê khai')
    } finally {
      setConverting(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text.replace(/\s+/g, ''))
    toast.success('Đã copy UID')
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <UserRound className="h-4 w-4 text-slate-500" />
                Quản lý Khách
              </CardTitle>
              <CardDescription className="text-xs">
                {totalGuests} khách — {parkedCount} đang đỗ — Tổng: {formatVND(totalRevenue)} — Phí: {feePerTrip.toLocaleString('vi-VN')}đ/lượt
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm UID..."
                value={guestSearch}
                onChange={e => setGuestSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto parking-scrollbar max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <TableHead className="text-xs">RFID UID</TableHead>
                  <TableHead className="text-xs text-center">Số lần</TableHead>
                  <TableHead className="text-xs text-right">Tổng tiền</TableHead>
                  <TableHead className="text-xs">Lần cuối</TableHead>
                  <TableHead className="text-xs text-center">Trạng thái</TableHead>
                  <TableHead className="text-xs text-center">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGuests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                      {guestSearch ? 'Không tìm thấy khách nào' : 'Chưa có khách nào'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredGuests.map((g, i) => (
                    <TableRow key={g.rfidUid}>
                      <TableCell className="text-xs font-medium">{i + 1}</TableCell>
                      <TableCell className="text-xs font-mono">
                        <div className="flex items-center gap-1">
                          <span className="truncate">{g.rfidUid.replace(/\s+/g, '')}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            onClick={() => copyToClipboard(g.rfidUid)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-center font-semibold text-sky-600 dark:text-sky-400">
                        {g.visitCount}
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold text-violet-600 dark:text-violet-400">
                        {g.totalFee > 0 ? formatVND(g.totalFee) : '0đ'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {g.lastEntry ? formatDateTime(g.lastEntry) : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-center">
                        {g.isParked ? (
                          <Badge className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white">
                            Đang đỗ
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-600 dark:text-emerald-300 dark:bg-emerald-950/40">
                            Đã ra
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => openConvert(g.rfidUid)}
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                          Kê khai
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Convert Dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Kê khai khách thành {convertType === 'student' ? 'sinh viên' : 'giảng viên'}
            </DialogTitle>
            <DialogDescription>
              Đăng ký UID <span className="font-mono font-bold text-primary">{convertUid}</span> vào hệ thống.
              Từ nay, thẻ này sẽ được nhận diện tự động.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Type selector */}
            <div className="space-y-2">
              <Label>Loại người dùng</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={convertType === 'student' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setConvertType('student')}
                >
                  Sinh viên
                </Button>
                <Button
                  type="button"
                  variant={convertType === 'teacher' ? 'default' : 'outline'}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setConvertType('teacher')}
                >
                  Giảng viên
                </Button>
              </div>
            </div>
            {/* Name */}
            <div className="space-y-2">
              <Label>Họ tên <span className="text-red-500">*</span></Label>
              <Input
                placeholder="Nguyễn Văn A"
                value={convertName}
                onChange={e => setConvertName(e.target.value)}
              />
            </div>
            {/* Student-specific: class */}
            {convertType === 'student' && (
              <div className="space-y-2">
                <Label>Lớp</Label>
                <Input
                  placeholder="CNTT01"
                  value={convertClass}
                  onChange={e => setConvertClass(e.target.value)}
                />
              </div>
            )}
            {/* Teacher-specific: department */}
            {convertType === 'teacher' && (
              <div className="space-y-2">
                <Label>Khoa / Bộ môn</Label>
                <Input
                  placeholder="CNTT"
                  value={convertDept}
                  onChange={e => setConvertDept(e.target.value)}
                />
              </div>
            )}
            {/* Phone */}
            <div className="space-y-2">
              <Label>Số điện thoại</Label>
              <Input
                placeholder="0912345678"
                value={convertPhone}
                onChange={e => setConvertPhone(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConvertOpen(false)} disabled={converting}>
              Hủy
            </Button>
            <Button onClick={handleConvert} disabled={converting || !convertName.trim()}>
              {converting ? 'Đang kê khai...' : 'Kê khai'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
