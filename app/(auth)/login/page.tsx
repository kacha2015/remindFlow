"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Bell, Eye, EyeOff, LogIn } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { loginSchema, type LoginInput } from '@/lib/types/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/helpers'
import { useToast } from '@/components/ui/toast'

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  async function onSubmit(data: LoginInput) {
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      toast({ title: 'Login failed', description: error.message, variant: 'destructive' })
      return
    }

    router.push('/')
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

        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-tight">
            Manage reminders.<br />Never miss a moment.
          </h1>
          <p className="text-indigo-200 text-lg leading-relaxed">
            Schedule, assign and track reminders with automatic notifications via email and WhatsApp.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { label: 'Email + WhatsApp', desc: 'Multi-channel alerts' },
              { label: 'Recurring', desc: 'Daily, weekly, monthly' },
              { label: 'Team assign', desc: 'Multi-user reminders' },
              { label: 'Role-based', desc: 'Admin & user access' },
            ].map((f) => (
              <div key={f.label} className="rounded-xl bg-white/10 p-4">
                <p className="font-semibold">{f.label}</p>
                <p className="text-sm text-indigo-200">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-indigo-300 text-sm">© {new Date().getFullYear()} RemindFlow</p>
      </div>

      {/* Right login form */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">RemindFlow</span>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>

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

            <FormField label="Password" error={errors.password?.message} required>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
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

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-500">
                Forgot password 1?
              </Link>
            </div>

            <Button type="submit" className="w-full mt-2" size="lg" loading={isSubmitting}>
              <LogIn className="h-4 w-4" />
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
