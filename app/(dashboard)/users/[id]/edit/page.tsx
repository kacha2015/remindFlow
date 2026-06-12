import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/lib/types'
import { PageHeader } from '@/components/ui/helpers'
import UserForm from '@/components/users/UserForm'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/')

  const { id } = await params
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
  if (error || !data) notFound()

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/users">
          <Button variant="ghost" size="icon-sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <PageHeader title="Edit User" description="Update user information" className="mb-0 flex-1" />
      </div>
      <UserForm user={data as Profile} />
    </div>
  )
}
