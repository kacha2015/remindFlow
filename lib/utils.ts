import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string, timezone?: string): string {
  // dateStr = 'YYYY-MM-DD', tratamos como medianoche local del timezone del reminder
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...(timezone ? { timeZone: timezone } : {}),
  })
}

export function formatTime(timeStr: string, timezone?: string): string {
  // timeStr = 'HH:MM' o 'HH:MM:SS' — construimos una fecha dummy en UTC
  // y la convertimos al timezone del reminder para mostrar
  const [hours, minutes] = timeStr.split(':')
  const date = new Date()
  date.setHours(parseInt(hours), parseInt(minutes), 0, 0)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(timezone ? { timeZone: timezone } : {}),
  })
}

export function formatDateTime(dateStr: string, timeStr: string, timezone?: string): string {
  return `${formatDate(dateStr, timezone)} at ${formatTime(timeStr, timezone)}`
}

/** Timestamptz ISO ('2026-08-26T14:03:00Z') -> fecha y hora legibles. */
export function formatTimestamp(isoStr: string): string {
  return new Date(isoStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'sent': return 'bg-green-100 text-green-800 border-green-200'
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

export function getRecurrenceLabel(recurrence: string): string {
  switch (recurrence) {
    case 'none': return 'No recurrence'
    case 'every_5_min': return 'Every 5 minutes'
    case 'every_10_min': return 'Every 10 minutes'
    case 'every_15_min': return 'Every 15 minutes'
    case 'every_30_min': return 'Every 30 minutes'
    case 'hourly': return 'Hourly'
    case 'daily': return 'Daily'
    case 'weekly': return 'Weekly'
    case 'monthly': return 'Monthly'
    default: return recurrence
  }
}

/** Normaliza 'HH:MM' o 'HH:MM:SS' a 'HH:MM' para comparar horas. */
export function toHHMM(timeStr: string): string {
  return timeStr.slice(0, 5)
}

/** Texto del rango de un reminder recurrente. */
export function formatDateRange(
  startDate: string,
  endDate: string | null,
  timezone?: string,
  endTime?: string | null
): string {
  const start = formatDate(startDate, timezone)
  if (!endDate) return `${start} — no end date`
  const end = formatDate(endDate, timezone)
  return `${start} — ${end}${endTime ? ` at ${formatTime(endTime, timezone)}` : ''}`
}

/**
 * ¿La ocurrencia cae dentro del rango programado?
 * end_date null => sin límite. end_time null => vale todo el día de end_date.
 */
export function isWithinRange(
  date: string,
  time: string,
  endDate?: string | null,
  endTime?: string | null
): boolean {
  if (!endDate) return true
  if (date > endDate) return false
  if (date < endDate) return true
  return !endTime || toHHMM(time) <= toHHMM(endTime)
}

/**
 * Siguiente ocurrencia de un reminder recurrente.
 * Devuelve null si no hay recurrencia o si la siguiente cae fuera del rango (end_date + end_time).
 */
export function getNextOccurrence(
  dateStr: string,
  timeStr: string,
  recurrence: string,
  endDate?: string | null,
  endTime?: string | null
): { date: string; time: string } | null {
  // timeStr puede venir como 'HH:MM' o 'HH:MM:SS'
  const [h = '00', m = '00', sec = '00'] = timeStr.split(':')
  const date = new Date(`${dateStr}T${h}:${m}:${sec.slice(0, 2)}Z`)

  switch (recurrence) {
    case 'every_5_min':
      date.setUTCMinutes(date.getUTCMinutes() + 5)
      break
    case 'every_10_min':
      date.setUTCMinutes(date.getUTCMinutes() + 10)
      break
    case 'every_15_min':
      date.setUTCMinutes(date.getUTCMinutes() + 15)
      break
    case 'every_30_min':
      date.setUTCMinutes(date.getUTCMinutes() + 30)
      break
    case 'hourly':
      date.setUTCHours(date.getUTCHours() + 1)
      break
    case 'daily':
      date.setUTCDate(date.getUTCDate() + 1)
      break
    case 'weekly':
      date.setUTCDate(date.getUTCDate() + 7)
      break
    case 'monthly':
      date.setUTCMonth(date.getUTCMonth() + 1)
      break
    default:
      return null
  }

  const next = {
    date: date.toISOString().slice(0, 10),
    time: date.toISOString().slice(11, 19),
  }

  // Fuera del rango programado: la serie termina acá
  if (!isWithinRange(next.date, next.time, endDate, endTime)) return null

  return next
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}
