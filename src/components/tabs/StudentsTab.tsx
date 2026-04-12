'use client'

import { useState } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  GraduationCap, Search, Plus, Pencil, Trash2, Copy,
} from 'lucide-react'

import { formatVND, formatDate } from '@/lib/format'
import type { Student } from '@/types/parking'

interface StudentsTabProps {
  students: Student[]
  filteredStudents: Student[]
  studentSearch: string
  setStudentSearch: (v: string) => void
  addStudentOpen: boolean
  setAddStudentOpen: (v: boolean) => void
  editStudentOpen: boolean
  setEditStudentOpen: (v: boolean) => void
  selectedStudent: Student | null
  newStudent: { name: string; rfidUid: string; class: string; phone: string }
  setNewStudent: (v: { name: string; rfidUid: string; class: string; phone: string }) => void
  editStudentForm: { name: string; class: string; phone: string }
  setEditStudentForm: (v: { name: string; class: string; phone: string }) => void
  setSelectedStudent: (s: Student | null) => void
  handleAddStudent: () => Promise<void>
  handleEditStudent: () => Promise<void>
  handleDeleteStudent: (id: string, name: string) => Promise<void>
  copyToClipboard: (text: string) => void
}

export default function StudentsTab({
  students,
  filteredStudents,
  studentSearch,
  setStudentSearch,
  addStudentOpen,
  setAddStudentOpen,
  editStudentOpen,
  setEditStudentOpen,
  selectedStudent,
  newStudent,
  setNewStudent,
  editStudentForm,
  setEditStudentForm,
  setSelectedStudent,
  handleAddStudent,
  handleEditStudent,
  handleDeleteStudent,
  copyToClipboard,
}: StudentsTabProps) {
  const [pendingDelete, setPendingDelete] = useState<{id: string; name: string} | null>(null)

  const confirmDelete = async () => {
    if (!pendingDelete) return
    await handleDeleteStudent(pendingDelete.id, pendingDelete.name)
    setPendingDelete(null)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-sky-600" />
                Quản lý Sinh viên
              </CardTitle>
              <CardDescription className="text-xs">
                {students.length} sinh viên đã đăng ký
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm sinh viên..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Thêm SV</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Đăng ký sinh viên mới</DialogTitle>
                    <DialogDescription>Nhập thông tin sinh viên để đăng ký thẻ RFID</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="s-name">Họ tên <span className="text-red-500">*</span></Label>
                      <Input
                        id="s-name"
                        placeholder="Nguyễn Văn A"
                        value={newStudent.name}
                        onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-rfid">RFID UID <span className="text-red-500">*</span></Label>
                      <Input
                        id="s-rfid"
                        placeholder="AB 12 CD 34"
                        value={newStudent.rfidUid}
                        onChange={e => setNewStudent({ ...newStudent, rfidUid: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-class">Lớp</Label>
                      <Input
                        id="s-class"
                        placeholder="DH21DTA"
                        value={newStudent.class}
                        onChange={e => setNewStudent({ ...newStudent, class: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="s-phone">Số điện thoại</Label>
                      <Input
                        id="s-phone"
                        placeholder="0123456789"
                        value={newStudent.phone}
                        onChange={e => setNewStudent({ ...newStudent, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddStudentOpen(false)}>Hủy</Button>
                    <Button onClick={handleAddStudent}>Đăng ký</Button>
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
                  <TableHead className="text-xs">Lớp</TableHead>
                  <TableHead className="text-xs">SĐT</TableHead>
                  <TableHead className="text-xs text-center">Số lần</TableHead>
                  <TableHead className="text-xs text-right">Tổng tiền</TableHead>
                  <TableHead className="text-xs">Ngày đăng ký</TableHead>
                  <TableHead className="text-xs text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-sm">
                      {studentSearch ? 'Không tìm thấy' : 'Chưa có sinh viên nào'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStudents.map((s, i) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs font-medium">{i + 1}</TableCell>
                      <TableCell className="text-xs font-medium">{s.name}</TableCell>
                      <TableCell className="text-xs font-mono">
                        <div className="flex items-center gap-1">
                          <span className="truncate">{s.rfidUid.replace(/\s+/g, '')}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            onClick={() => copyToClipboard(s.rfidUid)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">{s.class || '—'}</TableCell>
                      <TableCell className="text-xs">{s.phone || '—'}</TableCell>
                      <TableCell className="text-xs text-center font-semibold text-sky-600 dark:text-sky-400">{s.visitCount || 0}</TableCell>
                      <TableCell className="text-xs text-right font-semibold text-violet-600 dark:text-violet-400">{s.totalFee ? formatVND(s.totalFee) : '0đ'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(s.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => {
                              setSelectedStudent(s)
                              setEditStudentForm({ name: s.name, class: s.class || '', phone: s.phone || '' })
                              setEditStudentOpen(true)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600"
                            onClick={() => setPendingDelete({ id: s.id, name: s.name })}
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

      {/* Edit Student Dialog */}
      <Dialog open={editStudentOpen} onOpenChange={setEditStudentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa thông tin sinh viên</DialogTitle>
            <DialogDescription>Cập nhật thông tin cho {selectedStudent?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Họ tên</Label>
              <Input
                value={editStudentForm.name}
                onChange={e => setEditStudentForm({ ...editStudentForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Lớp</Label>
              <Input
                value={editStudentForm.class}
                onChange={e => setEditStudentForm({ ...editStudentForm, class: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Số điện thoại</Label>
              <Input
                value={editStudentForm.phone}
                onChange={e => setEditStudentForm({ ...editStudentForm, phone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStudentOpen(false)}>Hủy</Button>
            <Button onClick={handleEditStudent}>Cập nhật</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận xóa</DialogTitle>
            <DialogDescription>
              Bạn có chắc muốn xóa sinh viên &quot;{pendingDelete?.name}&quot;?
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
