export type Role = 'admin' | 'user'
export type ReminderStatus = 'pending' | 'sent' | 'cancelled'
export type RecurrenceType = 'none' | 'hourly' | 'daily' | 'weekly' | 'monthly'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone_number: string | null
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Reminder {
  id: string
  title: string
  description: string | null
  reminder_date: string
  reminder_time: string
  timezone: string
  status: ReminderStatus
  recurrence: RecurrenceType
  created_by: string | null
  created_at: string
  updated_at: string
  assigned_users?: Profile[]
  creator?: Profile | null
}

export interface ReminderUser {
  reminder_id: string
  user_id: string
}

export interface DashboardStats {
  total: number
  pending: number
  sent: number
  cancelled: number
}

export interface ReminderFilters {
  status?: ReminderStatus | 'all'
  dateFrom?: string
  dateTo?: string
  assignedUser?: string
  recurrence?: RecurrenceType | 'all'
  search?: string
}
