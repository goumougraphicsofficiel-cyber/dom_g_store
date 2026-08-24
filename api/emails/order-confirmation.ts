import { z } from 'zod'
import { AdminNewOrderEmail, adminOrderSubject } from '../_emails/admin-new-order'
import { OrderConfirmationEmail, orderConfirmationSubject } from '../_emails/order-confirmation'
import { adminOrderEmail, appUrl } from '../_lib/env'
import { apiErrorResponse, json, parseJson } from '../_lib/http'
import { loadTransactionalOrder } from '../_lib/order-data'
import { authenticatedUser } from '../_lib/supabase-admin'
import { sendEmailOnce, type SendOnceResult } from '../_lib/transactional-email'

const requestSchema = z.object({ orderId: z.uuid() }).strict()
type DeliveryResult = SendOnceResult | { sent: false; alreadySent: false; error: string }

async function settledResult(factory: () => Promise<SendOnceResult>): Promise<DeliveryResult> {
  try {
    return await factory()
  } catch (error) {
    const code = error instanceof Error ? error.message : 'EMAIL_SEND_FAILED'
    console.error('[Order confirmation email]', code)
    return { sent: false, alreadySent: false, error: 'Envoi impossible.' }
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return json({ ok: false, error: 'Méthode non autorisée.' }, 405)
    try {
      const user = await authenticatedUser(request)
      const { orderId } = await parseJson(request, requestSchema)
      const order = await loadTransactionalOrder(orderId)
      if (order.userId !== user.id) return json({ ok: false, error: 'Vous ne pouvez pas accéder à cette commande.' }, 403)

      const client = await settledResult(() => sendEmailOnce({
        orderId: order.id,
        eventKey: 'confirmation-client',
        recipientType: 'client',
        recipient: order.customerEmail,
        subject: orderConfirmationSubject(order.orderNumber),
        react: OrderConfirmationEmail({ order, orderUrl: `${appUrl()}/compte/commandes/${order.id}` }),
      }))
      const admin = await settledResult(() => sendEmailOnce({
        orderId: order.id,
        eventKey: 'confirmation-admin',
        recipientType: 'admin',
        recipient: adminOrderEmail(),
        subject: adminOrderSubject(order),
        react: AdminNewOrderEmail({ order, adminUrl: `${appUrl()}/admin/commandes/${order.id}` }),
      }))
      const ok = !('error' in client) && !('error' in admin)
      return json({ ok, client, admin }, ok ? 200 : 207)
    } catch (error) {
      return apiErrorResponse(error)
    }
  },
}
