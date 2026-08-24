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

export type ClientOrder = {
  id: string
  orderNumber: string
  status: SupabaseOrderStatus
  paymentStatus: SupabasePaymentStatus
  totalAmount: number
  createdAt: string
}

type ClientOrderRow = {
  id: string
  order_number: string
  status: SupabaseOrderStatus
  payment_status: SupabasePaymentStatus
  total_amount: number | string
  created_at: string
}

export type CreateOrderItemInput = {
  productId: string
  variantId: string | null
  variantDetails: string
  quantity: number
}

export type CreateOrderInput = {
  orderNumber: string
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

export type OrderCreationErrorCode = 'stock' | 'product' | 'variant' | 'inventory' | 'auth' | 'unknown'

export class OrderCreationError extends Error {
  readonly code: OrderCreationErrorCode
  readonly cause?: unknown

  constructor(message: string, code: OrderCreationErrorCode, cause?: unknown) {
    super(message)
    this.name = 'OrderCreationError'
    this.code = code
    this.cause = cause
  }
}

type CreateOrderRpcRow = { order_id: string; order_number: string }

export function createOrderNumber() {
  return `DGS-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`
}

function rpcCreationError(error: { message: string }): OrderCreationError {
  if (error.message.includes('INSUFFICIENT_STOCK')) return new OrderCreationError('Stock insuffisant pour l’un des produits de votre panier.', 'stock', error)
  if (error.message.includes('INVENTORY_NOT_FOUND')) return new OrderCreationError('Le stock de l’un des produits est indisponible.', 'inventory', error)
  if (error.message.includes('PRODUCT_UNAVAILABLE')) return new OrderCreationError('L’un des produits de votre panier n’est plus disponible.', 'product', error)
  if (error.message.includes('VARIANT_UNAVAILABLE')) return new OrderCreationError('L’une des variantes sélectionnées n’est plus disponible.', 'variant', error)
  if (error.message.includes('AUTH_REQUIRED') || error.message.includes('ACTIVE_CLIENT_PROFILE_REQUIRED')) return new OrderCreationError('Votre session client n’est plus valide. Veuillez vous reconnecter.', 'auth', error)
  return new OrderCreationError('Impossible d’enregistrer la commande. Votre panier a été conservé.', 'unknown', error)
}

const orderColumns = `
  id, user_id, order_number, status, payment_status, subtotal, discount_amount,
  shipping_amount, total_amount, shipping_method, shipping_first_name,
  shipping_last_name, shipping_phone, shipping_address, shipping_district,
  shipping_city, shipping_country, tracking_number, created_at, updated_at,
  profile:profiles!orders_user_id_fkey (first_name, last_name, phone)
`

const clientOrderDetailColumns = `
  id, user_id, order_number, status, payment_status, subtotal, discount_amount,
  shipping_amount, total_amount, shipping_method, shipping_first_name,
  shipping_last_name, shipping_phone, shipping_address, shipping_district,
  shipping_city, shipping_country, tracking_number, created_at, updated_at
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
  async listForCurrentUser(): Promise<ClientOrder[]> {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!authData.user) throw new Error('Votre session a expiré. Veuillez vous reconnecter.')

    const { data, error } = await supabase
      .from('orders')
      .select('id, order_number, status, payment_status, total_amount, created_at')
      .eq('user_id', authData.user.id)
      .order('created_at', { ascending: false })

    if (error) throw error
    return ((data ?? []) as ClientOrderRow[]).map(row => ({
      id: row.id,
      orderNumber: row.order_number,
      status: row.status,
      paymentStatus: row.payment_status,
      totalAmount: Number(row.total_amount),
      createdAt: row.created_at,
    }))
  },

  async list(): Promise<AdminOrder[]> {
    const { data, error } = await supabase.from('orders').select(orderColumns).order('created_at', { ascending: false })
    if (error) throw error
    return ((data ?? []) as unknown as OrderRow[]).map(toOrder)
  },

  async getForCurrentUser(id: string): Promise<{ order: AdminOrder; items: AdminOrderItem[] } | null> {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    if (!authData.user) throw new Error('Votre session a expiré. Veuillez vous reconnecter.')

    const { data, error } = await supabase
      .from('orders')
      .select(clientOrderDetailColumns)
      .eq('id', id)
      .eq('user_id', authData.user.id)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    const order = toOrder({ ...(data as Omit<OrderRow, 'profile'>), profile: null })
    return { order, items: await this.listItems(order.id) }
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

  async getAdminDetail(id: string): Promise<{ order: AdminOrder; items: AdminOrderItem[] } | null> {
    const { data, error } = await supabase.from('orders').select(orderColumns).eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) return null
    const order = toOrder(data as unknown as OrderRow)
    return { order, items: await this.listItems(order.id) }
  },

  async create(input: CreateOrderInput): Promise<{ order: AdminOrder; items: AdminOrderItem[] }> {
    const { data, error } = await supabase.rpc('create_order_with_stock', {
      p_order_number: input.orderNumber,
      p_shipping: {
        method: input.shippingMethod,
        first_name: input.shippingFirstName,
        last_name: input.shippingLastName,
        phone: input.shippingPhone,
        address: input.shippingAddress,
        district: input.shippingDistrict,
        city: input.shippingCity,
        country: input.shippingCountry,
      },
      p_items: input.items.map(item => ({
      product_id: item.productId,
      variant_id: item.variantId,
      variant_details: item.variantDetails || null,
      quantity: item.quantity,
      })),
    })
    if (error) throw rpcCreationError(error)

    const result = ((data ?? []) as CreateOrderRpcRow[])[0]
    if (!result?.order_id) throw new OrderCreationError('Supabase n’a pas retourné la commande créée.', 'unknown')
    const detail = await this.getForCurrentUser(result.order_id)
    if (!detail) throw new OrderCreationError(`La commande ${result.order_number} a été créée mais ne peut pas être relue.`, 'unknown')
    return detail
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
