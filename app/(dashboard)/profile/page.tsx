import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/ui/helpers'
import { formatDate } from '@/lib/utils'
import { Mail, Phone, Shield, Calendar, User } from 'lucide-react'
import ChangePasswordDialog from '@/components/profile/ChangePasswordDialog'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const p = profile as Profile

  // Count assigned reminders
  const { count: reminderCount } = await supabase
    .from('reminder_users')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  const { count: pendingCount } = await supabase
    .from('reminders')
    .select('*, reminder_users!inner(user_id)', { count: 'exact', head: true })
    .eq('reminder_users.user_id', user.id)
    .eq('status', 'pending')

  return (
    <div className="max-w-2xl">
      <PageHeader title="My Profile" description="Your account information" />

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 h-24 relative" />
        <div className="px-6 pb-6">
          <div className="-mt-10 mb-4">
            <Avatar name={p.full_name} size="lg" className="h-20 w-20 text-xl ring-4 ring-white" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{p.full_name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={p.role === 'admin' ? 'admin' : 'user'}>{p.role}</Badge>
                <Badge variant={p.is_active ? 'success' : 'error'}>
                  {p.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>
            <ChangePasswordDialog />
          </div>

          {/* Info grid */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100">
                <Mail className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900 truncate">{p.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
                <Phone className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">WhatsApp</p>
                <p className="text-sm font-medium text-gray-900">{p.phone_number || '—'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-100">
                <Shield className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Role</p>
                <p className="text-sm font-medium text-gray-900 capitalize">{p.role}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                <Calendar className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Joined</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(p.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-indigo-600" />
            <p className="text-sm font-medium text-gray-500">Total Assigned</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{reminderCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">reminders assigned to you</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-yellow-600" />
            <p className="text-sm font-medium text-gray-500">Pending</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{pendingCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">awaiting notification</p>
        </div>
      </div>
    </div>
  )
}
