import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/helpers'
import UserListClient from './list-client'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/')

  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage user accounts and access roles"
        action={
          <Link href="/users/new">
            <Button>
              <Plus className="h-4 w-4" />
              New User
            </Button>
          </Link>
        }
      />
      <UserListClient users={users || []} currentUserId={user.id} />
    </div>
  )
}
