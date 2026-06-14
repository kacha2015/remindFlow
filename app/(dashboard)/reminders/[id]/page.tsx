import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile, Reminder } from '@/lib/types'
import Link from 'next/link'
import { ArrowLeft, Edit, Users, Clock, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { formatDate, formatTime, getRecurrenceLabel } from '@/lib/utils'
import ReminderStatusUpdate from './status-update'

export default async function ReminderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const { id } = await params
  const { data: raw, error } = await supabase
    .from('reminders')
    .select(`*, assigned_users:reminder_users(user:profiles(id, full_name, email, role, is_active, phone_number)), creator:profiles!reminders_created_by_fkey(id, full_name, email)`)
    .eq('id', id)
    .single()

  if (error || !raw) notFound()

  const reminder: Reminder = {
    ...(raw as Record<string, unknown>),
    assigned_users: ((raw.assigned_users as { user: Profile }[]) || []).map((ru) => ru.user),
  } as Reminder

  function statusVariant(status: string) {
    if (status === 'pending') return 'pending'
    if (status === 'sent') return 'sent'
    return 'cancelled'
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/reminders">
          <Button variant="ghost" size="icon-sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-gray-900 flex-1 truncate">{reminder.title}</h1>
        {isAdmin && (
          <Link href={`/reminders/${id}/edit`}>
            <Button variant="outline" size="sm">
              <Edit className="h-4 w-4" />
              Edit
            </Button>
          </Link>
        )}
      </div>

      <div className="grid gap-4">
        {/* Main card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Badge variant={statusVariant(reminder.status) as never} className="text-sm">
              {reminder.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
              {reminder.status === 'sent' && <CheckCircle className="h-3 w-3 mr-1" />}
              {reminder.status === 'cancelled' && <XCircle className="h-3 w-3 mr-1" />}
              {reminder.status}
            </Badge>
            {reminder.recurrence !== 'none' && (
              <Badge variant="secondary">
                <RefreshCw className="h-3 w-3 mr-1" />
                {getRecurrenceLabel(reminder.recurrence)}
              </Badge>
            )}
          </div>

          {reminder.description && (
            <p className="text-gray-600 mb-6 leading-relaxed">{reminder.description}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date</p>
              <p className="font-semibold text-gray-900">{formatDate(reminder.reminder_date)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Time</p>
              <p className="font-semibold text-gray-900">{formatTime(reminder.reminder_time)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Recurrence</p>
              <p className="font-semibold text-gray-900">{getRecurrenceLabel(reminder.recurrence)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Created by</p>
              <p className="font-semibold text-gray-900">{reminder.creator?.full_name || 'Unknown'}</p>
            </div>
          </div>
        </div>

        {/* Admin: enable/disable */}
        {isAdmin && <ReminderStatusUpdate reminderId={id} currentStatus={reminder.status} />}

        {/* Assigned users */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            Assigned Users ({reminder.assigned_users?.length || 0})
          </h3>
          {!reminder.assigned_users || reminder.assigned_users.length === 0 ? (
            <p className="text-sm text-gray-500">No users assigned</p>
          ) : (
            <div className="space-y-3">
              {reminder.assigned_users.map((u) => (
                <div key={u.id} className="flex items-center gap-3">
                  <Avatar name={u.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{u.full_name}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.phone_number && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {u.phone_number}
                      </span>
                    )}
                    <Badge variant={u.role === 'admin' ? 'admin' : 'user'}>{u.role}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
