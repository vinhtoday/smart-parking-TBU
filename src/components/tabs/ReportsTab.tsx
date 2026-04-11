'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  BarChart3, FileText, Copy, CalendarIcon, Download,
  Users, LogIn, GraduationCap, UserCheck, CreditCard, Car,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts'

import { formatVND, formatDuration, formatDate, formatDateParam } from '@/lib/format'
import { PersonTypeBadge, VipBadge } from '@/components/PersonTypeBadge'
import type { ReportData, ReportPeriod } from '@/types/parking'

interface ReportsTabProps {
  report: ReportData | null
  reportPeriod: ReportPeriod
  setReportPeriod: (v: ReportPeriod) => void
  reportStart: Date | undefined
  setReportStart: (v: Date | undefined) => void
  reportEnd: Date | undefined
  setReportEnd: (v: Date | undefined) => void
  fetchReport: (startDate?: string, endDate?: string) => void
  handleExportReportPDF: () => void
  handleExportReportExcel: () => void
  setReportRange: (period: ReportPeriod) => void
  copyToClipboard: (text: string) => void
}

export default function ReportsTab({
  report,
  reportPeriod,
  setReportPeriod,
  reportStart,
  setReportStart,
  reportEnd,
  setReportEnd,
  fetchReport,
  handleExportReportPDF,
  handleExportReportExcel,
  setReportRange,
  copyToClipboard,
}: ReportsTabProps) {
  return (
    <div className="space-y-4">
      {/* Period Selector + Custom Range */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            Báo cáo & Thống kê
          </CardTitle>
          <CardDescription className="text-xs">Chi tiết từng người gửi xe trong khoảng thời gian</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick period buttons */}
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'day' as ReportPeriod, label: 'Hôm nay' },
              { key: 'week' as ReportPeriod, label: 'Tuần này' },
              { key: 'month' as ReportPeriod, label: 'Tháng này' },
              { key: 'quarter' as ReportPeriod, label: 'Quý này' },
              { key: 'year' as ReportPeriod, label: 'Năm nay' },
            ] as const).map(p => (
              <Button
                key={p.key}
                variant={reportPeriod === p.key ? 'default' : 'outline'}
                size="sm"
                className="text-xs h-8"
                onClick={() => setReportRange(p.key)}
              >
                {p.label}
              </Button>
            ))}
          </div>

          {/* Custom date range */}
          <div className="flex flex-wrap items-end gap-3">
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
                    {reportStart ? formatDate(formatDateParam(reportStart)) : 'Chọn ngày'}
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={reportStart}
                    onSelect={setReportStart}
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
                    {reportEnd ? formatDate(formatDateParam(reportEnd)) : 'Chọn ngày'}
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={reportEnd}
                    onSelect={setReportEnd}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <Button
              size="sm"
              onClick={() => fetchReport(
                reportStart ? formatDateParam(reportStart) : undefined,
                reportEnd ? formatDateParam(reportEnd) : undefined,
              )}
              className="gap-1.5"
            >
              <BarChart3 className="h-4 w-4" />
              Xem báo cáo
            </Button>
          </div>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Revenue Chart */}
          {report.dailyRevenue && report.dailyRevenue.length > 0 && (
            <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-4 border-b border-border/50">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  Biểu đồ doanh thu
                </CardTitle>
                <CardDescription className="text-xs">
                  Doanh thu hàng ngày trong khoảng {report.startDate} → {report.endDate}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.dailyRevenue} margin={{ top: 10, right: 30, left: 10, bottom: 10 }} barCategoryGap="20%">
                      <defs>
                        <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" />
                          <stop offset="100%" stopColor="#059669" />
                        </linearGradient>
                        <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        className="text-muted-foreground"
                        axisLine={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
                        tickFormatter={(val: string) => {
                          const parts = val.split('-')
                          return `${parts[2]}/${parts[1]}`
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        className="text-muted-foreground"
                        tickFormatter={(val: number) => `${(val / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        formatter={(value: unknown) => [formatVND(Number(value)), 'Doanh thu']}
                        labelFormatter={(label: unknown) => {
                          const str = String(label || '')
                          const d = str.split('-')
                          return d.length >= 3 ? `${d[2]}/${d[1]}/${d[0]}` : str
                        }}
                        contentStyle={{
                          borderRadius: 10,
                          fontSize: 13,
                          border: '1px solid oklch(0.8 0 0 / 15%)',
                          boxShadow: '0 10px 25px -5px oklch(0 0 0 / 12%), 0 4px 6px -2px oklch(0 0 0 / 8%)',
                        }}
                        cursor={{ fill: 'oklch(0.5 0 0 / 5%)' }}
                        animationDuration={300}
                      />
                      <Bar
                        dataKey="revenue"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      >
                        {report.dailyRevenue.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={index % 2 === 0 ? 'url(#barGrad1)' : 'url(#barGrad2)'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pie Chart: Tỷ lệ loại người gửi xe */}
          {report && (report.studentCount + report.teacherCount + report.guestCount > 0) && (() => {
            const pieData = [
              { name: 'Sinh viên', value: report.studentCount, color: '#38bdf8', icon: '🎓' },
              { name: 'Giảng viên', value: report.teacherCount, color: '#fbbf24', icon: '👩‍🏫' },
              { name: 'Khách', value: report.guestCount, color: '#a1a1aa', icon: '🚶' },
            ].filter(d => d.value > 0)
            const pieTotal = pieData.reduce((s, d) => s + d.value, 0)
            return (
              <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader className="pb-4 border-b border-border/50">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600 dark:text-sky-400" />
                    Tỷ lệ theo loại người
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Phân bố Sinh viên / Giảng viên / Khách
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <defs>
                          {pieData.map((entry, idx) => (
                            <radialGradient key={`rg-${idx}`} id={`pieGlow-${idx}`} cx="50%" cy="50%" r="50%">
                              <stop offset="80%" stopColor={entry.color} stopOpacity="1" />
                              <stop offset="100%" stopColor={entry.color} stopOpacity="0.7" />
                            </radialGradient>
                          ))}
                        </defs>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="45%"
                          innerRadius={65}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                          animationDuration={1400}
                          animationEasing="ease-out"
                          strokeWidth={2}
                          className="[&_path]:stroke-background"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={`url(#pieGlow-${index})`} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: 10,
                            fontSize: 13,
                            border: '1px solid oklch(0.8 0 0 / 15%)',
                            boxShadow: '0 10px 25px -5px oklch(0 0 0 / 12%), 0 4px 6px -2px oklch(0 0 0 / 8%)',
                          }}
                          formatter={(value, name) => [`${value} người`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center label overlay */}
                    <div className="relative -mt-44 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-bold">{pieTotal}</span>
                      <span className="text-xs text-muted-foreground mt-0.5">người</span>
                    </div>
                  </div>
                  {/* Custom Legend */}
                  <div className="flex items-center justify-center gap-6 mt-2">
                    {pieData.map((entry, idx) => (
                      <div key={`legend-${idx}`} className="flex items-center gap-2 group cursor-default">
                        <span
                          className="inline-flex rounded-full h-3 w-3 ring-2 ring-background"
                          style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                          {entry.name}
                        </span>
                        <span className="text-sm font-semibold">
                          {entry.value} <span className="text-xs text-muted-foreground font-normal">({((entry.value / pieTotal) * 100).toFixed(0)}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            <Card className="parking-card-hover">
              <CardContent className="p-4 text-center">
                <Users className="h-5 w-5 text-blue-600 mx-auto mb-1" />
                <p className="text-2xl font-bold">{report.totalPersons}</p>
                <p className="text-xs text-muted-foreground">Tổng người</p>
              </CardContent>
            </Card>
            <Card className="parking-card-hover">
              <CardContent className="p-4 text-center">
                <LogIn className="h-5 w-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-2xl font-bold">{report.totalVisits}</p>
                <p className="text-xs text-muted-foreground">Tổng lượt gửi</p>
              </CardContent>
            </Card>
            <Card className="parking-card-hover stat-card-sky">
              <CardContent className="p-4 text-center">
                <GraduationCap className="h-5 w-5 text-sky-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-sky-700 dark:text-sky-400">{report.studentCount}</p>
                <p className="text-xs text-muted-foreground">Sinh viên</p>
              </CardContent>
            </Card>
            <Card className="parking-card-hover stat-card-amber">
              <CardContent className="p-4 text-center">
                <UserCheck className="h-5 w-5 text-amber-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{report.teacherCount}</p>
                <p className="text-xs text-muted-foreground">Giảng viên</p>
              </CardContent>
            </Card>
            <Card className="parking-card-hover stat-card-violet col-span-2 md:col-span-1">
              <CardContent className="p-4 text-center">
                <CreditCard className="h-5 w-5 text-violet-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-violet-700 dark:text-violet-400">{formatVND(report.totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">Tổng doanh thu</p>
              </CardContent>
            </Card>
          </div>

          {/* Detail Table: Per-person */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Chi tiết theo từng người</CardTitle>
                  <CardDescription className="text-xs">
                    {report.startDate} → {report.endDate} — {report.persons.length} người
                    {report.currentlyParkedCount > 0 && (
                      <Badge className="ml-2 text-[10px] bg-emerald-500 hover:bg-emerald-600 text-white">
                        <Car className="h-2.5 w-2.5 mr-0.5" /> {report.currentlyParkedCount} đang đỗ
                      </Badge>
                    )}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={handleExportReportPDF}
                  disabled={report.persons.length === 0}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Xuất PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8"
                  onClick={handleExportReportExcel}
                  disabled={report.persons.length === 0}
                >
                  <Download className="h-3.5 w-3.5" />
                  Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto parking-scrollbar max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 text-xs">#</TableHead>
                      <TableHead className="text-xs">RFID UID</TableHead>
                      <TableHead className="text-xs">Tên</TableHead>
                      <TableHead className="text-xs">Loại</TableHead>
                      <TableHead className="text-xs">VIP</TableHead>
                      <TableHead className="text-xs text-center">Số lần</TableHead>
                      <TableHead className="text-xs text-right">Tổng thời gian</TableHead>
                      <TableHead className="text-xs text-right">Tổng tiền</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.persons.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                          Không có dữ liệu trong khoảng thời gian này
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {report.persons.map((p, i) => (
                          <TableRow key={p.rfidUid}>
                            <TableCell className="text-xs font-medium">{i + 1}</TableCell>
                            <TableCell className="text-xs font-mono">
                              <div className="flex items-center gap-1">
                                <span className="truncate">{p.rfidUid}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 shrink-0"
                                  onClick={() => copyToClipboard(p.rfidUid)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {p.personType !== 'guest' && p.personName ? p.personName : ''}
                              {p.currentlyParked && (
                                <Badge className="ml-1.5 text-[9px] bg-emerald-500 hover:bg-emerald-600 text-white px-1 py-0">
                                  Đang đỗ
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell><PersonTypeBadge personType={p.personType} /></TableCell>
                            <TableCell>
                              {p.isVip ? <VipBadge /> : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-center font-semibold">{p.visitCount}</TableCell>
                            <TableCell className="text-xs text-right text-muted-foreground">{formatDuration(p.totalDuration)}</TableCell>
                            <TableCell className="text-xs text-right font-semibold text-violet-600 dark:text-violet-400">
                              {p.totalFee === 0 ? (
                                <span className="text-emerald-600">Miễn phí</span>
                              ) : (
                                formatVND(p.totalFee)
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        {/* Total row */}
                        <TableRow className="bg-muted/50 font-semibold">
                          <TableCell colSpan={5} className="text-xs text-right">TỔNG CỘNG</TableCell>
                          <TableCell className="text-xs text-center">{report.totalVisits}</TableCell>
                          <TableCell />
                          <TableCell className="text-xs text-right text-violet-600 dark:text-violet-400">{formatVND(report.totalRevenue)}</TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
