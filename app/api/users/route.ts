import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/users
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const isActive = searchParams.get('is_active')
  const role = searchParams.get('role')

  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  if (isActive !== null && isActive !== '') query = query.eq('is_active', isActive === 'true')
  if (role && role !== 'all') query = query.eq('role', role)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ users: data })
}

// POST /api/users  (admin creates a new user)
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { email, password, full_name, phone_number, role: newRole, is_active } = body

  // Use service role to invite the user so Supabase sends the email
  const adminClient = await createAdminClient()
  const { data: authData, error: authError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: { full_name, phone_number: phone_number || null, role: newRole || 'user' },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  // Update profile (trigger creates it, update remaining fields)
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ full_name, phone_number: phone_number || null, role: newRole || 'user', is_active: is_active ?? true })
    .eq('id', authData.user.id)

  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 500 })

  const { data: newProfile } = await adminClient.from('profiles').select('*').eq('id', authData.user.id).single()
  return NextResponse.json({ user: newProfile }, { status: 201 })
}
