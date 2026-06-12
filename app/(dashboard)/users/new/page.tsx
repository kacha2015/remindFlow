import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageHeader } from '@/components/ui/helpers'
import UserForm from '@/components/users/UserForm'

export default async function NewUserPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/')

  return (
    <div className="max-w-lg">
      <PageHeader title="New User" description="Create a new user account" />
      <UserForm />
    </div>
  )
}
