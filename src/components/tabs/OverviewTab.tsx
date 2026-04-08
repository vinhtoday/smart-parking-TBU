'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Truck, GraduationCap, UserCheck,
  Plus, Search, XCircle, Copy, Users,
} from 'lucide-react'

import {
  formatVND, formatDuration, formatTime, elapsedSince,
} from '@/lib/format'
import PersonBadge from '@/components/PersonBadge'
import { PersonTypeBadge, VipBadge } from '@/components/PersonTypeBadge'
import type { Stats, ParkedVehicle } from '@/types/parking'

interface OverviewTabProps {
  stats: Stats | null
  vehicles: ParkedVehicle[]
  filteredVehicles: ParkedVehicle[]
  vehicleSearch: string
  setVehicleSearch: (v: string) => void
  addVehicleOpen: boolean
  setAddVehicleOpen: (v: boolean) => void
  newVehicle: { rfidUid: string; personName: string; personType: 'student' | 'teacher' | 'guest'; isVip: boolean }
  setNewVehicle: (v: { rfidUid: string; personName: string; personType: 'student' | 'teacher' | 'guest'; isVip: boolean }) => void
  handleAddVehicle: () => Promise<void>
  handleVehicleExit: (rfidUid: string) => Promise<void>
  copyToClipboard: (text: string) => void
}

export default function OverviewTab({
  stats,
  vehicles,
  filteredVehicles,
  vehicleSearch,
  setVehicleSearch,
  addVehicleOpen,
  setAddVehicleOpen,
  newVehicle,
  setNewVehicle,
  handleAddVehicle,
  handleVehicleExit,
  copyToClipboard,
}: OverviewTabProps) {
  return (
    <div className="space-y-4">
      {/* Currently Parked Vehicles Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4 text-emerald-600" />
                Xe đang gửi trong bãi
              </CardTitle>
              <CardDescription className="text-xs">
                {vehicles.length} xe đang đỗ — {stats?.freeSlots ?? 0} vị trí trống
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm theo tên hoặc RFID..."
                  value={vehicleSearch}
                  onChange={e => setVehicleSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Dialog open={addVehicleOpen} onOpenChange={setAddVehicleOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Thêm xe</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Thêm xe vào bãi đỗ</DialogTitle>
                    <DialogDescription>Nhập thông tin xe để đỗ thủ công</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>RFID UID <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="AB12CD34"
                        value={newVehicle.rfidUid}
                        onChange={e => setNewVehicle({ ...newVehicle, rfidUid: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Họ tên <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="Nguyễn Văn A"
                        value={newVehicle.personName}
                        onChange={e => setNewVehicle({ ...newVehicle, personName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Loại người dùng</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={newVehicle.personType === 'student' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setNewVehicle({ ...newVehicle, personType: 'student', isVip: false })}
                          className="gap-1.5"
                        >
                          <GraduationCap className="h-3.5 w-3.5" /> Sinh viên
                        </Button>
                        <Button
                          type="button"
                          variant={newVehicle.personType === 'teacher' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setNewVehicle({ ...newVehicle, personType: 'teacher', isVip: true })}
                          className="gap-1.5"
                        >
                          <UserCheck className="h-3.5 w-3.5" /> Giảng viên
                        </Button>
                        <Button
                          type="button"
                          variant={newVehicle.personType === 'guest' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setNewVehicle({ ...newVehicle, personType: 'guest', isVip: false })}
                          className="gap-1.5"
                        >
                          <Users className="h-3.5 w-3.5" /> Khách
                        </Button>
                      </div>
                    </div>
                    {newVehicle.personType === 'teacher' && (
                      <div className="flex items-center justify-between rounded-lg border p-3">
                        <Label>VIP (Miễn phí)</Label>
                        <Switch
                          checked={newVehicle.isVip}
                          onCheckedChange={checked => setNewVehicle({ ...newVehicle, isVip: checked })}
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddVehicleOpen(false)}>Hủy</Button>
                    <Button onClick={handleAddVehicle}>Thêm xe vào bãi</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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
                  <TableHead className="text-xs">Tên</TableHead>
                  <TableHead className="text-xs">Loại</TableHead>
                  <TableHead className="text-xs">VIP</TableHead>
                  <TableHead className="text-xs">Thời gian vào</TableHead>
                  <TableHead className="text-xs">Thời gian đỗ</TableHead>
                  <TableHead className="text-xs text-right">Phí</TableHead>
                  <TableHead className="text-xs text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                      {vehicleSearch ? 'Không tìm thấy xe nào' : 'Chưa có xe nào trong bãi'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles.map((v, i) => (
                    <TableRow key={v.id} className="animate-fade-slide-in">
                      <TableCell className="text-xs font-medium">{i + 1}</TableCell>
                      <TableCell className="text-xs font-mono">
                        <div className="flex items-center gap-1">
                          <span className="truncate">{v.rfidUid.replace(/\s+/g, '')}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            onClick={() => copyToClipboard(v.rfidUid)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {v.personType !== 'guest' && v.personName ? v.personName : ''}
                      </TableCell>
                      <TableCell><PersonTypeBadge personType={v.personType} /></TableCell>
                      <TableCell>
                        {!v.personType || v.personType === 'guest' ? (<span className="text-[10px] text-muted-foreground">—</span>) : v.isVip ? (<VipBadge />) : (<span className="text-[10px] text-muted-foreground">—</span>)}
                      </TableCell>
                      <TableCell className="text-xs">{formatTime(v.entryTime)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDuration(elapsedSince(v.entryTime))}
                      </TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {v.personType === 'guest' ? (
                          <span className="text-emerald-600">Miễn phí</span>
                        ) : v.isVip ? (
                          <span className="text-emerald-600">Miễn phí</span>
                        ) : (
                          <span>{stats ? formatVND(stats.feePerTrip) : '2.000đ'}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => handleVehicleExit(v.rfidUid)}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Xe Ra
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
    </div>
  )
}
