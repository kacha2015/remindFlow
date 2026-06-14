'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, X, Users, UserMinus } from 'lucide-react'
import { reminderSchema, type ReminderInput } from '@/lib/types/schemas'
import type { Profile, Reminder } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { FormField } from '@/components/ui/helpers'
import { Avatar } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast'

interface Props {
  users: Profile[]
  reminder?: Reminder
}

export default function ReminderForm({ users, reminder }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const isEdit = !!reminder

  // Auto-detect browser timezone (e.g. "America/Argentina/Buenos_Aires")
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  const defaultAssigned = reminder?.assigned_users?.map((u) => u.id) || []
  const [selectedUsers, setSelectedUsers] = useState<string[]>(defaultAssigned)
  const [userSearch, setUserSearch] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReminderInput>({
    resolver: zodResolver(reminderSchema) as never,
    defaultValues: {
      title: reminder?.title || '',
      description: reminder?.description || '',
      reminder_date: reminder?.reminder_date || '',
      reminder_time: reminder?.reminder_time?.slice(0, 5) || '',
      timezone: reminder?.timezone || browserTimezone,
      status: reminder?.status || 'pending',
      recurrence: reminder?.recurrence || 'none',
      assigned_user_ids: defaultAssigned,
    },
  })

  function toggleUser(uid: string) {
    setSelectedUsers((prev) => {
      const updated = prev.includes(uid)
        ? prev.filter((id) => id !== uid)
        : [...prev, uid]
      // Sync con react-hook-form para que Zod valide correctamente
      setValue('assigned_user_ids', updated, { shouldValidate: true })
      return updated
    })
  }

  const filteredUsers = users.filter((u) =>
    !userSearch || u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  )

  const allSelected = filteredUsers.length > 0 && filteredUsers.every((u) => selectedUsers.includes(u.id))

  function toggleAll() {
    if (allSelected) {
      const filteredIds = filteredUsers.map((u) => u.id)
      setSelectedUsers((prev) => {
        const updated = prev.filter((id) => !filteredIds.includes(id))
        setValue('assigned_user_ids', updated, { shouldValidate: true })
        return updated
      })
    } else {
      const filteredIds = filteredUsers.map((u) => u.id)
      setSelectedUsers((prev) => {
        const updated = [...new Set([...prev, ...filteredIds])]
        setValue('assigned_user_ids', updated, { shouldValidate: true })
        return updated
      })
    }
  }

  async function onSubmit(data: ReminderInput) {
    const payload = { ...data, assigned_user_ids: selectedUsers }

    const url = isEdit ? `/api/reminders/${reminder!.id}` : '/api/reminders'
    const method = isEdit ? 'PATCH' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const { reminder: saved } = await res.json()
      toast({
        title: isEdit ? 'Reminder updated!' : 'Reminder created!',
        variant: 'success',
      })
      router.push(`/reminders/${saved.id}`)
      router.refresh()
    } else {
      const { error } = await res.json()
      toast({ title: 'Error', description: error, variant: 'destructive' })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      <FormField label="Title" error={errors.title?.message} required>
        <Input placeholder="Reminder title..." {...register('title')} error={errors.title?.message} />
      </FormField>

      <FormField label="Description" error={errors.description?.message}>
        <Textarea
          placeholder="Optional description..."
          rows={3}
          {...register('description')}
        />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Date" error={errors.reminder_date?.message} required>
          <Input type="date" {...register('reminder_date')} error={errors.reminder_date?.message} />
        </FormField>

        <FormField label="Time" error={errors.reminder_time?.message} required>
          <Input type="time" {...register('reminder_time')} error={errors.reminder_time?.message} />
        </FormField>
      </div>

      {/* Timezone — oculto pero enviado; se muestra como info */}
      <input type="hidden" {...register('timezone')} />
      <p className="text-xs text-gray-500 -mt-3 flex items-center gap-1">
        <span>🌍</span>
        <span>Timezone: <strong>{browserTimezone}</strong> — the reminder will fire at this local time.</span>
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Status" error={errors.status?.message}>
          <Select {...register('status')}>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </FormField>

        <FormField label="Recurrence" error={errors.recurrence?.message}>
          <Select {...register('recurrence')}>
            <option value="none">No recurrence</option>
            <option value="hourly">Hourly (same day)</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </Select>
        </FormField>
      </div>

      {/* Assigned users */}
      <FormField
        label="Assign Users"
        error={(errors as Record<string, { message?: string }>).assigned_user_ids?.message}
        required
        hint={selectedUsers.length > 0 ? `${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''} selected` : undefined}
      >
        <div className="flex items-center gap-2 mb-2">
          <Input
            placeholder="Search users..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="flex-1"
          />
          <Button
            type="button"
            variant={allSelected ? 'destructive' : 'outline'}
            size="sm"
            onClick={toggleAll}
            className="shrink-0"
          >
            {allSelected ? (
              <>
                <UserMinus className="h-4 w-4" />
                Deselect all
              </>
            ) : (
              <>
                <Users className="h-4 w-4" />
                Select all
              </>
            )}
          </Button>
        </div>
        <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-100">
          {filteredUsers.length === 0 ? (
            <p className="text-sm text-gray-500 p-3 text-center">No users found</p>
          ) : (
            filteredUsers.map((u) => {
              const selected = selectedUsers.includes(u.id)
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleUser(u.id)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors ${selected ? 'bg-indigo-50' : ''}`}
                >
                  <Avatar name={u.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{u.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  </div>
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                    {selected && <Check className="h-3 w-3 text-white" />}
                  </div>
                </button>
              )
            })
          )}
        </div>
      </FormField>

      {/* Selected users preview */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map((uid) => {
            const u = users.find((usr) => usr.id === uid)
            if (!u) return null
            return (
              <span
                key={uid}
                className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-1"
              >
                {u.full_name}
                <button type="button" onClick={() => toggleUser(uid)} className="hover:text-indigo-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-gray-100">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          {isEdit ? 'Save Changes' : 'Create Reminder'}
        </Button>
      </div>
    </form>
  )
}
