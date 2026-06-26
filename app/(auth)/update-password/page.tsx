'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Bell, Eye, EyeOff, KeyRound, ArrowLeft, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { updatePasswordSchema, type UpdatePasswordInput } from '@/lib/types/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/helpers'
import { useToast } from '@/components/ui/toast'
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'

type SupabaseAuthCompat = {
  getSessionFromUrl?: (options: { storeSession: boolean }) => Promise<unknown>
  setSession?: (session: { access_token: string; refresh_token: string | null }) => Promise<unknown>
}

export default function UpdatePasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  const [turnstileKey, setTurnstileKey] = useState(0)
  const turnstileEnabled = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED === 'true'
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordInput>({ resolver: zodResolver(updatePasswordSchema) })

  async function onSubmit(data: UpdatePasswordInput) {
    const response = await fetch('/api/auth/update-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await response.json()

    if (!response.ok) {
      toast({ title: 'Error', description: result.error || 'Unable to update password', variant: 'destructive' })
      if (turnstileEnabled) {
        setValue('turnstileToken', '')
        setTurnstileKey((value) => value + 1)
      }
      return
    }

    if (turnstileEnabled) {
      setValue('turnstileToken', '')
      setTurnstileKey((value) => value + 1)
    }

    setSuccess(true)
    toast({ title: 'Password updated!', description: 'Your password has been changed successfully.', variant: 'success' })
    setTimeout(() => router.push('/login'), 2000)
  }

  useEffect(() => {
    const supabase = createClient()
    const auth = supabase.auth as SupabaseAuthCompat

    ;(async () => {
      try {
        if (typeof auth.getSessionFromUrl === 'function') {
          await auth.getSessionFromUrl({ storeSession: true })
        }
      } catch {
        // ignore — getSessionFromUrl throws for invalid/expired tokens
      }

      // Fallback: manually parse the URL hash and call setSession.
      // The hash from Supabase invite looks like:
      // #access_token=...&refresh_token=...&expires_in=3600&token_type=bearer&type=invite
      try {
        const hash = window.location.hash || ''
        if (hash.includes('access_token')) {
          const params = new URLSearchParams(hash.replace(/^#/, ''))
          const access_token = params.get('access_token')
          const refresh_token = params.get('refresh_token')
          if (access_token && typeof auth.setSession === 'function') {
            await auth.setSession({ access_token, refresh_token })
          }
        }
      } catch {
        // ignore
      }
    })()
  }, [])

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Bell className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight">RemindFlow</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight">Set a new<br />password.</h1>
          <p className="text-indigo-200 text-lg">Choose a strong password to keep your account secure.</p>
        </div>
        <p className="text-indigo-300 text-sm">© {new Date().getFullYear()} RemindFlow</p>
      </div>

      {/* Right form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">RemindFlow</span>
          </div>

          {success ? (
            <>
              <div className="flex items-center justify-center mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 text-center">Password updated!</h2>
              <p className="mt-2 text-sm text-gray-500 text-center">
                Redirecting you to sign in...
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900">Update password</h2>
              <p className="mt-1 text-sm text-gray-500">Enter your new password below</p>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
                <FormField label="New password" error={errors.password?.message} required>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      {...register('password')}
                      error={errors.password?.message}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormField>

                <FormField label="Confirm password" error={errors.confirm_password?.message} required>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    autoComplete="new-password"
                    {...register('confirm_password')}
                    error={errors.confirm_password?.message}
                  />
                </FormField>

                <input type="hidden" {...register('turnstileToken')} />

                {turnstileEnabled && (
                  <FormField label="Security check" hint="Complete the Cloudflare Turnstile challenge before updating your password.">
                    <TurnstileWidget
                      key={turnstileKey}
                      enabled={turnstileEnabled}
                      siteKey={turnstileSiteKey}
                      onTokenChange={(token) => setValue('turnstileToken', token || '', { shouldValidate: true })}
                    />
                  </FormField>
                )}

                <Button type="submit" className="w-full mt-2" size="lg" loading={isSubmitting}>
                  <KeyRound className="h-4 w-4" />
                  Update password
                </Button>
              </form>

              <Link
                href="/login"
                className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
