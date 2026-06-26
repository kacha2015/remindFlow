import { NextRequest, NextResponse } from 'next/server'
import { isTurnstileEnabled, verifyTurnstileToken } from '@/lib/turnstile'

export async function POST(request: NextRequest) {
  if (!isTurnstileEnabled()) {
    return NextResponse.json({ success: true, disabled: true })
  }

  const { token } = await request.json()

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ success: false, error: 'Missing token' }, { status: 400 })
  }

  const result = await verifyTurnstileToken(token)

  if (!result.success) {
    return NextResponse.json(result, { status: 400 })
  }

  return NextResponse.json(result)
}
