import { getSupabaseAdmin } from './supabase-admin'

export const ORDER_STATUSES = ['en_attente', 'confirmee', 'preparation', 'expediee', 'livree', 'annulee', 'remboursee'] as const
export type OrderStatus = typeof ORDER_STATUSES[number]

type OrderRow = {
  id: string
  user_id: string | null
  order_number: string
  status: OrderStatus
  payment_status: string
  subtotal: number | string | null
  discount_amount: number | string | null
  shipping_amount: number | string | null
  total_amount: number | string
  shipping_method: string | null
  shipping_first_name: string | null
  shipping_last_name: string | null
  shipping_phone: string | null
  shipping_address: string | null
  shipping_district: string | null
  shipping_city: string | null
  shipping_country: string | null
  tracking_number: string | null
  created_at: string
}

type OrderItemRow = {
  id: string
  product_name: string
  product_sku: string | null
  variant_details: string | null
  quantity: number
  unit_price: number | string
  total_price: number | string
}

export type TransactionalOrder = {
  id: string
  userId: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: string
  paymentMethod: null
  subtotal: number
  discountAmount: number
  shippingAmount: number
  totalAmount: number
  currency: 'GNF'
  shippingMethod: string
  shippingFirstName: string
  shippingLastName: string
  shippingPhone: string
  shippingAddress: string
  shippingDistrict: string
  shippingCity: string
  shippingCountry: string
  trackingNumber: string
  createdAt: string
  customerEmail: string
  items: Array<{
    id: string
    productName: string
    productSku: string
    variantDetails: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
}

const orderColumns = `
  id, user_id, order_number, status, payment_status, subtotal, discount_amount,
  shipping_amount, total_amount, shipping_method, shipping_first_name,
  shipping_last_name, shipping_phone, shipping_address, shipping_district,
  shipping_city, shipping_country, tracking_number, created_at
`

export async function loadTransactionalOrder(orderId: string): Promise<TransactionalOrder> {
  const admin = getSupabaseAdmin()
  const { data: orderData, error: orderError } = await admin.from('orders').select(orderColumns).eq('id', orderId).maybeSingle()
  if (orderError) throw new Error('ORDER_LOOKUP_FAILED')
  if (!orderData) throw new Error('ORDER_NOT_FOUND')
  const row = orderData as OrderRow
  if (!row.user_id) throw new Error('ORDER_EMAIL_MISSING')

  const [{ data: itemsData, error: itemsError }, { data: authData, error: authError }] = await Promise.all([
    admin.from('order_items').select('id, product_name, product_sku, variant_details, quantity, unit_price, total_price').eq('order_id', row.id).order('created_at', { ascending: true }),
    admin.auth.admin.getUserById(row.user_id),
  ])
  if (itemsError) throw new Error('ORDER_ITEMS_LOOKUP_FAILED')
  if (!itemsData?.length) throw new Error('ORDER_ITEMS_MISSING')
  if (authError || !authData.user?.email) throw new Error('ORDER_EMAIL_MISSING')

  return {
    id: row.id,
    userId: row.user_id,
    orderNumber: row.order_number,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: null,
    subtotal: Number(row.subtotal ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    shippingAmount: Number(row.shipping_amount ?? 0),
    totalAmount: Number(row.total_amount),
    currency: 'GNF',
    shippingMethod: row.shipping_method ?? '',
    shippingFirstName: row.shipping_first_name ?? '',
    shippingLastName: row.shipping_last_name ?? '',
    shippingPhone: row.shipping_phone ?? '',
    shippingAddress: row.shipping_address ?? '',
    shippingDistrict: row.shipping_district ?? '',
    shippingCity: row.shipping_city ?? '',
    shippingCountry: row.shipping_country ?? '',
    trackingNumber: row.tracking_number ?? '',
    createdAt: row.created_at,
    customerEmail: authData.user.email,
    items: (itemsData as OrderItemRow[]).map(item => ({
      id: item.id,
      productName: item.product_name,
      productSku: item.product_sku ?? '',
      variantDetails: item.variant_details ?? '',
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      totalPrice: Number(item.total_price),
    })),
  }
}
