'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  icon: ReactNode
  label: string
  value: ReactNode
  tone?: 'indigo' | 'green' | 'purple' | 'gray'
}

const toneMap = {
  indigo: 'bg-indigo-100 text-indigo-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  gray: 'bg-gray-100 text-gray-600',
}

export default function ProfileDetailItem({ icon, label, value, tone = 'indigo' }: Props) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', toneMap[tone])}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <div className="mt-1 text-sm font-medium text-gray-900 break-words">{value}</div>
      </div>
    </div>
  )
}
