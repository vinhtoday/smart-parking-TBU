'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Settings, Radio, RefreshCw, Monitor,
} from 'lucide-react'

import type { Stats, Student, Teacher } from '@/types/parking'
import type { ArduinoStatus, SerialPortInfo } from '@/types/arduino'

interface SettingsTabProps {
  configForm: { feePerTrip: number }
  setConfigForm: (v: { feePerTrip: number }) => void
  saving: boolean
  handleSaveConfig: () => Promise<void>
  arduinoConnected: boolean
  arduinoStatus: ArduinoStatus | null
  serialPorts: SerialPortInfo[]
  customPort: string
  setCustomPort: (v: string) => void
  connecting: boolean
  handleConnectSerial: (port: string) => Promise<void>
  stats: Stats | null
  students: Student[]
  teachers: Teacher[]
  historyTotal: number
  lastSync: Date | null
}

export default function SettingsTab({
  configForm,
  setConfigForm,
  saving,
  handleSaveConfig,
  arduinoConnected,
  arduinoStatus,
  serialPorts,
  customPort,
  setCustomPort,
  connecting,
  handleConnectSerial,
  stats,
  students,
  teachers,
  historyTotal,
  lastSync,
}: SettingsTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cấu hình hệ thống */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4 text-emerald-600" />
              Cấu hình hệ thống
            </CardTitle>
            <CardDescription className="text-xs">Thiết lập chung của bãi đỗ xe</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cfg-fee" className="text-xs">Phí mỗi lượt (đ)</Label>
              <Input id="cfg-fee" type="number" min={0} value={configForm.feePerTrip} onChange={e => setConfigForm({ ...configForm, feePerTrip: parseInt(e.target.value) || 0 })} className="h-9 text-sm" />
            </div>
            <Button onClick={handleSaveConfig} disabled={saving} className="w-full gap-2">
              {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
              {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </Button>
          </CardContent>
        </Card>

        {/* Kết nối Arduino */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Radio className={`h-4 w-4 ${arduinoConnected ? 'text-emerald-500' : 'text-amber-500'}`} />
              Kết nối Arduino
            </CardTitle>
            <CardDescription className="text-xs">Serial với Arduino RC522 RFID</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${arduinoConnected ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}`}>
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${arduinoConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {arduinoConnected ? (
                <span className="font-medium">Đã kết nối — {arduinoStatus?.serialPort || ''} ({arduinoStatus?.baudRate || 9600} baud)</span>
              ) : (
                <div>
                  <p className="font-medium">Chưa kết nối</p>
                  {arduinoStatus?.lastError && <p className="text-xs mt-0.5 opacity-80">Lỗi: {arduinoStatus.lastError}</p>}
                </div>
              )}
            </div>

            {/* Available Ports */}
            {serialPorts.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs">Cổng Serial khả dụng:</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {serialPorts.map((p) => (
                    <Button
                      key={p.path}
                      variant={arduinoStatus?.serialPort === p.path ? 'default' : 'outline'}
                      size="sm"
                      className="justify-start gap-2 text-xs h-9 font-mono"
                      disabled={connecting}
                      onClick={() => handleConnectSerial(p.path)}
                    >
                      <span className={`w-2 h-2 rounded-full ${arduinoStatus?.serialPort === p.path ? 'bg-emerald-400' : 'bg-muted-foreground/30'}`} />
                      {p.path}
                      {p.manufacturer && <span className="text-muted-foreground normal-case">({p.manufacturer})</span>}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Manual Port */}
            <div className="space-y-2">
              <Label className="text-xs">Nhập cổng thủ công:</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="COM5, /dev/ttyUSB0..."
                  value={customPort}
                  onChange={e => setCustomPort(e.target.value)}
                  className="h-9 text-xs font-mono"
                  onKeyDown={e => { if (e.key === 'Enter' && customPort.trim()) handleConnectSerial(customPort.trim()) }}
                />
                <Button size="sm" className="h-9" disabled={!customPort.trim() || connecting} onClick={() => handleConnectSerial(customPort.trim())}>
                  {connecting ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Kết nối'}
                </Button>
              </div>
            </div>

            {/* Tips */}
            <div className="text-[10px] text-muted-foreground space-y-0.5 p-2.5 rounded-lg bg-muted/50">
              <p className="font-medium text-foreground/70">Lưu ý:</p>
              <ul className="list-disc list-inside ml-1 space-y-0.5">
                <li>Arduino phải cắm USB vào máy chạy server</li>
                <li>Đóng Arduino IDE Serial Monitor trước khi kết nối</li>
                <li>Windows: COM3, COM5... | Linux: /dev/ttyUSB0...</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Thông tin hệ thống */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Monitor className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">Bãi Đỗ Xe Thông Minh — ĐH Thái Bình</span>
            </div>
            <span>|</span>
            <span>SV: <strong className="text-foreground">{students.length}</strong></span>
            <span>GV: <strong className="text-foreground">{teachers.length}</strong></span>
            <span>Lịch sử: <strong className="text-foreground">{historyTotal}</strong></span>
            <span>Sync: <strong className="text-foreground">{lastSync ? lastSync.toLocaleTimeString('vi-VN') : '—'}</strong></span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
