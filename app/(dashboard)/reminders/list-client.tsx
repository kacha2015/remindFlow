'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Edit, Trash2, Users, Search } from 'lucide-react'
import type { Reminder } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/helpers'
import { useToast } from '@/components/ui/toast'
import { formatDate, formatTime, getRecurrenceLabel } from '@/lib/utils'

interface Props {
  reminders: Reminder[]
  isAdmin: boolean
}

function statusVariant(status: string) {
  if (status === 'pending') return 'pending'
  if (status === 'sent') return 'sent'
  return 'cancelled'
}

export default function ReminderListClient({ reminders: initial, isAdmin }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [reminders, setReminders] = useState(initial)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const filtered = reminders.filter((r) => {
    const matchSearch =
      !search ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    const res = await fetch(`/api/reminders/${deleteId}`, { method: 'DELETE' })
    setDeleting(false)
    if (res.ok) {
      setReminders((prev) => prev.filter((r) => r.id !== deleteId))
      toast({ title: 'Reminder deleted', variant: 'success' })
    } else {
      toast({ title: 'Error deleting reminder', variant: 'destructive' })
    }
    setDeleteId(null)
    router.refresh()
  }

  return (
    <>
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search reminders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:ring-2 focus:ring-indigo-500 sm:w-40"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="No reminders found"
          description={isAdmin ? 'Create your first reminder to get started.' : 'No reminders assigned to you yet.'}
          action={isAdmin ? <Link href="/reminders/new"><Button size="sm">New Reminder</Button></Link> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((reminder) => (
            <div
              key={reminder.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 hover:border-indigo-200 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{reminder.title}</h3>
                    <Badge variant={statusVariant(reminder.status) as never}>{reminder.status}</Badge>
                    {reminder.recurrence !== 'none' && (
                      <Badge variant="secondary">{getRecurrenceLabel(reminder.recurrence)}</Badge>
                    )}
                  </div>
                  {reminder.description && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-2">{reminder.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">
                      {formatDate(reminder.reminder_date)} at {formatTime(reminder.reminder_time)}
                    </span>
                    {isAdmin && reminder.assigned_users && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {reminder.assigned_users.length} assigned
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/reminders/${reminder.id}`}>
                    <Button variant="outline" size="sm">View</Button>
                  </Link>
                  {isAdmin && (
                    <>
                      <Link href={`/reminders/${reminder.id}/edit`}>
                        <Button variant="ghost" size="icon-sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => setDeleteId(reminder.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete reminder"
        description="Are you sure you want to delete this reminder? This action cannot be undone."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </>
  )
}
