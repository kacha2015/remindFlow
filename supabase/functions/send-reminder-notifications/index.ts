// Supabase Edge Function: send-reminder-notifications
// Deploy with: supabase functions deploy send-reminder-notifications
// Triggered by: pg_cron every minute

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
const TWILIO_WHATSAPP_FROM = Deno.env.get('TWILIO_WHATSAPP_FROM')!
const APP_FROM_EMAIL = Deno.env.get('APP_FROM_EMAIL') || 'noreply@remindflow.app'

interface Profile {
  id: string
  full_name: string
  email: string
  phone_number: string | null
}

interface Reminder {
  id: string
  title: string
  description: string | null
  reminder_date: string
  reminder_time: string
  timezone: string
  status: string
  recurrence: string
  created_by: string | null
  assigned_users: { user: Profile }[]
}

/** Convierte "now" UTC al timezone del reminder y extrae fecha y hora local */
function getLocalDateTimeInZone(now: Date, timezone: string): { date: string; time: string } {
  try {
    // Formatea la fecha/hora "now" expresada en el timezone del reminder
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })

    const parts = formatter.formatToParts(now)
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? ''

    const date = `${get('year')}-${get('month')}-${get('day')}`
    // hour12:false puede devolver "24" para medianoche — normalizamos
    const hour = get('hour') === '24' ? '00' : get('hour')
    const time = `${hour}:${get('minute')}:00`

    return { date, time }
  } catch {
    // Fallback a UTC si el timezone es inválido
    const iso = now.toISOString()
    return {
      date: iso.slice(0, 10),
      time: iso.slice(11, 19),
    }
  }
}

Deno.serve(async (_req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Traemos todos los reminders pendientes de hoy ±1 día para filtrar por timezone
  const now = new Date()

  // Rango de fechas posibles dado que distintos timezones pueden estar en días distintos
  const yesterday = new Date(now)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  const tomorrow = new Date(now)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)

  const { data: reminders, error } = await supabase
    .from('reminders')
    .select(`
      *,
      assigned_users:reminder_users(
        user:profiles(id, full_name, email, phone_number)
      )
    `)
    .eq('status', 'pending')
    .gte('reminder_date', yesterday.toISOString().slice(0, 10))
    .lte('reminder_date', tomorrow.toISOString().slice(0, 10))

  if (error) {
    console.error('Error fetching reminders:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  if (!reminders || reminders.length === 0) {
    return new Response(JSON.stringify({ message: 'No pending reminders in window', count: 0 }))
  }

  const results = []
  const nowMinute = Math.floor(now.getTime() / 60000) // minuto actual en Unix

  for (const reminder of reminders as Reminder[]) {
    const tz = reminder.timezone || 'UTC'
    const { date: localDate, time: localTime } = getLocalDateTimeInZone(now, tz)

    // Comparar fecha y hora (HH:MM) en el timezone del reminder
    const reminderTimeHHMM = reminder.reminder_time.slice(0, 5)
    const localTimeHHMM = localTime.slice(0, 5)

    if (localDate !== reminder.reminder_date || localTimeHHMM !== reminderTimeHHMM) {
      continue // No es el momento de este reminder
    }

    const users: Profile[] = (reminder.assigned_users || []).map((ru) => ru.user)

    for (const user of users) {
      // --- Email ---
      try {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: APP_FROM_EMAIL,
            to: [user.email],
            subject: `Reminder: ${reminder.title}`,
            html: buildEmailHtml(reminder, user, tz),
          }),
        })
        const emailData = await emailRes.json()
        results.push({ channel: 'email', user: user.email, status: emailRes.ok ? 'sent' : 'failed', data: emailData })
      } catch (e) {
        console.error('Email error:', e)
        results.push({ channel: 'email', user: user.email, status: 'error' })
      }

      // --- WhatsApp ---
      if (user.phone_number) {
        try {
          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`
          const waBody = `*RemindFlow Reminder*\n\n*${reminder.title}*${reminder.description ? `\n\n${reminder.description}` : ''}\n\n📅 ${reminder.reminder_date} at ${reminder.reminder_time} (${tz})\n\nHi ${user.full_name}, this is your scheduled reminder.`

          const waRes = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: TWILIO_WHATSAPP_FROM,
              To: `whatsapp:${user.phone_number}`,
              Body: waBody,
            }),
          })
          const waData = await waRes.json()
          results.push({ channel: 'whatsapp', user: user.phone_number, status: waRes.ok ? 'sent' : 'failed', data: waData })
        } catch (e) {
          console.error('WhatsApp error:', e)
          results.push({ channel: 'whatsapp', user: user.phone_number, status: 'error' })
        }
      }
    }

    // Marcar como enviado
    await supabase.from('reminders').update({ status: 'sent' }).eq('id', reminder.id)

    // Recurrencia: crear siguiente ocurrencia
    if (reminder.recurrence !== 'none') {
      const nextDate = getNextDate(reminder.reminder_date, reminder.recurrence)
      if (nextDate) {
        const { data: newReminder } = await supabase
          .from('reminders')
          .insert({
            title: reminder.title,
            description: reminder.description,
            reminder_date: nextDate,
            reminder_time: reminder.reminder_time,
            timezone: reminder.timezone,
            status: 'pending',
            recurrence: reminder.recurrence,
            created_by: reminder.created_by,
          })
          .select()
          .single()

        if (newReminder) {
          const userIds = users.map((u) => ({ reminder_id: newReminder.id, user_id: u.id }))
          await supabase.from('reminder_users').insert(userIds)
        }
      }
    }
  }

  return new Response(JSON.stringify({ processed: results.filter((r) => r.status === 'sent').length, results }))
})

function buildEmailHtml(reminder: Reminder, user: Profile, timezone: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:40px 0;">
  <div style="max-width:560px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
    <div style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:24px;">🔔 RemindFlow</h1>
      <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">Reminder Notification</p>
    </div>
    <div style="padding:32px;">
      <p style="color:#6b7280;margin:0 0 8px;">Hi ${user.full_name},</p>
      <h2 style="color:#111827;margin:0 0 16px;font-size:20px;">${reminder.title}</h2>
      ${reminder.description ? `<p style="color:#4b5563;margin:0 0 24px;line-height:1.6;">${reminder.description}</p>` : ''}
      <div style="background:#f3f4f6;border-radius:12px;padding:16px;margin-bottom:24px;">
        <p style="margin:0;color:#374151;font-size:14px;">
          📅 <strong>Date:</strong> ${reminder.reminder_date}<br>
          🕐 <strong>Time:</strong> ${reminder.reminder_time} <span style="color:#6b7280;">(${timezone})</span>
          ${reminder.recurrence !== 'none' ? `<br>🔁 <strong>Recurrence:</strong> ${reminder.recurrence}` : ''}
        </p>
      </div>
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
        Automated notification from RemindFlow.
      </p>
    </div>
  </div>
</body>
</html>`
}

function getNextDate(dateStr: string, recurrence: string): string | null {
  const date = new Date(dateStr + 'T00:00:00Z')
  switch (recurrence) {
    case 'daily':   date.setUTCDate(date.getUTCDate() + 1); break
    case 'weekly':  date.setUTCDate(date.getUTCDate() + 7); break
    case 'monthly': date.setUTCMonth(date.getUTCMonth() + 1); break
    default: return null
  }
  return date.toISOString().slice(0, 10)
}
