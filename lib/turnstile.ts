export function isTurnstileEnabled(): boolean {
  return process.env.TURNSTILE_ENABLED !== 'false' && process.env.NEXT_PUBLIC_TURNSTILE_ENABLED !== 'false'
}

export async function verifyTurnstileToken(token: string): Promise<{ success: boolean; error?: string }> {
  if (!isTurnstileEnabled()) {
    return { success: true }
  }

  const secretKey = process.env.TURNSTILE_SECRET_KEY
  if (!secretKey) {
    console.error('TURNSTILE_SECRET_KEY is not set')
    return { success: false, error: 'Server configuration error' }
  }

  const formData = new URLSearchParams()
  formData.append('secret', secretKey)
  formData.append('response', token)

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    })

    const data = await res.json()
    return { success: data.success, error: data['error-codes']?.[0] }
  } catch (err) {
    console.error('Turnstile verification failed:', err)
    return { success: false, error: 'Verification request failed' }
  }
}
