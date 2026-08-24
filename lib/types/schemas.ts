import { z } from 'zod'

// Teléfono en formato E.164. El campo es opcional: los forms mandan ''
// cuando está vacío, así que lo normalizamos a null.
const E164 = /^\+[1-9]\d{7,14}$/

const phoneNumberSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    const trimmed = (value ?? '').trim()
    return trimmed === '' ? null : trimmed
  })
  .refine((value) => value === null || E164.test(value), {
    message: 'Use international format, e.g. +5491123456789',
  })

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  turnstileToken: z.string().optional(),
})

export const signupSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone_number: phoneNumberSchema,
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
})

export const profileSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  phone_number: phoneNumberSchema,
  role: z.enum(['admin', 'user']),
  is_active: z.boolean(),
})

export const createUserSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone_number: phoneNumberSchema,
  role: z.enum(['admin', 'user']),
  is_active: z.boolean().default(true),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const reminderSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().optional().nullable(),
  reminder_date: z.string().min(1, 'Date is required'),
  reminder_time: z.string().min(1, 'Time is required'),
  timezone: z.string().default('UTC'),
  status: z.enum(['pending', 'sent', 'cancelled']).default('pending'),
   recurrence: z.enum(['none', 'hourly', 'daily', 'weekly', 'monthly']).default('none'),
  assigned_user_ids: z.array(z.string()).min(1, 'At least one user must be assigned'),
})

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  turnstileToken: z.string().optional(),
})

export const updatePasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string(),
  turnstileToken: z.string().optional(),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ['confirm_password'],
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type ProfileInput = z.infer<typeof profileSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type ReminderInput = z.infer<typeof reminderSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>
