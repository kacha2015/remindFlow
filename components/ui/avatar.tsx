import * as React from 'react'
import { cn, getInitials } from '@/lib/utils'

interface AvatarProps {
  name: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
}

const colorMap = [
  'bg-indigo-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-blue-500',
  'bg-teal-500',
  'bg-orange-500',
  'bg-green-500',
  'bg-rose-500',
]

function getColor(name: string) {
  const idx = name.charCodeAt(0) % colorMap.length
  return colorMap[idx]
}

export function Avatar({ name, className, size = 'md' }: AvatarProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded-full font-semibold text-white shrink-0',
        sizeMap[size],
        getColor(name),
        className
      )}
    >
      {getInitials(name)}
    </div>
  )
}
