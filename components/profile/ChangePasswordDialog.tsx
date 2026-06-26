'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff, KeyRound } from 'lucide-react'
import { updatePasswordSchema, type UpdatePasswordInput } from '@/lib/types/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/helpers'
import { useToast } from '@/components/ui/toast'
import { TurnstileWidget } from '@/components/auth/TurnstileWidget'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

export default function ChangePasswordDialog() {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [turnstileKey, setTurnstileKey] = useState(0)
  const turnstileEnabled = process.env.NEXT_PUBLIC_TURNSTILE_ENABLED === 'true'
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || ''

  const {
    register,
    handleSubmit,
    reset,
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

    toast({ title: 'Password updated!', variant: 'success' })
    setOpen(false)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <KeyRound className="h-4 w-4" />
          Change Password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
          <DialogDescription>Enter your new password below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            <FormField label="Security check" hint="Complete the Cloudflare Turnstile challenge before saving.">
              <TurnstileWidget
                key={turnstileKey}
                enabled={turnstileEnabled}
                siteKey={turnstileSiteKey}
                onTokenChange={(token) => setValue('turnstileToken', token || '', { shouldValidate: true })}
              />
            </FormField>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
