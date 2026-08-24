import { supabase } from '../lib/supabase'
import type { SupabaseOrderStatus } from './supabaseOrderService'

type EmailApiResponse = {
  ok: boolean
  error?: string
  client?: { sent: boolean; alreadySent: boolean; error?: string }
  admin?: { sent: boolean; alreadySent: boolean; error?: string }
}

export class TransactionalEmailError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TransactionalEmailError'
  }
}

async function postEmailApi(path: string, body: Record<string, unknown>): Promise<EmailApiResponse> {
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error || !session?.access_token) throw new TransactionalEmailError('Votre session a expiré. L’e-mail n’a pas été envoyé.')
  let response: Response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new TransactionalEmailError('Le service d’e-mail est temporairement indisponible.')
  }
  const result = await response.json().catch(() => null) as EmailApiResponse | null
  if (!response.ok || !result) throw new TransactionalEmailError(result?.error ?? 'Le service d’e-mail est temporairement indisponible.')
  return result
}

export async function sendOrderConfirmationEmails(orderId: string): Promise<EmailApiResponse> {
  return postEmailApi('/api/emails/order-confirmation', { orderId })
}

export async function sendOrderStatusEmail(orderId: string, status: SupabaseOrderStatus): Promise<EmailApiResponse> {
  return postEmailApi('/api/emails/order-status', { orderId, status })
}
