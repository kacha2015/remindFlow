import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'
import ReminderForm from '@/components/reminders/ReminderForm'
import { PageHeader } from '@/components/ui/helpers'

export default async function NewReminderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/')

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active')
    .eq('is_active', true)
    .order('full_name')

  return (
    <div className="max-w-2xl">
      <PageHeader title="New Reminder" description="Create a new reminder and assign it to users" />
      <ReminderForm users={(users || []) as Profile[]} />
    </div>
  )
}
