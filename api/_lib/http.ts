import { ZodError, type ZodType } from 'zod'
import { ApiAuthenticationError } from './supabase-admin'

export function json(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' },
  })
}

export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new ApiRequestError('CONTENT_TYPE_REQUIRED', 415)
  }
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (Number.isFinite(contentLength) && contentLength > 4096) throw new ApiRequestError('REQUEST_TOO_LARGE', 413)
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiRequestError('INVALID_JSON', 400)
  }
  return schema.parse(body)
}

export function apiErrorResponse(error: unknown): Response {
  if (error instanceof ApiRequestError || error instanceof ApiAuthenticationError) {
    return json({ ok: false, error: publicErrorMessage(error.message) }, error.status)
  }
  if (error instanceof ZodError) return json({ ok: false, error: 'Requête invalide.' }, 400)
  const code = error instanceof Error ? error.message : 'UNKNOWN_ERROR'
  console.error('[Transactional email]', code)
  return json({ ok: false, error: publicErrorMessage(code) }, publicErrorStatus(code))
}

function publicErrorStatus(code: string): number {
  if (code === 'ORDER_NOT_FOUND') return 404
  if (code === 'ORDER_EMAIL_MISSING' || code === 'ORDER_EMAIL_INVALID' || code === 'ORDER_ITEMS_MISSING') return 422
  if (code.startsWith('SERVER_CONFIG_') || code === 'EMAIL_EVENT_STORE_UNAVAILABLE') return 503
  return 500
}

function publicErrorMessage(code: string): string {
  if (code === 'AUTH_REQUIRED' || code === 'AUTH_INVALID') return 'Authentification requise.'
  if (code === 'ADMIN_REQUIRED') return 'Accès administrateur requis.'
  if (code === 'ORDER_NOT_FOUND') return 'Commande introuvable.'
  if (code === 'ORDER_ACCESS_DENIED') return 'Vous ne pouvez pas accéder à cette commande.'
  if (code === 'ORDER_STATUS_MISMATCH') return 'Le statut demandé ne correspond pas au statut enregistré.'
  if (code === 'ORDER_EMAIL_MISSING' || code === 'ORDER_EMAIL_INVALID') return 'Aucune adresse e-mail valide n’est associée à cette commande.'
  if (code === 'ORDER_ITEMS_MISSING') return 'Aucun article n’est associé à cette commande.'
  if (code.startsWith('SERVER_CONFIG_')) return 'Le service d’e-mail n’est pas encore correctement configuré.'
  if (code === 'EMAIL_EVENT_STORE_UNAVAILABLE') return 'Le suivi des e-mails transactionnels n’est pas configuré.'
  if (code === 'CONTENT_TYPE_REQUIRED') return 'Le contenu doit être envoyé au format JSON.'
  if (code === 'INVALID_JSON') return 'Le contenu JSON est invalide.'
  if (code === 'REQUEST_TOO_LARGE') return 'La requête est trop volumineuse.'
  return 'Le service d’e-mail est temporairement indisponible.'
}

export class ApiRequestError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
}
