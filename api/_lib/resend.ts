import { Resend } from 'resend'
import { requiredEnv } from './env'

let resendClient: Resend | null = null

export function getResend(): Resend {
  if (!resendClient) resendClient = new Resend(requiredEnv('RESEND_API_KEY'))
  return resendClient
}
