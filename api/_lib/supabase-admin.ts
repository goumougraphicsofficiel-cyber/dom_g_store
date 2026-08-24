import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { requiredEnv } from './env'

let adminClient: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  }
  return adminClient
}

export async function authenticatedUser(request: Request): Promise<User> {
  const authorization = request.headers.get('authorization')
  const token = authorization?.replace(/^Bearer\s+/i, '').trim()
  if (!token) throw new ApiAuthenticationError('AUTH_REQUIRED')
  const { data: { user }, error } = await getSupabaseAdmin().auth.getUser(token)
  if (error || !user) throw new ApiAuthenticationError('AUTH_INVALID')
  return user
}

export async function requireActiveAdmin(request: Request): Promise<User> {
  const user = await authenticatedUser(request)
  const { data, error } = await getSupabaseAdmin()
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .maybeSingle<{ role: string | null; status: string | null }>()
  if (error) throw new Error('PROFILE_LOOKUP_FAILED')
  if (!data || data.role !== 'admin' || data.status !== 'actif') throw new ApiAuthenticationError('ADMIN_REQUIRED', 403)
  return user
}

export class ApiAuthenticationError extends Error {
  readonly status: number

  constructor(message: string, status = 401) {
    super(message)
    this.name = 'ApiAuthenticationError'
    this.status = status
  }
}
