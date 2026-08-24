import type { ReactNode } from 'react'
import { emailEventWasSent, recordEmailEvent } from './email-events'
import { deliveryRecipient, fromEmail } from './env'
import { getResend } from './resend'

export type SendOnceResult = { sent: boolean; alreadySent: boolean }

export async function sendEmailOnce(input: {
  orderId: string
  eventKey: string
  recipientType: 'client' | 'admin'
  recipient: string
  subject: string
  react: ReactNode
  statusValue?: string
}): Promise<SendOnceResult> {
  if (await emailEventWasSent(input.orderId, input.eventKey)) return { sent: false, alreadySent: true }
  const recipient = deliveryRecipient(input.recipient)
  const { data, error } = await getResend().emails.send({
    from: fromEmail(),
    to: [recipient],
    subject: input.subject,
    react: input.react,
    tags: [
      { name: 'event', value: input.eventKey.replace(/[^a-zA-Z0-9_-]/g, '-') },
      { name: 'order', value: input.orderId.replace(/[^a-zA-Z0-9_-]/g, '-') },
    ],
  }, { idempotencyKey: `dom-g-store/${input.orderId}/${input.eventKey}` })
  if (error || !data?.id) throw new Error('RESEND_SEND_FAILED')
  await recordEmailEvent({
    orderId: input.orderId,
    eventKey: input.eventKey,
    recipientType: input.recipientType,
    statusValue: input.statusValue,
    resendEmailId: data.id,
  })
  return { sent: true, alreadySent: false }
}
