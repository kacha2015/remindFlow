import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile, Reminder, DashboardStats } from '@/lib/types'
import { Bell, CheckCircle, Clock, XCircle, Users } from 'lucide-react'
import { StatCard } from '@/components/ui/helpers'
import { Badge } from '@/components/ui/badge'
import { formatDate, formatTime, getStatusColor, getRecurrenceLabel, cn } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

async function getStats(supabase: Awaited<ReturnType<typeof createClient>>, isAdmin: boolean, userId: string) {
  if (isAdmin) {
    const { data } = await supabase.from('reminders').select('status')
    const reminders = data || []
    return {
      total: reminders.length,
      pending: reminders.filter((r) => r.status === 'pending').length,
      sent: reminders.filter((r) => r.status === 'sent').length,
      cancelled: reminders.filter((r) => r.status === 'cancelled').length,
    } as DashboardStats
  } else {
    const { data } = await supabase
      .from('reminders')
      .select('status, reminder_users!inner(user_id)')
      .eq('reminder_users.user_id', userId)
    const reminders = data || []
    return {
      total: reminders.length,
      pending: reminders.filter((r) => r.status === 'pending').length,
      sent: reminders.filter((r) => r.status === 'sent').length,
      cancelled: reminders.filter((r) => r.status === 'cancelled').length,
    } as DashboardStats
  }
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; dateFrom?: string; dateTo?: string; user?: string; recurrence?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const isAdmin = profile.role === 'admin'
  const params = await searchParams

  const stats = await getStats(supabase, isAdmin, user.id)

  // Build query for reminders list
  let query = supabase
    .from('reminders')
    .select(`
      *,
      assigned_users:reminder_users(
        user:profiles(id, full_name, email, role)
      ),
      creator:profiles!reminders_created_by_fkey(id, full_name)
    `)
    .order('reminder_date', { ascending: false })
    .limit(20)

  if (!isAdmin) {
    query = supabase
      .from('reminders')
      .select(`
        *,
        assigned_users:reminder_users!inner(
          user_id,
          user:profiles(id, full_name, email, role)
        ),
        creator:profiles!reminders_created_by_fkey(id, full_name)
      `)
      .eq('reminder_users.user_id', user.id)
      .order('reminder_date', { ascending: false })
      .limit(20)
  }

  if (params.status && params.status !== 'all') {
    query = query.eq('status', params.status)
  }
  if (params.dateFrom) query = query.gte('reminder_date', params.dateFrom)
  if (params.dateTo) query = query.lte('reminder_date', params.dateTo)
  if (params.recurrence && params.recurrence !== 'all') {
    query = query.eq('recurrence', params.recurrence)
  }

  const { data: remindersRaw } = await query
  const reminders: Reminder[] = (remindersRaw || []).map((r: Record<string, unknown>) => ({
    ...r,
    assigned_users: ((r.assigned_users as { user: Profile }[]) || []).map((ru) => ru.user),
  })) as Reminder[]

  // Admin: load users list for filter
  let usersList: Pick<Profile, 'id' | 'full_name'>[] = []
  if (isAdmin) {
    const { data } = await supabase.from('profiles').select('id, full_name').eq('is_active', true)
    usersList = (data || []) as Pick<Profile, 'id' | 'full_name'>[]
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdmin ? 'Full reminder history and overview' : 'Your assigned reminders'}
          </p>
        </div>
        {isAdmin && (
          <Link href="/reminders/new">
            <Button>
              <Bell className="h-4 w-4" />
              New Reminder
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Reminders"
          value={stats.total}
          icon={<Bell className="h-4 w-4" />}
          color="indigo"
        />
        <StatCard
          title="Pending"
          value={stats.pending}
          icon={<Clock className="h-4 w-4" />}
          color="yellow"
        />
        <StatCard
          title="Sent"
          value={stats.sent}
          icon={<CheckCircle className="h-4 w-4" />}
          color="green"
        />
        <StatCard
          title="Cancelled"
          value={stats.cancelled}
          icon={<XCircle className="h-4 w-4" />}
          color="red"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <form className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
            <select
              name="status"
              defaultValue={params.status || 'all'}
              className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="sent">Sent</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recurrence</label>
            <select
              name="recurrence"
              defaultValue={params.recurrence || 'all'}
              className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All types</option>
              <option value="none">One-time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">From</label>
            <input
              type="date"
              name="dateFrom"
              defaultValue={params.dateFrom || ''}
              className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">To</label>
            <input
              type="date"
              name="dateTo"
              defaultValue={params.dateTo || ''}
              className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {isAdmin && usersList.length > 0 && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">User</label>
              <select
                name="user"
                defaultValue={params.user || ''}
                className="h-8 rounded-lg border border-gray-300 bg-white px-2 text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All users</option>
                {usersList.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            className="h-8 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Filter
          </button>
          <a href="/" className="h-8 px-3 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 flex items-center">
            Reset
          </a>
        </form>
      </div>

      {/* Reminders Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">
            {isAdmin ? 'All Reminders' : 'My Reminders'}
          </h2>
          <Link href="/reminders" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            View all →
          </Link>
        </div>

        {reminders.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Bell className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">No reminders found</p>
            <p className="text-xs text-gray-500 mt-1">
              {isAdmin ? 'Create your first reminder to get started.' : 'No reminders have been assigned to you yet.'}
            </p>
            {isAdmin && (
              <Link href="/reminders/new" className="mt-4">
                <Button size="sm">New Reminder</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Date & Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Recurrence</th>
                  {isAdmin && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Assigned</th>
                  )}
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reminders.map((reminder) => (
                  <tr key={reminder.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900 truncate max-w-[200px]">{reminder.title}</p>
                      {reminder.description && (
                        <p className="text-xs text-gray-500 truncate max-w-[200px] mt-0.5">{reminder.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-gray-900">{formatDate(reminder.reminder_date)}</p>
                      <p className="text-xs text-gray-500">{formatTime(reminder.reminder_time)}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', getStatusColor(reminder.status))}>
                        {reminder.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {getRecurrenceLabel(reminder.recurrence)}
                    </td>
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5 text-gray-400" />
                          <span className="text-gray-600">{reminder.assigned_users?.length || 0}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/reminders/${reminder.id}`}
                        className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
