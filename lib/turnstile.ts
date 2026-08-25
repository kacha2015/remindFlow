const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export function isTurnstileEnabled() {
  return process.env.TURNSTILE_ENABLED === 'true'
}

export async function verifyTurnstileToken(token: string | null | undefined, ipAddress?: string) {
  if (!isTurnstileEnabled()) {
    return { success: true }
  }

  // .trim(): un salto de línea o espacio pegado al copiar la clave en el panel
  // del hosting hace que Cloudflare responda invalid-input-secret.
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) {
    console.error('[turnstile] TURNSTILE_SECRET_KEY no está seteada')
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

  // Cloudflare devuelve 400 (no 200) cuando el secret es inválido, con el
  // detalle en error-codes: hay que leer el body igual que en el caso 200.
  const raw = await response.text()
  let result: { success?: boolean; 'error-codes'?: string[] } | null = null
  try {
    result = JSON.parse(raw)
  } catch {
    console.error('[turnstile] siteverify respondió HTTP', response.status, 'con body no-JSON:', raw)
    return { success: false, error: 'Turnstile verification failed' }
  }

  if (!result?.success) {
    const code = result?.['error-codes']?.[0]
    console.error('[turnstile] verificación rechazada (HTTP', response.status + '):', raw)
    return { success: false, error: code || 'Turnstile verification failed' }
  }

  return { success: true }
}
