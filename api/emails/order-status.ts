import { z } from 'zod'
import { OrderStatusEmail, orderStatusSubject } from '../_emails/order-status'
import { appUrl } from '../_lib/env'
import { apiErrorResponse, json, parseJson } from '../_lib/http'
import { loadTransactionalOrder, ORDER_STATUSES } from '../_lib/order-data'
import { requireActiveAdmin } from '../_lib/supabase-admin'
import { sendEmailOnce } from '../_lib/transactional-email'

const requestSchema = z.object({ orderId: z.uuid(), status: z.enum(ORDER_STATUSES) }).strict()

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return json({ ok: false, error: 'Méthode non autorisée.' }, 405)
    try {
      await requireActiveAdmin(request)
      const { orderId, status } = await parseJson(request, requestSchema)
      const order = await loadTransactionalOrder(orderId)
      if (order.status !== status) return json({ ok: false, error: 'Le statut demandé ne correspond pas au statut enregistré.' }, 409)
      const delivery = await sendEmailOnce({
        orderId: order.id,
        eventKey: `status-${status}`,
        recipientType: 'client',
        recipient: order.customerEmail,
        subject: orderStatusSubject(status, order.orderNumber),
        react: OrderStatusEmail({ order, orderUrl: `${appUrl()}/compte/commandes/${order.id}` }),
        statusValue: status,
      })
      return json({ ok: true, delivery })
    } catch (error) {
      return apiErrorResponse(error)
    }
  },
}
