// Utility functions for formatting in the Smart Parking System

/**
 * Format a number as Vietnamese Dong currency
 */
export function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ'
}

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0) return '0s'
  if (seconds < 60) return `${seconds} giây`

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    if (minutes > 0) {
      return `${hours}g ${minutes}p`
    }
    return `${hours}g`
  }

  if (secs > 0) {
    return `${minutes}p ${secs}s`
  }
  return `${minutes}p`
}

/**
 * Format a Date object or ISO string to Vietnamese datetime string
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`
}

/**
 * Format a Date object or ISO string to date only (DD/MM/YYYY)
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''

  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()

  return `${day}/${month}/${year}`
}

/**
 * Format a Date object to YYYY-MM-DD for API params
 */
export function formatDateParam(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format time to HH:MM:SS
 */
export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'

  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')

  return `${hours}:${minutes}:${seconds}`
}

/**
 * Calculate elapsed time since a given date in seconds
 */
export function elapsedSince(date: string | Date): number {
  const d = typeof date === 'string' ? new Date(date) : date
  return Math.floor((Date.now() - d.getTime()) / 1000)
}

/**
 * Get today's date string in YYYY-MM-DD format (local timezone)
 */
export function todayStr(): string {
  return formatDateParam(new Date())
}

/**
 * Format a Date as YYYY-MM-DD using LOCAL timezone
 */
export function toDateLocal(date: Date): string {
  const d = date instanceof Date ? date : new Date(date)
  if (isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}



/**
 * Generate a printable HTML page and open in a new window for PDF export.
 * Uses browser's built-in print-to-PDF functionality.
 */
export function downloadPDF(filename: string, title: string, headers: string[], rows: (string | number | null | undefined)[][], options?: { totalRow?: (string | number | null)[] }) {
  const allRows = [headers, ...rows]
  if (options?.totalRow) allRows.push(options.totalRow)
  
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: 'Segoe UI', sans-serif; padding: 20px; }
  h2 { text-align: center; margin-bottom: 5px; }
  p.subtitle { text-align: center; color: #666; margin-bottom: 20px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #2D3748; color: white; padding: 8px 6px; text-align: left; font-weight: 600; }
  td { padding: 6px; border-bottom: 1px solid #E2E8F0; }
  tr:nth-child(even) td { background: #F7FAFC; }
  .total-row td { background: #EDF2F7; font-weight: bold; border-top: 2px solid #A0AEC0; }
  .text-right { text-align: right; }
  @media print { body { padding: 0; } }
</style></head><body>
<h2>${title}</h2>
<p class="subtitle">Xuất ngày: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}</p>
<table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>
${allRows.slice(1).map((row, i) => {
  const isTotal = options?.totalRow && i === allRows.length - 2
  return `<tr class="${isTotal ? 'total-row' : ''}">${row.map((cell, ci) => 
    `<td class="${typeof cell === 'number' ? 'text-right' : ''}">${cell != null ? cell : ''}</td>`
  ).join('')}</tr>`
}).join('')}
</tbody></table></body></html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }
}

/**
 * Download data as XLSX file with professional styling (grid lines, colors, borders)
 * Uses ExcelJS for full style support
 */
export async function downloadExcel(
  filename: string,
  title: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
  options?: { totalRow?: (string | number | null)[] }
) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ExcelJS = require('exceljs')

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('Dữ liệu', {
    properties: { defaultColWidth: 14 },
    views: [{ showGridLines: true }],
  })

  // --- Colors ---
  const HEADER_BG = 'FF2D3748'
  const HEADER_FONT = 'FFFFFFFF'
  const ALT_ROW_BG = 'FFF7FAFC'
  const TOTAL_ROW_BG = 'FFEDF2F7'
  const BORDER_COLOR = 'FFCBD5E0'
  const TOTAL_BORDER_COLOR = 'FFA0AEC0'
  const ACCENT_BG = 'FFEBF8FF'

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: BORDER_COLOR } },
    bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
    left: { style: 'thin', color: { argb: BORDER_COLOR } },
    right: { style: 'thin', color: { argb: BORDER_COLOR } },
  }

  const totalBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'medium', color: { argb: TOTAL_BORDER_COLOR } },
    bottom: { style: 'medium', color: { argb: TOTAL_BORDER_COLOR } },
    left: { style: 'thin', color: { argb: BORDER_COLOR } },
    right: { style: 'thin', color: { argb: BORDER_COLOR } },
  }

  // --- Row 1: Title ---
  sheet.addRow([title])
  const titleRow = sheet.getRow(1)
  titleRow.height = 32
  titleRow.getCell(1).font = { bold: true, size: 14, name: 'Arial', color: { argb: 'FF1A202C' } }
  titleRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }

  // --- Row 2: Subtitle ---
  const now = new Date()
  const subtitle = `Xuất ngày: ${now.toLocaleDateString('vi-VN')} ${now.toLocaleTimeString('vi-VN')}`
  sheet.addRow([subtitle])
  const subtitleRow = sheet.getRow(2)
  subtitleRow.height = 20
  subtitleRow.getCell(1).font = { size: 9, name: 'Arial', color: { argb: 'FF718096' }, italic: true }

  // --- Row 3: Empty spacer ---
  sheet.addRow([])
  sheet.getRow(3).height = 6

  // --- Row 4: Header ---
  const headerRow = sheet.addRow(headers)
  headerRow.height = 24
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, size: 11, name: 'Arial', color: { argb: HEADER_FONT } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = thinBorder
  })

  // --- Data rows ---
  rows.forEach((row, rowIdx) => {
    const dataRow = sheet.addRow(row.map(c => c != null ? c : ''))
    dataRow.height = 20
    const isAlt = rowIdx % 2 === 1
    dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const val = row[colNumber - 1]
      const isNumber = typeof val === 'number'
      cell.font = { size: 10, name: 'Arial' }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? ALT_ROW_BG : 'FFFFFFFF' } }
      cell.alignment = { horizontal: isNumber ? 'right' : 'left', vertical: 'middle' }
      cell.border = thinBorder
      if (isNumber) {
        cell.numFmt = '#,##0'
      }
    })
  })

  // --- Total row ---
  if (options?.totalRow) {
    const totalRow = sheet.addRow(options.totalRow.map(c => c != null ? c : ''))
    totalRow.height = 22
    totalRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const val = options.totalRow?.[colNumber - 1]
      const isNumber = typeof val === 'number'
      cell.font = { bold: true, size: 10, name: 'Arial' }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TOTAL_ROW_BG } }
      cell.alignment = { horizontal: isNumber ? 'right' : 'left', vertical: 'middle' }
      cell.border = totalBorder
      if (isNumber) {
        cell.numFmt = '#,##0'
      }
    })
  }

  // --- Auto-fit column widths ---
  sheet.columns.forEach((col, i) => {
    let maxLen = String(headers[i] || '').length
    rows.forEach(row => {
      const cellVal = String(row[i] ?? '')
      if (cellVal.length > maxLen) maxLen = cellVal.length
    })
    col.width = Math.min(maxLen + 4, 35)
  })

  // --- Freeze header row ---
  sheet.views = [{ state: 'frozen', ySplit: 4 }]

  // --- Download ---
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.xlsx`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
