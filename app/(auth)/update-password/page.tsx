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

export default function UpdatePasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [success, setSuccess] = useState(false)
  const [sessionHandled, setSessionHandled] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UpdatePasswordInput>({ resolver: zodResolver(updatePasswordSchema) })

  async function onSubmit(data: UpdatePasswordInput) {
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password: data.password,
    })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }

    setSuccess(true)
    toast({ title: 'Password updated!', description: 'Your password has been changed successfully.', variant: 'success' })
    setTimeout(() => router.push('/login'), 2000)
  }

  useEffect(() => {
    // When the user opens the password reset / invite link, Supabase includes the
    // access token in the URL. We must parse it so the client establishes the
    // session and `updateUser` works. getSessionFromUrl will consume the token
    // and set the session automatically. If there's no token, it resolves with
    // null — we still mark sessionHandled to allow normal operation.
    const supabase = createClient()

    ;(async () => {
      try {
        // some versions of the supabase client do not include this in the TS types
        // so call it dynamically to avoid type errors
        if (typeof (supabase.auth as any).getSessionFromUrl === 'function') {
          await (supabase.auth as any).getSessionFromUrl({ storeSession: true })
        }
        // If getSessionFromUrl didn't establish a session (or isn't available),
        // try parsing the URL fragment manually and setting the session. Some
        // providers return tokens in the hash (#) and depending on redirect
        // configuration the automatic method may not persist the session.
        const current = window.location.href
        const hash = window.location.hash || ''
        if ((!((supabase.auth as any).getSession && (await (supabase.auth as any).getSession()))) && hash.includes('access_token')) {
          try {
            const params = new URLSearchParams(hash.replace(/^#/, ''))
            const access_token = params.get('access_token')
            const refresh_token = params.get('refresh_token')
            if (access_token) {
              // setSession accepts the token pair and stores it client-side
              if (typeof (supabase.auth as any).setSession === 'function') {
                await (supabase.auth as any).setSession({ access_token, refresh_token })
              }
            }
          } catch (e) {
            // ignore failures here — we'll handle session absence below
          }
        }
      } catch (err: any) {
        // ignore — getSessionFromUrl throws for invalid/expired tokens
      } finally {
        setSessionHandled(true)
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
