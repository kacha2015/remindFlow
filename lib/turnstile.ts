const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export function isTurnstileEnabled() {
  return (process.env.TURNSTILE_ENABLED ?? process.env.NEXT_PUBLIC_TURNSTILE_ENABLED ?? 'false') === 'true'
}

export async function verifyTurnstileToken(token: string | null | undefined, ipAddress?: string) {
  if (!isTurnstileEnabled()) {
    return { success: true }
  }

  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    return { success: false, error: 'Turnstile secret key is missing' }
  }

  if (!token) {
    return { success: false, error: 'Turnstile verification is required' }
  }

  const body = new URLSearchParams({
    secret,
    response: token,
  })

  if (ipAddress) {
    body.set('remoteip', ipAddress)
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    body,
  })

  if (!response.ok) {
    return { success: false, error: 'Turnstile verification failed' }
  }

  const result = await response.json() as { success?: boolean; 'error-codes'?: string[] }

  if (!result.success) {
    return {
      success: false,
      error: result['error-codes']?.[0] || 'Turnstile verification failed',
    }
  }

  return { success: true }
}
