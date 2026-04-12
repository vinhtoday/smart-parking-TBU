'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Users, UserCheck, ArrowDownToLine, ArrowUpFromLine, DollarSign,
  Clock, Car,
} from 'lucide-react'

import {
  formatVND, formatDuration, formatTime, formatDateTime, elapsedSince,
} from '@/lib/format'
import type { ParkedVehicle, Stats } from '@/types/parking'
import type { GuestData } from '@/hooks/useParkingData'

interface GuestsTabProps {
  guestData: GuestData | null
  stats: Stats | null
  vehicles: ParkedVehicle[]
}

export default function GuestsTab({
  guestData,
  stats,
  vehicles,
}: GuestsTabProps) {
  // Currently parked guests (from live vehicles for real-time accuracy)
  const parkedGuests = vehicles.filter((v) => v.personType === 'guest')
  const todayHistory = guestData?.todayHistory ?? []
  const guestStats = guestData?.stats
  const feePerTrip = guestData?.feePerTrip ?? stats?.feePerTrip ?? 2000

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="parking-card-hover overflow-hidden">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 text-slate-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{parkedGuests.length}</p>
            <p className="text-xs text-muted-foreground">Đang đỗ</p>
          </CardContent>
        </Card>
        <Card className="parking-card-hover stat-card-emerald">
          <CardContent className="p-4 text-center">
            <ArrowDownToLine className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{guestStats?.todayEntries ?? 0}</p>
            <p className="text-xs text-muted-foreground">Vào hôm nay</p>
          </CardContent>
        </Card>
        <Card className="parking-card-hover">
          <CardContent className="p-4 text-center">
            <ArrowUpFromLine className="h-5 w-5 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{guestStats?.todayExits ?? 0}</p>
            <p className="text-xs text-muted-foreground">Ra hôm nay</p>
          </CardContent>
        </Card>
        <Card className="parking-card-hover stat-card-violet">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 text-violet-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">{formatVND(guestStats?.todayRevenue ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Doanh thu khách</p>
          </CardContent>
        </Card>
        <Card className="parking-card-hover col-span-2 md:col-span-1">
          <CardContent className="p-4 text-center">
            <UserCheck className="h-5 w-5 text-sky-600 mx-auto mb-1" />
            <p className="text-2xl font-bold text-sky-700 dark:text-sky-400">{guestStats?.uniqueGuestsToday ?? 0}</p>
            <p className="text-xs text-muted-foreground">Khách riêng biệt</p>
          </CardContent>
        </Card>
      </div>

      {/* Currently Parked Guests */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="h-4 w-4 text-slate-500" />
                Khách đang gửi xe
              </CardTitle>
              <CardDescription className="text-xs">
                {parkedGuests.length} khách đang đỗ — Phí: {feePerTrip.toLocaleString('vi-VN')}đ/lượt
              </CardDescription>
            </div>
            <Badge variant="outline" className="border-slate-300 text-slate-600 text-xs">
              {feePerTrip.toLocaleString('vi-VN')}đ/lượt
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto parking-scrollbar max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <TableHead className="text-xs">RFID UID</TableHead>
                  <TableHead className="text-xs">Thời gian vào</TableHead>
                  <TableHead className="text-xs">Thời gian đỗ</TableHead>
                  <TableHead className="text-xs text-right">Phí dự kiến</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {parkedGuests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                      Hiện không có khách nào trong bãi
                    </TableCell>
                  </TableRow>
                ) : (
                  parkedGuests.map((v, i) => (
                    <TableRow key={v.id} className="animate-fade-slide-in">
                      <TableCell className="text-xs font-medium">{i + 1}</TableCell>
                      <TableCell className="text-xs font-mono">{v.rfidUid}</TableCell>
                      <TableCell className="text-xs">{formatTime(v.entryTime)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDuration(elapsedSince(v.entryTime))}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium text-violet-600 dark:text-violet-400">
                        {formatVND(feePerTrip)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Today's Guest History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                Lịch sử khách hôm nay
              </CardTitle>
              <CardDescription className="text-xs">
                {todayHistory.length} lượt khách — {formatVND(guestStats?.todayRevenue ?? 0)} doanh thu
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto parking-scrollbar max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <TableHead className="text-xs">RFID UID</TableHead>
                  <TableHead className="text-xs">Thời gian vào</TableHead>
                  <TableHead className="text-xs">Thời gian ra</TableHead>
                  <TableHead className="text-xs">Thời gian đỗ</TableHead>
                  <TableHead className="text-xs text-right">Phí thu</TableHead>
                  <TableHead className="text-xs text-center">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {todayHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                      Chưa có khách nào hôm nay
                    </TableCell>
                  </TableRow>
                ) : (
                  todayHistory.map((h, i) => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs font-medium">{i + 1}</TableCell>
                      <TableCell className="text-xs font-mono">{h.rfidUid}</TableCell>
                      <TableCell className="text-xs">{h.entryTime ? formatDateTime(h.entryTime) : '—'}</TableCell>
                      <TableCell className="text-xs">{h.exitTime ? formatDateTime(h.exitTime) : '—'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDuration(h.duration)}</TableCell>
                      <TableCell className="text-xs text-right font-medium text-violet-600 dark:text-violet-400">
                        {h.fee > 0 ? formatVND(h.fee) : (
                          <span className="text-emerald-600">Miễn phí</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-center">
                        {h.exitTime ? (
                          <Badge variant="outline" className="text-[10px] border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-600 dark:text-emerald-300 dark:bg-emerald-950/40">
                            Đã ra
                          </Badge>
                        ) : (
                          <Badge className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white">
                            Đang đỗ
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
