import { supabase } from '../lib/supabase'

export class SmsNotificationError extends Error {
  readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'SmsNotificationError'
    this.cause = cause
  }
}

export async function notifyPasswordReset(): Promise<void> {
  const { error } = await supabase.functions.invoke('nimba-sms', { body: { event: 'password_reset' } })
  if (error) throw new SmsNotificationError('Le mot de passe a été modifié, mais le SMS de sécurité n’a pas pu être envoyé.', error)
}
