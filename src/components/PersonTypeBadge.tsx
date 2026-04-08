'use client'

import { Badge } from '@/components/ui/badge'
import { Shield } from 'lucide-react'

// Helper: personType → label
export function personTypeLabel(type: string): string {
  if (type === 'student') return 'Sinh viên'
  if (type === 'teacher') return 'Giảng viên'
  return 'Khách'
}

// Badge component
export function PersonTypeBadge({ personType, size = 'sm' }: { personType: string; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'text-[10px]' : 'text-xs'

  if (personType === 'student') {
    return <Badge variant="outline" className={`${sizeClass} border-teal-300 text-teal-700 bg-teal-50 dark:border-teal-600 dark:text-teal-300 dark:bg-teal-950/40`}>SV</Badge>
  }
  if (personType === 'teacher') {
    return <Badge variant="outline" className={`${sizeClass} border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-500 dark:text-amber-300 dark:bg-amber-950/40`}>GV</Badge>
  }
  return <Badge variant="outline" className={`${sizeClass} border-slate-300 text-slate-500 bg-slate-50 dark:border-zinc-400 dark:text-zinc-200 dark:bg-zinc-800/60`}>Khách</Badge>
}

// VIP badge
export function VipBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'text-[10px]' : 'text-xs'
  return <Badge className={`${sizeClass} bg-amber-500 hover:bg-amber-600 text-white`}><Shield className="h-2.5 w-2.5 mr-0.5" /> VIP</Badge>
}
