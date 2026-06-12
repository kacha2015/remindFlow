'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createUserSchema, profileSchema, type CreateUserInput, type ProfileInput } from '@/lib/types/schemas'
import type { Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { FormField } from '@/components/ui/helpers'
import { useToast } from '@/components/ui/toast'

interface Props {
  user?: Profile
}

export default function UserForm({ user }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const isEdit = !!user
  const [isActive, setIsActive] = useState(user?.is_active ?? true)

  // Different schema for create vs edit
  const schema = isEdit ? profileSchema : createUserSchema

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput | ProfileInput>({
    resolver: zodResolver(schema as never),
    defaultValues: isEdit
      ? {
          full_name: user.full_name,
          phone_number: user.phone_number || '',
          role: user.role,
          is_active: user.is_active,
        }
      : {
          full_name: '',
          email: '',
          phone_number: '',
          role: 'user',
          is_active: true,
          password: '',
        },
  })

  async function onSubmit(data: CreateUserInput | ProfileInput) {
    const payload = { ...data, is_active: isActive }

    const url = isEdit ? `/api/users/${user!.id}` : '/api/users'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      toast({ title: isEdit ? 'User updated!' : 'User created!', variant: 'success' })
      router.push('/users')
      router.refresh()
    } else {
      const { error } = await res.json()
      toast({ title: 'Error', description: error, variant: 'destructive' })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
      <FormField label="Full name" error={errors.full_name?.message} required>
        <Input placeholder="Jane Doe" {...register('full_name')} error={errors.full_name?.message} />
      </FormField>

      {!isEdit && (
        <FormField label="Email address" error={(errors as Record<string, { message?: string }>).email?.message} required>
          <Input
            type="email"
            placeholder="jane@example.com"
            {...register('email' as never)}
            error={(errors as Record<string, { message?: string }>).email?.message}
          />
        </FormField>
      )}

      <FormField label="Phone number (WhatsApp)" error={errors.phone_number?.message} hint="Include country code, e.g. +1234567890">
        <Input type="tel" placeholder="+1 555 000 0000" {...register('phone_number')} />
      </FormField>

      <FormField label="Role" error={errors.role?.message} required>
        <Select {...register('role')}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </Select>
      </FormField>

      {!isEdit && (
        <FormField label="Password" error={(errors as Record<string, { message?: string }>).password?.message} required hint="Minimum 6 characters">
          <Input
            type="password"
            placeholder="••••••••"
            {...register('password' as never)}
            error={(errors as Record<string, { message?: string }>).password?.message}
          />
        </FormField>
      )}

      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div>
          <p className="text-sm font-medium text-gray-900">Active</p>
          <p className="text-xs text-gray-500">Inactive users cannot log in</p>
        </div>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Save Changes' : 'Create User'}
        </Button>
      </div>
    </form>
  )
}
