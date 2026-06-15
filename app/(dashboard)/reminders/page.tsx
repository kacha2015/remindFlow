import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/helpers'
import ReminderListClient from './list-client'

export default async function RemindersPage() {
  const supabase = await createClient()
  const admin = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const isAdmin = profile.role === 'admin'

  let query = admin
    .from('reminders')
    .select(`*, assigned_users:reminder_users(user:profiles(id, full_name, email, role, is_active))`)
    .order('reminder_date', { ascending: false })

  if (!isAdmin) {
    query = admin
      .from('reminders')
      .select(`*, assigned_users:reminder_users!inner(user_id, user:profiles(id, full_name, email, role, is_active))`)
      .or(`created_by.eq.${user.id},reminder_users.user_id.eq.${user.id}`)
      .order('reminder_date', { ascending: false })
  }

  const { data: raw } = await query
  const reminders = (raw || []).map((r: Record<string, unknown>) => ({
    ...r,
    assigned_users: ((r.assigned_users as { user: unknown }[]) || []).map((ru) => ru.user),
  }))

  return (
    <div>
      <PageHeader
        title="Reminders"
        description={isAdmin ? 'Manage all reminders and notifications' : 'Your assigned reminders'}
        action={
          <Link href="/reminders/new">
            <Button>
              <Plus className="h-4 w-4" />
              New Reminder
            </Button>
          </Link>
        }
      />
      <ReminderListClient reminders={reminders as never} isAdmin={isAdmin} userId={user.id} />
    </div>
  )
}
