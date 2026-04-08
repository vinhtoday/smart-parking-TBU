'use client'

import { useState } from 'react'
import { toast } from 'sonner'

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
  Users, Plus, Pencil, Trash2, Search, Shield, UserCheck, UserX,
} from 'lucide-react'

import { formatDate } from '@/lib/format'

interface UserAccount {
  id: string
  username: string
  name: string
  admin: number
  active: boolean
  createdAt: string
}

interface ManageTabProps {
  users: UserAccount[]
  userSearch: string
  setUserSearch: (v: string) => void
  fetchUsers: () => void
  currentUserUsername?: string
}

export default function ManageTab({
  users,
  userSearch,
  setUserSearch,
  fetchUsers,
  currentUserUsername,
}: ManageTabProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editUser, setEditUser] = useState<UserAccount | null>(null)

  // Add form
  const [addForm, setAddForm] = useState({
    username: '', password: '', name: '', admin: false, active: true,
  })

  // Edit form
  const [editForm, setEditForm] = useState({
    name: '', password: '', admin: false, active: true,
  })

  const handleAdd = async () => {
    if (!addForm.username || !addForm.password || !addForm.name) {
      return
    }
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: addForm.username,
          password: addForm.password,
          name: addForm.name,
          admin: addForm.admin ? 1 : 0,
          active: addForm.active,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Đã tạo tài khoản thành công')
        setAddForm({ username: '', password: '', name: '', admin: false, active: true })
        setAddOpen(false)
        fetchUsers()
      } else {
        toast.error(json.error || 'Lỗi')
      }
    } catch {
      toast.error('Lỗi khi tạo tài khoản')
    }
  }

  const handleEdit = async () => {
    if (!editUser) return
    try {
      const body: { id: string; name: string; admin: number; active: boolean; password?: string } = {
        id: editUser.id,
        name: editForm.name,
        admin: editForm.admin ? 1 : 0,
        active: editForm.active,
      }
      if (editForm.password.trim()) {
        body.password = editForm.password
      }
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Đã cập nhật tài khoản thành công')
        setEditOpen(false)
        setEditUser(null)
        fetchUsers()
      } else {
        toast.error(json.error || 'Lỗi')
      }
    } catch {
      toast.error('Lỗi khi cập nhật tài khoản')
    }
  }

  const handleDelete = async (user: UserAccount) => {
    if (!confirm(`Xóa tài khoản "${user.name}" (${user.username})?`)) return
    try {
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, currentUsername: currentUserUsername }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Đã xóa tài khoản thành công')
        fetchUsers()
      } else {
        toast.error(json.error || 'Lỗi')
      }
    } catch {
      toast.error('Lỗi khi xóa tài khoản')
    }
  }

  const handleToggleActive = async (user: UserAccount) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, active: !user.active }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Đã cập nhật trạng thái')
        fetchUsers()
      }
    } catch {
      toast.error('Lỗi khi thay đổi trạng thái')
    }
  }

  const openEdit = (user: UserAccount) => {
    setEditUser(user)
    setEditForm({
      name: user.name,
      password: '',
      admin: user.admin === 1,
      active: user.active,
    })
    setEditOpen(true)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-violet-600" />
                Quản lý Tài khoản
              </CardTitle>
              <CardDescription className="text-xs">
                {users.length} tài khoản
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm tài khoản..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Thêm tài khoản</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Thêm tài khoản mới</DialogTitle>
                    <DialogDescription>Tạo tài khoản đăng nhập cho hệ thống</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label htmlFor="u-name">Họ tên <span className="text-red-500">*</span></Label>
                      <Input
                        id="u-name"
                        placeholder="Nguyễn Văn A"
                        value={addForm.name}
                        onChange={e => setAddForm({ ...addForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="u-username">Tên đăng nhập <span className="text-red-500">*</span></Label>
                      <Input
                        id="u-username"
                        placeholder="username"
                        value={addForm.username}
                        onChange={e => setAddForm({ ...addForm, username: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="u-password">Mật khẩu <span className="text-red-500">*</span></Label>
                      <Input
                        id="u-password"
                        type="password"
                        placeholder="Mật khẩu"
                        value={addForm.password}
                        onChange={e => setAddForm({ ...addForm, password: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-amber-600" />
                        <Label>Quyền Admin</Label>
                      </div>
                      <Switch
                        checked={addForm.admin}
                        onCheckedChange={checked => setAddForm({ ...addForm, admin: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-emerald-600" />
                        <Label>Kích hoạt</Label>
                      </div>
                      <Switch
                        checked={addForm.active}
                        onCheckedChange={checked => setAddForm({ ...addForm, active: checked })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddOpen(false)}>Hủy</Button>
                    <Button onClick={handleAdd} disabled={!addForm.username || !addForm.password || !addForm.name}>
                      Tạo
                    </Button>
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
                  <TableHead className="text-xs">Username</TableHead>
                  <TableHead className="text-xs">Họ tên</TableHead>
                  <TableHead className="text-xs text-center">Quyền</TableHead>
                  <TableHead className="text-xs text-center">Trạng thái</TableHead>
                  <TableHead className="text-xs">Ngày tạo</TableHead>
                  <TableHead className="text-xs text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                      {userSearch ? 'Không tìm thấy' : 'Chưa có tài khoản nào'}
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u, i) => (
                    <TableRow key={u.id}>
                      <TableCell className="text-xs font-medium">{i + 1}</TableCell>
                      <TableCell className="text-xs font-mono font-medium">{u.username}</TableCell>
                      <TableCell className="text-xs font-medium">{u.name}</TableCell>
                      <TableCell className="text-center">
                        {u.admin === 1 ? (
                          <Badge className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white">
                            <Shield className="h-2.5 w-2.5 mr-0.5" /> Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600">
                            Nhân viên
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 gap-1 text-[10px] font-medium ${u.active ? 'text-emerald-600 hover:text-emerald-700' : 'text-red-500 hover:text-red-600'}`}
                          onClick={() => handleToggleActive(u)}
                          disabled={u.username === currentUserUsername}
                        >
                          {u.active ? (
                            <><UserCheck className="h-3 w-3" /> Hoạt động</>
                          ) : (
                            <><UserX className="h-3 w-3" /> Vô hiệu</>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEdit(u)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600"
                            onClick={() => handleDelete(u)}
                            disabled={u.username === currentUserUsername}
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

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sửa tài khoản</DialogTitle>
            <DialogDescription>Cập nhật thông tin cho {editUser?.name} (@{editUser?.username})</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Họ tên</Label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Mật khẩu mới <span className="text-muted-foreground text-xs">(để trống nếu không đổi)</span></Label>
              <Input
                type="password"
                placeholder="Nhập mật khẩu mới..."
                value={editForm.password}
                onChange={e => setEditForm({ ...editForm, password: e.target.value })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-600" />
                <Label>Quyền Admin</Label>
              </div>
              <Switch
                checked={editForm.admin}
                onCheckedChange={checked => setEditForm({ ...editForm, admin: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                <Label>Kích hoạt</Label>
              </div>
              <Switch
                checked={editForm.active}
                onCheckedChange={checked => setEditForm({ ...editForm, active: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditOpen(false); setEditUser(null) }}>Hủy</Button>
            <Button onClick={handleEdit}>Cập nhật</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
