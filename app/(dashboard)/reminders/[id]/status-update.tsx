'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ReminderStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

interface Props {
  reminderId: string
  currentStatus: ReminderStatus
}

const statuses: { value: ReminderStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'pending', label: 'Pending', icon: <Clock className="h-4 w-4" /> },
  { value: 'sent', label: 'Sent', icon: <CheckCircle className="h-4 w-4" /> },
  { value: 'cancelled', label: 'Cancelled', icon: <XCircle className="h-4 w-4" /> },
]

export default function ReminderStatusUpdate({ reminderId, currentStatus }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [status, setStatus] = useState<ReminderStatus>(currentStatus)
  const [loading, setLoading] = useState(false)

  async function handleUpdate(newStatus: ReminderStatus) {
    if (newStatus === status) return
    setLoading(true)
    const res = await fetch(`/api/reminders/${reminderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setLoading(false)
    if (res.ok) {
      setStatus(newStatus)
      toast({ title: 'Status updated', variant: 'success' })
      router.refresh()
    } else {
      toast({ title: 'Failed to update status', variant: 'destructive' })
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-3">Update Status</h3>
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <Button
            key={s.value}
            variant={status === s.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleUpdate(s.value)}
            loading={loading && status !== s.value}
            disabled={loading}
            className={
              status === s.value
                ? s.value === 'sent'
                  ? 'bg-green-600 hover:bg-green-700'
                  : s.value === 'cancelled'
                  ? 'bg-red-600 hover:bg-red-700'
                  : ''
                : ''
            }
          >
            {s.icon}
            {s.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
