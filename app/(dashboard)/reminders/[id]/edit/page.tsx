import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile, Reminder } from '@/lib/types'
import ReminderForm from '@/components/reminders/ReminderForm'
import { PageHeader } from '@/components/ui/helpers'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function EditReminderPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/')

  const { id } = await params

  const { data: raw, error } = await supabase
    .from('reminders')
    .select(`*, assigned_users:reminder_users(user:profiles(id, full_name, email, role, is_active))`)
    .eq('id', id)
    .single()

  if (error || !raw) notFound()

  const reminder: Reminder = {
    ...(raw as Record<string, unknown>),
    assigned_users: ((raw.assigned_users as { user: Profile }[]) || []).map((ru) => ru.user),
  } as Reminder

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, is_active')
    .eq('is_active', true)
    .order('full_name')

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/reminders/${id}`}>
          <Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <PageHeader title="Edit Reminder" description="Update reminder details" className="mb-0 flex-1" />
      </div>
      <ReminderForm
        users={(users || []) as Profile[]}
        reminder={reminder}
      />
    </div>
  )
}
