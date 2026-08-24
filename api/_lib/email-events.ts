import { getSupabaseAdmin } from './supabase-admin'

export async function emailEventWasSent(orderId: string, eventKey: string): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from('order_email_events')
    .select('id')
    .eq('order_id', orderId)
    .eq('event_key', eventKey)
    .maybeSingle()
  if (error) throw new Error('EMAIL_EVENT_STORE_UNAVAILABLE')
  return Boolean(data)
}

export async function recordEmailEvent(input: {
  orderId: string
  eventKey: string
  recipientType: 'client' | 'admin'
  statusValue?: string
  resendEmailId: string
}): Promise<void> {
  const { error } = await getSupabaseAdmin().from('order_email_events').upsert({
    order_id: input.orderId,
    event_key: input.eventKey,
    recipient_type: input.recipientType,
    status_value: input.statusValue ?? null,
    resend_email_id: input.resendEmailId,
    sent_at: new Date().toISOString(),
  }, { onConflict: 'order_id,event_key', ignoreDuplicates: true })
  if (error) throw new Error('EMAIL_EVENT_STORE_UNAVAILABLE')
}
