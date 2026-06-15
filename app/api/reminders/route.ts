import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/reminders
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const recurrence = searchParams.get('recurrence')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = adminClient
    .from('reminders')
    .select(`
      *,
      assigned_users:reminder_users(
        user:profiles(id, full_name, email, phone_number, role, is_active)
      ),
      creator:profiles!reminders_created_by_fkey(id, full_name, email)
    `)
    .order('reminder_date', { ascending: false })
    .limit(limit)

  if (profile.role !== 'admin') {
    query = adminClient
      .from('reminders')
      .select(`
        *,
        assigned_users:reminder_users!inner(
          user_id,
          user:profiles(id, full_name, email, phone_number, role, is_active)
        ),
        creator:profiles!reminders_created_by_fkey(id, full_name, email)
      `)
      .or(`created_by.eq.${user.id},reminder_users.user_id.eq.${user.id}`)
      .order('reminder_date', { ascending: false })
      .limit(limit)
  }

  if (status && status !== 'all') query = query.eq('status', status)
  if (dateFrom) query = query.gte('reminder_date', dateFrom)
  if (dateTo) query = query.lte('reminder_date', dateTo)
  if (recurrence && recurrence !== 'all') query = query.eq('recurrence', recurrence)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const reminders = (data || []).map((r: Record<string, unknown>) => ({
    ...r,
    assigned_users: ((r.assigned_users as { user: unknown }[]) || []).map((ru) => ru.user),
  }))

  return NextResponse.json({ reminders })
}

// POST /api/reminders
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { assigned_user_ids, ...reminderData } = body

  const { data: reminder, error } = await adminClient
    .from('reminders')
    .insert({ ...reminderData, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Insert assigned users
  if (assigned_user_ids && assigned_user_ids.length > 0) {
    const { error: ruError } = await adminClient.from('reminder_users').insert(
      assigned_user_ids.map((uid: string) => ({ reminder_id: reminder.id, user_id: uid }))
    )
    if (ruError) return NextResponse.json({ error: ruError.message }, { status: 500 })
  }

  return NextResponse.json({ reminder }, { status: 201 })
}
