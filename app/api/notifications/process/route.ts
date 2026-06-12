import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/notifications/process
// Procesa reminders pendientes y envía email + WhatsApp
// Para testing: pegar en el browser o hacer curl

interface Profile {
  id: string
  full_name: string
  email: string
  phone_number: string | null
}

export async function POST(request: NextRequest) {
  const supabase = await createAdminClient()

  const now = new Date()

  // Obtener todos los pending reminders
  const { data: reminders, error } = await supabase
    .from('reminders')
    .select(`
      *,
      assigned_users:reminder_users(
        user:profiles(id, full_name, email, phone_number)
      )
    `)
    .eq('status', 'pending')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!reminders || reminders.length === 0) {
    return NextResponse.json({ message: 'No pending reminders', processed: 0 })
  }

  const results: Record<string, unknown>[] = []

  for (const reminder of reminders) {
    const tz = (reminder as Record<string, unknown>).timezone as string || 'UTC'

    // Convertir "ahora" al timezone del reminder
    const localNow = new Date(now.toLocaleString('en-US', { timeZone: tz }))
    const localDate = localNow.toISOString().slice(0, 10)
    const localHour = localNow.getHours().toString().padStart(2, '0')
    const localMin = localNow.getMinutes().toString().padStart(2, '0')
    const localTime = `${localHour}:${localMin}`

    const reminderTime = (reminder as Record<string, unknown>).reminder_time as string
    const reminderTimeHHMM = reminderTime.slice(0, 5)

    // DEBUG: log para ver qué está comparando
    console.log(`[Reminder ${reminder.id}] DB date=${reminder.reminder_date} time=${reminderTimeHHMM} | Now local(${tz})=${localDate} ${localTime}`)

    // Solo disparar si coincide fecha y hora (minuto exacto)
    if ((reminder as Record<string, unknown>).reminder_date !== localDate || reminderTimeHHMM !== localTime) {
      results.push({
        id: reminder.id,
        title: (reminder as Record<string, unknown>).title,
        status: 'skipped',
        reason: `No match: need ${reminder.reminder_date} ${reminderTimeHHMM}, now is ${localDate} ${localTime} (${tz})`,
      })
      continue
    }

    const users: Profile[] = ((reminder as Record<string, unknown>).assigned_users as { user: Profile }[] || []).map((ru) => ru.user)

    for (const user of users) {
      // --- EMAIL via Resend ---
      const resendKey = process.env.RESEND_API_KEY
      const fromEmail = process.env.APP_FROM_EMAIL || 'noreply@remindflow.app'

      if (resendKey) {
        try {
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${resendKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: fromEmail,
              to: [user.email],
              subject: `🔔 Reminder: ${(reminder as Record<string, unknown>).title}`,
              html: buildEmailHtml(reminder as never, user, tz),
            }),
          })
          const emailData = await emailRes.json()
          results.push({ channel: 'email', user: user.email, status: emailRes.ok ? 'sent' : 'failed', data: emailData })
        } catch (e) {
          results.push({ channel: 'email', user: user.email, status: 'error', error: String(e) })
        }
      } else {
        results.push({ channel: 'email', user: user.email, status: 'skipped', reason: 'RESEND_API_KEY not configured' })
      }

      // --- WHATSAPP via Twilio ---
      const twilioSid = process.env.TWILIO_ACCOUNT_SID
      const twilioToken = process.env.TWILIO_AUTH_TOKEN
      const twilioFrom = process.env.TWILIO_WHATSAPP_FROM

      if (twilioSid && twilioToken && twilioFrom && user.phone_number) {
        try {
          const waRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
            {
              method: 'POST',
              headers: {
                Authorization: `Basic ${btoa(`${twilioSid}:${twilioToken}`)}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                From: twilioFrom,
                To: `whatsapp:${user.phone_number}`,
                Body: `*RemindFlow*\n\n*${(reminder as Record<string, unknown>).title}*${(reminder as Record<string, unknown>).description ? `\n\n${(reminder as Record<string, unknown>).description}` : ''}\n\n📅 ${(reminder as Record<string, unknown>).reminder_date} at ${reminderTime} (${tz})`,
              }),
            }
          )
          const waData = await waRes.json()
          results.push({ channel: 'whatsapp', user: user.phone_number, status: waRes.ok ? 'sent' : 'failed', data: waData })
        } catch (e) {
          results.push({ channel: 'whatsapp', user: user.phone_number, status: 'error', error: String(e) })
        }
      } else {
        results.push({
          channel: 'whatsapp',
          user: user.phone_number || 'no phone',
          status: 'skipped',
          reason: !twilioSid ? 'TWILIO_ACCOUNT_SID not set' : !user.phone_number ? 'User has no phone_number' : 'TWILIO_WHATSAPP_FROM not set',
        })
      }
    }

    // Marcar como sent
    await supabase.from('reminders').update({ status: 'sent' }).eq('id', reminder.id)

    results.push({ id: reminder.id, title: (reminder as Record<string, unknown>).title, status: 'sent' })
  }

  return NextResponse.json({
    message: 'Done',
    now: now.toISOString(),
    processed: results.filter((r) => r.status === 'sent').length,
    results,
  })
}

// GET para testing rápido desde el browser
export async function GET() {
  const supabase = await createAdminClient()

  const { data: reminders } = await supabase
    .from('reminders')
    .select('id, title, reminder_date, reminder_time, timezone, status')
    .eq('status', 'pending')
    .order('reminder_date', { ascending: false })

  return NextResponse.json({
    message: 'POST this endpoint to process reminders. GET shows pending list.',
    pending: reminders || [],
    env: {
      RESEND_API_KEY: process.env.RESEND_API_KEY ? '✅ set' : '❌ missing',
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? '✅ set' : '❌ missing',
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? '✅ set' : '❌ missing',
      TWILIO_WHATSAPP_FROM: process.env.TWILIO_WHATSAPP_FROM ? '✅ set' : '❌ missing',
      APP_FROM_EMAIL: process.env.APP_FROM_EMAIL || 'noreply@remindflow.app',
    },
  })
}

function buildEmailHtml(reminder: Record<string, unknown>, user: Profile, timezone: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
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
      <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">Automated notification from RemindFlow</p>
    </div>
  </div>
</body>
</html>`
}
