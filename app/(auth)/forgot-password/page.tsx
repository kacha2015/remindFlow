'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Bell, Mail, ArrowLeft, CheckCircle, ShieldAlert } from 'lucide-react'
import Turnstile from 'react-turnstile'
import { createClient } from '@/lib/supabase/client'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/lib/types/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/helpers'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export default function ForgotPasswordPage() {
  const { toast } = useToast()
  const [sent, setSent] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileError, setTurnstileError] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) })

  const turnstileEnabled = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED !== 'false'
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token)
    setTurnstileError(false)
  }, [])

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null)
  }, [])

  const handleTurnstileError = useCallback(() => {
    setTurnstileError(true)
    setTurnstileToken(null)
  }, [])

  async function onSubmit(data: ForgotPasswordInput) {
    if (turnstileEnabled) {
      if (!turnstileToken) {
        toast({ title: 'Verification required', description: 'Please complete the security check.', variant: 'destructive' })
        return
      }

      const verifyRes = await fetch('/api/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken }),
      })

      if (!verifyRes.ok) {
        toast({ title: 'Verification failed', description: 'Security check failed. Please try again.', variant: 'destructive' })
        setTurnstileToken(null)
        return
      }
    }

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      return
    }

    setSent(true)
  }

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
          <h1 className="text-4xl font-bold leading-tight">Forgot your<br />password?</h1>
          <p className="text-indigo-200 text-lg">No worries. Enter your email and we&apos;ll send you a link to reset it.</p>
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

          {sent ? (
            <>
              <div className="flex items-center justify-center mb-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 text-center">Check your email</h2>
              <p className="mt-2 text-sm text-gray-500 text-center">
                We sent a password reset link to your email. Click the link to set a new password.
              </p>
              <p className="mt-4 text-xs text-gray-400 text-center">
                Didn&apos;t receive the email? Check your spam folder or try again.
              </p>
              <Link
                href="/login"
                className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-gray-900">Forgot password?</h2>
              <p className="mt-1 text-sm text-gray-500">Enter your email to receive a reset link</p>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
                <FormField label="Email address" error={errors.email?.message} required>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    {...register('email')}
                    error={errors.email?.message}
                  />
                </FormField>

                {turnstileEnabled && (
                  turnstileSiteKey ? (
                    <div className={cn({ 'border border-red-500 rounded-lg p-1': turnstileError })}>
                      <Turnstile
                        sitekey={turnstileSiteKey}
                        onVerify={handleTurnstileVerify}
                        onExpire={handleTurnstileExpire}
                        onError={handleTurnstileError}
                        theme="light"
                        className="flex justify-center"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-amber-500 flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" />
                      Security check not configured. Contact the administrator.
                    </p>
                  )
                )}
                {turnstileError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <ShieldAlert className="h-3 w-3" />
                    Security check unavailable. Please try again later.
                  </p>
                )}

                <Button type="submit" className="w-full mt-2" size="lg" loading={isSubmitting}>
                  <Mail className="h-4 w-4" />
                  Send reset link
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
