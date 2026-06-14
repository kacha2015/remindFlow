'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ReminderStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Clock, XCircle } from 'lucide-react'

interface Props {
  reminderId: string
  currentStatus: ReminderStatus
}

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
      <h3 className="font-semibold text-gray-900 mb-3">Enable / Disable</h3>
      <div className="flex flex-wrap gap-2">
        {status !== 'sent' && (
          <>
            <Button
              variant={status === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleUpdate('pending')}
              loading={loading && status !== 'pending'}
              disabled={loading || status === 'pending'}
            >
              <Clock className="h-4 w-4" />
              Enable
            </Button>
            <Button
              variant={status === 'cancelled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleUpdate('cancelled')}
              loading={loading && status !== 'cancelled'}
              disabled={loading || status === 'cancelled'}
            >
              <XCircle className="h-4 w-4" />
              Disable
            </Button>
          </>
        )}
        {status === 'sent' && <p className="text-sm text-gray-500">Sent reminders can’t be re-enabled.</p>}
      </div>
    </div>
  )
}
