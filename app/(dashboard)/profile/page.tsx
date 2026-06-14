import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader, StatCard } from '@/components/ui/helpers'
import { formatDate } from '@/lib/utils'
import { Mail, Phone, Shield, Calendar, Bell, ShieldCheck } from 'lucide-react'
import ChangePasswordDialog from '@/components/profile/ChangePasswordDialog'
import ProfileDetailItem from '@/components/profile/ProfileDetailItem'

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
      <PageHeader
        title="My Profile"
        description="Your account, access, and reminder activity"
        action={<ChangePasswordDialog />}
      />

      <Card className="overflow-hidden border-gray-200 shadow-sm">
        <div className="h-28 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-800" />
        <CardContent className="-mt-10 pb-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="flex items-end gap-4">
                <Avatar name={p.full_name} size="lg" className="h-20 w-20 text-xl ring-4 ring-white" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Account</p>
                  <h2 className="mt-1 text-2xl font-bold text-gray-900">{p.full_name}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant={p.role === 'admin' ? 'admin' : 'user'}>{p.role}</Badge>
                    <Badge variant={p.is_active ? 'success' : 'error'}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500 sm:text-right max-w-sm">
                <p className="font-medium text-gray-900">Need a quick change?</p>
                <p>Update your password or review your reminder activity below.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <StatCard
                title="Assigned reminders"
                value={reminderCount ?? 0}
                icon={<Bell className="h-4 w-4" />}
                color="indigo"
              />
              <StatCard
                title="Pending reminders"
                value={pendingCount ?? 0}
                icon={<Calendar className="h-4 w-4" />}
                color="yellow"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ProfileDetailItem
                icon={<Mail className="h-4 w-4" />}
                label="Email"
                value={p.email}
                tone="indigo"
              />
              <ProfileDetailItem
                icon={<Phone className="h-4 w-4" />}
                label="WhatsApp"
                value={p.phone_number || 'Not set'}
                tone={p.phone_number ? 'green' : 'gray'}
              />
              <ProfileDetailItem
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Role"
                value={<span className="capitalize">{p.role}</span>}
                tone="purple"
              />
              <ProfileDetailItem
                icon={<Calendar className="h-4 w-4" />}
                label="Joined"
                value={formatDate(p.created_at)}
                tone="gray"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
