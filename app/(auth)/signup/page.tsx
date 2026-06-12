'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Bell, Eye, EyeOff, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { signupSchema, type SignupInput } from '@/lib/types/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/helpers'
import { useToast } from '@/components/ui/toast'

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({ resolver: zodResolver(signupSchema) })

  async function onSubmit(data: SignupInput) {
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          phone_number: data.phone_number || null,
          role: 'user',
        },
      },
    })

    if (error) {
      toast({ title: 'Signup failed', description: error.message, variant: 'destructive' })
      return
    }

    toast({
      title: 'Account created!',
      description: 'Check your email to confirm your account.',
      variant: 'success',
    })
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Bell className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight">RemindFlow</span>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight">Start managing<br />smarter reminders.</h1>
          <p className="text-indigo-200 text-lg">Join your team on RemindFlow and never miss an important event again.</p>
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

          <h2 className="text-2xl font-bold text-gray-900">Create an account</h2>
          <p className="mt-1 text-sm text-gray-500">Fill in your details to get started</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <FormField label="Full name" error={errors.full_name?.message} required>
              <Input placeholder="Jane Doe" {...register('full_name')} error={errors.full_name?.message} />
            </FormField>

            <FormField label="Email address" error={errors.email?.message} required>
              <Input type="email" placeholder="you@example.com" {...register('email')} error={errors.email?.message} />
            </FormField>

            <FormField label="Phone number (WhatsApp)" error={errors.phone_number?.message} hint="Used for WhatsApp notifications. Include country code, e.g. +1234567890">
              <Input type="tel" placeholder="+1 555 000 0000" {...register('phone_number')} />
            </FormField>

            <FormField label="Password" error={errors.password?.message} required>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
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
                {...register('confirm_password')}
                error={errors.confirm_password?.message}
              />
            </FormField>

            <Button type="submit" className="w-full mt-2" size="lg" loading={isSubmitting}>
              <UserPlus className="h-4 w-4" />
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
