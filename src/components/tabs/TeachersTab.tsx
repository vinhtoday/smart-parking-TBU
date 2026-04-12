'use client'

import { useState } from 'react'

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
  UserCheck, Search, Plus, Pencil, Trash2, Copy, Shield,
} from 'lucide-react'

import { formatDate } from '@/lib/format'
import type { Teacher } from '@/types/parking'

interface TeachersTabProps {
  teachers: Teacher[]
  filteredTeachers: Teacher[]
  teacherSearch: string
  setTeacherSearch: (v: string) => void
  addTeacherOpen: boolean
  setAddTeacherOpen: (v: boolean) => void
  editTeacherOpen: boolean
  setEditTeacherOpen: (v: boolean) => void
  selectedTeacher: Teacher | null
  newTeacher: { name: string; rfidUid: string; department: string; phone: string; isVip: boolean }
  setNewTeacher: (v: { name: string; rfidUid: string; department: string; phone: string; isVip: boolean }) => void
  editTeacherForm: { name: string; department: string; phone: string; isVip: boolean }
  setEditTeacherForm: (v: { name: string; department: string; phone: string; isVip: boolean }) => void
  setSelectedTeacher: (t: Teacher | null) => void
  handleAddTeacher: () => Promise<void>
  handleEditTeacher: () => Promise<void>
  handleDeleteTeacher: (id: string, name: string) => Promise<void>
  handleToggleVip: (teacher: Teacher) => Promise<void>
  copyToClipboard: (text: string) => void
}

export default function TeachersTab({
  teachers,
  filteredTeachers,
  teacherSearch,
  setTeacherSearch,
  addTeacherOpen,
  setAddTeacherOpen,
  editTeacherOpen,
  setEditTeacherOpen,
  selectedTeacher,
  newTeacher,
  setNewTeacher,
  editTeacherForm,
  setEditTeacherForm,
  setSelectedTeacher,
  handleAddTeacher,
  handleEditTeacher,
  handleDeleteTeacher,
  handleToggleVip,
  copyToClipboard,
}: TeachersTabProps) {
  const [pendingDelete, setPendingDelete] = useState<{id: string; name: string} | null>(null)

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await handleDeleteTeacher(pendingDelete.id, pendingDelete.name)
    setPendingDelete(null)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-amber-600" />
                Quản lý Giảng viên
              </CardTitle>
              <CardDescription className="text-xs">
                {teachers.length} giảng viên đã đăng ký
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm giảng viên..."
                  value={teacherSearch}
                  onChange={e => setTeacherSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Dialog open={addTeacherOpen} onOpenChange={setAddTeacherOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Thêm GV</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Đăng ký giảng viên mới</DialogTitle>
                    <DialogDescription>Nhập thông tin giảng viên để đăng ký thẻ RFID</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Họ tên <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="Nguyễn Thị B"
                        value={newTeacher.name}
                        onChange={e => setNewTeacher({ ...newTeacher, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>RFID UID <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="AB 12 CD 34"
                        value={newTeacher.rfidUid}
                        onChange={e => setNewTeacher({ ...newTeacher, rfidUid: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Khoa/Bộ môn</Label>
                      <Input
                        placeholder="Khoa CNTT"
                        value={newTeacher.department}
                        onChange={e => setNewTeacher({ ...newTeacher, department: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Số điện thoại</Label>
                      <Input
                        placeholder="0123456789"
                        value={newTeacher.phone}
                        onChange={e => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>VIP (Miễn phí)</Label>
                      <Switch
                        checked={newTeacher.isVip}
                        onCheckedChange={checked => setNewTeacher({ ...newTeacher, isVip: checked })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddTeacherOpen(false)}>Hủy</Button>
                    <Button onClick={handleAddTeacher}>Đăng ký</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto parking-scrollbar max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-xs">#</TableHead>
                  <TableHead className="text-xs">Họ tên</TableHead>
                  <TableHead className="text-xs">RFID UID</TableHead>
                  <TableHead className="text-xs">Khoa</TableHead>
                  <TableHead className="text-xs">SĐT</TableHead>
                  <TableHead className="text-xs">VIP</TableHead>
                  <TableHead className="text-xs text-center">Số lần</TableHead>
                  <TableHead className="text-xs">Ngày đăng ký</TableHead>
                  <TableHead className="text-xs text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTeachers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                      {teacherSearch ? 'Không tìm thấy' : 'Chưa có giảng viên nào'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTeachers.map((t, i) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs font-medium">{i + 1}</TableCell>
                      <TableCell className="text-xs font-medium">{t.name}</TableCell>
                      <TableCell className="text-xs font-mono">
                        <div className="flex items-center gap-1">
                          <span className="truncate">{t.rfidUid.replace(/\s+/g, '')}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            onClick={() => copyToClipboard(t.rfidUid)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{t.department || '—'}</TableCell>
                      <TableCell className="text-xs">{t.phone || '—'}</TableCell>
                      <TableCell>
                        <Badge
                          className={`text-[10px] cursor-pointer ${t.isVip ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                          onClick={() => handleToggleVip(t)}
                        >
                          <Shield className="h-2.5 w-2.5 mr-0.5" />
                          {t.isVip ? 'VIP' : 'Bình thường'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-center font-semibold text-amber-600 dark:text-amber-400">{t.visitCount || 0}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setSelectedTeacher(t)
                              setEditTeacherForm({
                                name: t.name,
                                department: t.department || '',
                                phone: t.phone || '',
                                isVip: t.isVip,
                              })
                              setEditTeacherOpen(true)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600"
                            onClick={() => setPendingDelete({ id: t.id, name: t.name })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Teacher Dialog */}
      <Dialog open={editTeacherOpen} onOpenChange={setEditTeacherOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa thông tin giảng viên</DialogTitle>
            <DialogDescription>Cập nhật thông tin cho {selectedTeacher?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Họ tên</Label>
              <Input
                value={editTeacherForm.name}
                onChange={e => setEditTeacherForm({ ...editTeacherForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Khoa/Bộ môn</Label>
              <Input
                value={editTeacherForm.department}
                onChange={e => setEditTeacherForm({ ...editTeacherForm, department: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Số điện thoại</Label>
              <Input
                value={editTeacherForm.phone}
                onChange={e => setEditTeacherForm({ ...editTeacherForm, phone: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>VIP (Miễn phí)</Label>
              <Switch
                checked={editTeacherForm.isVip}
                onCheckedChange={checked => setEditTeacherForm({ ...editTeacherForm, isVip: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTeacherOpen(false)}>Hủy</Button>
            <Button onClick={handleEditTeacher}>Cập nhật</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa giảng viên &quot;{pendingDelete?.name}&quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>Hủy</Button>
            <Button variant="destructive" onClick={confirmDelete}>Xóa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
