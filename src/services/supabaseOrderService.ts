import { supabase } from '../lib/supabase'

export const ORDER_STATUSES = ['en_attente', 'confirmee', 'preparation', 'expediee', 'livree', 'annulee', 'remboursee'] as const
export const PAYMENT_STATUSES = ['en_attente', 'paye', 'echoue', 'rembourse'] as const

export type SupabaseOrderStatus = typeof ORDER_STATUSES[number]
export type SupabasePaymentStatus = typeof PAYMENT_STATUSES[number]

type ProfileRelation = { first_name: string | null; last_name: string | null; phone: string | null }

type OrderRow = {
  id: string
  user_id: string | null
  order_number: string
  status: SupabaseOrderStatus
  payment_status: SupabasePaymentStatus
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
  updated_at: string | null
  profile: ProfileRelation | null
}

type OrderItemRow = {
  id: string
  order_id: string
  product_id: string | null
  variant_id: string | null
  product_name: string
  product_sku: string | null
  variant_details: string | null
  quantity: number
  unit_price: number | string
  total_price: number | string
  created_at: string
}

export type AdminOrderItem = {
  id: string
  orderId: string
  productId: string | null
  variantId: string | null
  productName: string
  productSku: string
  variantDetails: string
  quantity: number
  unitPrice: number
  totalPrice: number
  createdAt: string
}

export type AdminOrder = {
  id: string
  userId: string | null
  orderNumber: string
  customerName: string
  customerPhone: string
  status: SupabaseOrderStatus
  paymentStatus: SupabasePaymentStatus
  subtotal: number
  discountAmount: number
  shippingAmount: number
  totalAmount: number
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
  updatedAt: string
}

export type CreateOrderItemInput = {
  productId: string
  variantId: string | null
  productName: string
  productSku: string
  variantDetails: string
  quantity: number
  unitPrice: number
}

export type CreateOrderInput = {
  userId: string
  subtotal: number
  discountAmount: number
  shippingAmount: number
  totalAmount: number
  shippingMethod: string
  shippingFirstName: string
  shippingLastName: string
  shippingPhone: string
  shippingAddress: string
  shippingDistrict: string
  shippingCity: string
  shippingCountry: string
  items: CreateOrderItemInput[]
}

export class OrderItemsCreationError extends Error {
  readonly order: AdminOrder
  readonly cause: unknown

  constructor(order: AdminOrder, cause: unknown) {
    super(`La commande ${order.orderNumber} a été créée, mais ses articles n’ont pas pu être enregistrés.`)
    this.name = 'OrderItemsCreationError'
    this.order = order
    this.cause = cause
  }
}

const orderColumns = `
  id, user_id, order_number, status, payment_status, subtotal, discount_amount,
  shipping_amount, total_amount, shipping_method, shipping_first_name,
  shipping_last_name, shipping_phone, shipping_address, shipping_district,
  shipping_city, shipping_country, tracking_number, created_at, updated_at,
  profile:profiles!orders_user_id_fkey (first_name, last_name, phone)
`

function toNumber(value: number | string | null) {
  return value === null ? 0 : Number(value)
}

function toOrder(row: OrderRow): AdminOrder {
  const shippingName = [row.shipping_first_name, row.shipping_last_name].filter(Boolean).join(' ')
  const profileName = [row.profile?.first_name, row.profile?.last_name].filter(Boolean).join(' ')
  return {
    id: row.id,
    userId: row.user_id,
    orderNumber: row.order_number,
    customerName: shippingName || profileName || 'Client non renseigné',
    customerPhone: row.shipping_phone ?? row.profile?.phone ?? '',
    status: row.status,
    paymentStatus: row.payment_status,
    subtotal: toNumber(row.subtotal),
    discountAmount: toNumber(row.discount_amount),
    shippingAmount: toNumber(row.shipping_amount),
    totalAmount: Number(row.total_amount),
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
    updatedAt: row.updated_at ?? row.created_at,
  }
}

export const supabaseOrderService = {
  async list(): Promise<AdminOrder[]> {
    const { data, error } = await supabase.from('orders').select(orderColumns).order('created_at', { ascending: false })
    if (error) throw error
    return ((data ?? []) as unknown as OrderRow[]).map(toOrder)
  },

  async listItems(orderId: string): Promise<AdminOrderItem[]> {
    const { data, error } = await supabase
      .from('order_items')
      .select('id, order_id, product_id, variant_id, product_name, product_sku, variant_details, quantity, unit_price, total_price, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return ((data ?? []) as OrderItemRow[]).map(row => ({
      id: row.id,
      orderId: row.order_id,
      productId: row.product_id,
      variantId: row.variant_id,
      productName: row.product_name,
      productSku: row.product_sku ?? '',
      variantDetails: row.variant_details ?? '',
      quantity: row.quantity,
      unitPrice: Number(row.unit_price),
      totalPrice: Number(row.total_price),
      createdAt: row.created_at,
    }))
  },

  async get(id: string): Promise<AdminOrder> {
    const { data, error } = await supabase.from('orders').select(orderColumns).eq('id', id).single()
    if (error) throw error
    return toOrder(data as unknown as OrderRow)
  },

  async create(input: CreateOrderInput): Promise<{ order: AdminOrder; items: AdminOrderItem[] }> {
    const orderNumber = `DGS-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
    const { data, error } = await supabase.from('orders').insert({
      user_id: input.userId,
      order_number: orderNumber,
      status: 'en_attente' satisfies SupabaseOrderStatus,
      payment_status: 'en_attente' satisfies SupabasePaymentStatus,
      subtotal: input.subtotal,
      discount_amount: input.discountAmount,
      shipping_amount: input.shippingAmount,
      total_amount: input.totalAmount,
      shipping_method: input.shippingMethod,
      shipping_first_name: input.shippingFirstName || null,
      shipping_last_name: input.shippingLastName || null,
      shipping_phone: input.shippingPhone || null,
      shipping_address: input.shippingAddress || null,
      shipping_district: input.shippingDistrict || null,
      shipping_city: input.shippingCity || null,
      shipping_country: input.shippingCountry || null,
      tracking_number: null,
    }).select(orderColumns).single()
    if (error) throw error

    const order = toOrder(data as unknown as OrderRow)
    const { error: itemsError } = await supabase.from('order_items').insert(input.items.map(item => ({
      order_id: order.id,
      product_id: item.productId,
      variant_id: item.variantId,
      product_name: item.productName,
      product_sku: item.productSku || null,
      variant_details: item.variantDetails || null,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.unitPrice * item.quantity,
    })))

    if (itemsError) throw new OrderItemsCreationError(order, itemsError)
    return { order, items: await this.listItems(order.id) }
  },

  async updateStatus(id: string, status: SupabaseOrderStatus): Promise<AdminOrder> {
    const { data, error } = await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select(orderColumns).single()
    if (error) throw error
    return toOrder(data as unknown as OrderRow)
  },

  async updatePaymentStatus(id: string, paymentStatus: SupabasePaymentStatus): Promise<AdminOrder> {
    const { data, error } = await supabase.from('orders').update({ payment_status: paymentStatus, updated_at: new Date().toISOString() }).eq('id', id).select(orderColumns).single()
    if (error) throw error
    return toOrder(data as unknown as OrderRow)
  },
}
