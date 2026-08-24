import { z } from 'zod'

const emailSchema = z.email()

export function requiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`SERVER_CONFIG_MISSING:${name}`)
  return value
}

export function appUrl(): string {
  return requiredEnv('APP_URL').replace(/\/$/, '')
}

export function fromEmail(): string {
  return requiredEnv('RESEND_FROM_EMAIL')
}

export function adminOrderEmail(): string {
  const value = requiredEnv('ADMIN_ORDER_EMAIL')
  if (!emailSchema.safeParse(value).success) throw new Error('SERVER_CONFIG_INVALID:ADMIN_ORDER_EMAIL')
  return value
}

export function deliveryRecipient(actualEmail: string): string {
  if (!emailSchema.safeParse(actualEmail).success) throw new Error('ORDER_EMAIL_INVALID')
  if (process.env.RESEND_TEST_MODE !== 'true') return actualEmail
  const testRecipient = requiredEnv('RESEND_TEST_RECIPIENT')
  if (!emailSchema.safeParse(testRecipient).success) throw new Error('SERVER_CONFIG_INVALID:RESEND_TEST_RECIPIENT')
  return testRecipient
}
