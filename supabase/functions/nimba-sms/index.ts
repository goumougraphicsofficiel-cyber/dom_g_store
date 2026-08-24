import { createClient } from 'npm:@supabase/supabase-js@2.112.3'

const NIMBA_API_URL = 'https://api.nimbasms.com/v1/messages'
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info, x-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type ProfileRecord = { id: string; first_name: string | null; last_name: string | null; phone: string | null }
type OrderRecord = {
  id: string
  order_number: string
  status: string
  shipping_first_name: string | null
  shipping_phone: string | null
  total_amount: number | string | null
}
type DatabaseWebhookPayload = {
  type: 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  schema: string
  record: Record<string, unknown> | null
  old_record: Record<string, unknown> | null
}
type PasswordResetPayload = { event: 'password_reset' }

class SmsError extends Error {
  constructor(message: string, readonly status = 500) {
    super(message)
    this.name = 'SmsError'
  }
}

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function requiredSecret(name: string) {
  const value = Deno.env.get(name)?.trim()
  if (!value) throw new SmsError(`Configuration serveur manquante : ${name}.`)
  return value
}

function normalizeGuineaPhone(value: string | null) {
  if (!value) throw new SmsError('Aucun numéro de téléphone n’est disponible.', 422)
  const compact = value.trim().replace(/[\s().-]/g, '')
  const normalized = compact.startsWith('+224')
    ? compact
    : compact.startsWith('224')
      ? `+${compact}`
      : compact.startsWith('0')
        ? `+224${compact.slice(1)}`
        : `+224${compact}`
  if (!/^\+\d{9,15}$/.test(normalized)) throw new SmsError('Le numéro de téléphone enregistré est invalide.', 422)
  return normalized
}

function firstName(value: string | null) {
  const name = value?.trim()
  return name ? ` ${name}` : ''
}

function formatGnf(value: number | string | null) {
  const amount = Number(value ?? 0)
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(Number.isFinite(amount) ? amount : 0)} FG`
}

async function sendSms(phone: string | null, message: string) {
  const serviceId = requiredSecret('NIMBA_SERVICE_ID')
  const secretToken = requiredSecret('NIMBA_SECRET_TOKEN')
  const senderName = requiredSecret('NIMBA_SENDER_NAME')
  const recipient = normalizeGuineaPhone(phone)
  const response = await fetch(NIMBA_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${serviceId}:${secretToken}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sender_name: senderName, to: [recipient], message, channel: 'sms' }),
  })
  const result = await response.json().catch(() => null) as { messageid?: string; detail?: string; message?: string } | null
  if (!response.ok) {
    const detail = result?.detail ?? result?.message ?? `Erreur HTTP ${response.status}`
    throw new SmsError(`Nimba SMS a refusé l’envoi : ${detail}`, 502)
  }
  if (!result?.messageid) throw new SmsError('Nimba SMS n’a pas retourné d’identifiant de message.', 502)
  return result.messageid
}

function isWebhookAuthorized(request: Request) {
  const expected = Deno.env.get('NIMBA_WEBHOOK_SECRET')?.trim()
  const received = request.headers.get('x-webhook-secret')?.trim()
  return Boolean(expected && received && expected === received)
}

async function handleDatabaseWebhook(payload: DatabaseWebhookPayload) {
  if (payload.schema !== 'public') throw new SmsError('Événement de base de données non autorisé.', 403)
  if (payload.table === 'profiles' && payload.type === 'INSERT' && payload.record) {
    const profile = payload.record as ProfileRecord
    const messageId = await sendSms(profile.phone, `Bienvenue${firstName(profile.first_name)} chez Dom G Store. Votre compte a été créé avec succès. L'essentiel, avec confiance.`)
    return json({ sent: true, event: 'registration', messageId })
  }
  if (payload.table === 'orders' && payload.type === 'UPDATE' && payload.record) {
    const order = payload.record as OrderRecord
    const previous = payload.old_record as OrderRecord | null
    if (order.status !== 'confirmee' || previous?.status === 'confirmee') return json({ sent: false, ignored: true })
    const messageId = await sendSms(order.shipping_phone, `Bonjour${firstName(order.shipping_first_name)}, votre commande ${order.order_number} est confirmée. Total : ${formatGnf(order.total_amount)}. Merci de votre confiance.`)
    return json({ sent: true, event: 'order_confirmed', messageId })
  }
  return json({ sent: false, ignored: true })
}

async function authenticatedUser(request: Request) {
  const authorization = request.headers.get('authorization')
  const accessToken = authorization?.replace(/^Bearer\s+/i, '').trim()
  if (!accessToken) throw new SmsError('Authentification requise.', 401)
  const admin = createClient(requiredSecret('SUPABASE_URL'), requiredSecret('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: { user }, error } = await admin.auth.getUser(accessToken)
  if (error || !user) throw new SmsError('Session invalide ou expirée.', 401)
  return { admin, user }
}

async function handleAuthenticatedRequest(request: Request, payload: PasswordResetPayload) {
  if (payload.event !== 'password_reset') throw new SmsError('Événement SMS non autorisé.', 400)
  const { admin, user } = await authenticatedUser(request)
  const { data: profile, error } = await admin.from('profiles').select('first_name, phone').eq('id', user.id).maybeSingle<{ first_name: string | null; phone: string | null }>()
  if (error) throw new SmsError('Impossible de charger le profil du client.', 500)
  if (!profile) throw new SmsError('Profil client introuvable.', 404)
  const messageId = await sendSms(profile.phone, `Bonjour${firstName(profile.first_name)}, le mot de passe de votre compte Dom G Store vient d'être modifié. Si vous n'êtes pas à l'origine de cette action, contactez-nous immédiatement.`)
  return json({ sent: true, event: 'password_reset', messageId })
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Méthode non autorisée.' }, 405)
  try {
    const payload = await request.json() as DatabaseWebhookPayload | PasswordResetPayload
    if (isWebhookAuthorized(request)) return await handleDatabaseWebhook(payload as DatabaseWebhookPayload)
    return await handleAuthenticatedRequest(request, payload as PasswordResetPayload)
  } catch (error) {
    const status = error instanceof SmsError ? error.status : 500
    const message = error instanceof Error ? error.message : 'Erreur interne pendant l’envoi du SMS.'
    console.error('[Nimba SMS]', message)
    return json({ error: message }, status)
  }
})
