import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/reminders/[id]
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  const { id } = await params

  const { data, error } = await adminClient
    .from('reminders')
    .select(`
      *,
      assigned_users:reminder_users(
        user_id,
        user:profiles(id, full_name, email, phone_number, role, is_active)
      ),
      creator:profiles!reminders_created_by_fkey(id, full_name, email)
    `)
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isAssigned = ((data.assigned_users as { user_id: string }[]) || []).some((ru) => ru.user_id === user.id)
  if (!isAdmin && data.created_by !== user.id && !isAssigned) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const reminder = {
    ...data,
    assigned_users: ((data.assigned_users as { user: unknown }[]) || []).map((ru) => ru.user),
  }

  return NextResponse.json({ reminder })
}

// PATCH /api/reminders/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  // Admins can edit any reminder; regular users can only edit their own
  if (profile.role !== 'admin') {
    const { data: reminder } = await adminClient.from('reminders').select('created_by').eq('id', id).single()
    if (!reminder || reminder.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const body = await request.json()
  const { assigned_user_ids, ...reminderData } = body

  const { data: reminder, error } = await adminClient
    .from('reminders')
    .update(reminderData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update assigned users if provided
  if (Array.isArray(assigned_user_ids)) {
    await adminClient.from('reminder_users').delete().eq('reminder_id', id)
    if (assigned_user_ids.length > 0) {
      await adminClient.from('reminder_users').insert(
        assigned_user_ids.map((uid: string) => ({ reminder_id: id, user_id: uid }))
      )
    }
  }

  return NextResponse.json({ reminder })
}

// DELETE /api/reminders/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  // Admins can delete any reminder; regular users can only delete their own
  if (profile.role !== 'admin') {
    const { data: reminder } = await adminClient.from('reminders').select('created_by').eq('id', id).single()
    if (!reminder || reminder.created_by !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { error } = await adminClient.from('reminders').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
