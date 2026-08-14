import { SNSClient, PublishCommand, type MessageAttributeValue } from '@aws-sdk/client-sns'

// SMS de reminders vía Amazon SNS.
// Requiere AWS_REGION, AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY.

const E164 = /^\+[1-9]\d{7,14}$/

// Máximo del body: ~2 segmentos GSM-7. Texto plano, sin emojis (fuerzan UCS-2).
const MAX_SMS_LENGTH = 300

interface SmsReminder {
  title: string
  description?: string | null
  reminder_date: string
  reminder_time: string
}

export function isE164(phone: string | null | undefined): phone is string {
  return !!phone && E164.test(phone.trim())
}

export function buildSmsBody(reminder: SmsReminder, timezone: string): string {
  const time = reminder.reminder_time.slice(0, 5)
  const lines = [
    `RemindFlow: ${reminder.title}`,
    reminder.description || '',
    `${reminder.reminder_date} ${time} (${timezone})`,
  ].filter(Boolean)

  const body = lines.join('\n')
  // '...' en vez de '…': el carácter unicode fuerza codificación UCS-2 (70 chars/segmento).
  return body.length > MAX_SMS_LENGTH ? `${body.slice(0, MAX_SMS_LENGTH - 3)}...` : body
}

export function isSnsConfigured(): boolean {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
}

let client: SNSClient | null = null

function getClient(): SNSClient {
  if (!client) {
    client = new SNSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  return client
}

function smsAttributes(): Record<string, MessageAttributeValue> {
  const attrs: Record<string, MessageAttributeValue> = {
    'AWS.SNS.SMS.SMSType': {
      DataType: 'String',
      StringValue: process.env.SNS_SMS_TYPE || 'Transactional',
    },
  }

  // SenderID no está soportado en todos los países (ej. US/CA) — solo si se configuró.
  if (process.env.SNS_SMS_SENDER_ID) {
    attrs['AWS.SNS.SMS.SenderID'] = {
      DataType: 'String',
      StringValue: process.env.SNS_SMS_SENDER_ID,
    }
  }

  return attrs
}

/** Publica un SMS. Lanza si SNS falla — el caller decide cómo registrarlo. */
export async function sendSms(phone: string, body: string): Promise<{ messageId?: string }> {
  const out = await getClient().send(
    new PublishCommand({
      PhoneNumber: phone.trim(),
      Message: body,
      MessageAttributes: smsAttributes(),
    })
  )
  return { messageId: out.MessageId }
}
