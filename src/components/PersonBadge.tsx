'use client'

import { Badge } from '@/components/ui/badge'
import { Shield } from 'lucide-react'

interface PersonBadgeProps {
  personType: 'student' | 'teacher' | 'guest' | string
  isVip?: boolean
}

export default function PersonBadge({ personType, isVip }: PersonBadgeProps) {
  if (isVip) {
    return (
      <Badge className="text-[10px] bg-amber-500 hover:bg-amber-600 text-white">
        <Shield className="h-2.5 w-2.5 mr-0.5" /> VIP
      </Badge>
    )
  }

  switch (personType) {
    case 'student':
      return (
        <Badge variant="outline" className="text-[10px] border-teal-300 text-teal-700 bg-teal-50 dark:border-teal-500 dark:text-teal-300 dark:bg-teal-950/40">
          SV
        </Badge>
      )
    case 'teacher':
      return (
        <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-500 dark:text-amber-300 dark:bg-amber-950/40">
          GV
        </Badge>
      )
    default:
      return (
        <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600 bg-slate-50 dark:border-slate-500 dark:text-slate-300 dark:bg-slate-800/60">
          Khách
        </Badge>
      )
  }
}
