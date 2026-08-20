import { supabase } from '../lib/supabase'

type ProductRelation = {
  id: string
  name: string
  sku: string | null
  main_image_url: string | null
}

type VariantRelation = {
  id: string
  sku: string | null
  size: string | null
  color: string | null
}

type InventoryRow = {
  id: string
  product_id: string
  variant_id: string | null
  quantity: number | null
  low_stock_threshold: number | null
  updated_at: string | null
}

export type StockStatus = 'rupture' | 'stock faible' | 'en stock'

export type InventoryItem = {
  id: string
  productId: string
  variantId: string | null
  productName: string
  productSku: string
  productImage: string
  variantSku: string
  variantLabel: string
  quantity: number
  lowStockThreshold: number
  updatedAt: string | null
  status: StockStatus
}

export type InventoryUpdate = Pick<InventoryItem, 'quantity' | 'lowStockThreshold'>

function getStatus(quantity: number, threshold: number): StockStatus {
  if (quantity === 0) return 'rupture'
  if (quantity <= threshold) return 'stock faible'
  return 'en stock'
}

function getVariantLabel(variant: VariantRelation | null): string {
  if (!variant) return 'Produit standard'
  return [variant.size, variant.color].filter(Boolean).join(' · ') || variant.sku || 'Variante'
}

function toInventoryItem(row: InventoryRow, product: ProductRelation, variant: VariantRelation | null): InventoryItem {
  const quantity = row.quantity ?? 0
  const lowStockThreshold = row.low_stock_threshold ?? 0

  return {
    id: row.id,
    productId: row.product_id,
    variantId: row.variant_id,
    productName: product.name,
    productSku: product.sku ?? '—',
    productImage: product.main_image_url ?? '',
    variantSku: variant?.sku ?? '',
    variantLabel: getVariantLabel(variant),
    quantity,
    lowStockThreshold,
    updatedAt: row.updated_at,
    status: getStatus(quantity, lowStockThreshold),
  }
}

export const supabaseInventoryService = {
  async list(): Promise<InventoryItem[]> {
    const { data, error } = await supabase
      .from('inventory')
      .select('id, product_id, variant_id, quantity, low_stock_threshold, updated_at')
      .order('updated_at', { ascending: false })

    if (error) throw error
    const rows = (data ?? []) as InventoryRow[]
    if (!rows.length) return []

    const productIds = [...new Set(rows.map(row => row.product_id))]
    const variantIds = [...new Set(rows.map(row => row.variant_id).filter((id): id is string => id !== null))]
    const [productsResult, variantsResult] = await Promise.all([
      supabase.from('products').select('id, name, sku, main_image_url').in('id', productIds),
      variantIds.length
        ? supabase.from('product_variants').select('id, sku, size, color').in('id', variantIds)
        : Promise.resolve({ data: [] as VariantRelation[], error: null }),
    ])

    if (productsResult.error) throw productsResult.error
    if (variantsResult.error) throw variantsResult.error

    const products = new Map((productsResult.data as ProductRelation[]).map(product => [product.id, product]))
    const variants = new Map((variantsResult.data as VariantRelation[]).map(variant => [variant.id, variant]))

    return rows.map(row => {
      const product = products.get(row.product_id)
      if (!product) throw new Error(`Produit introuvable pour la ligne d’inventaire ${row.id}.`)
      return toInventoryItem(row, product, row.variant_id ? variants.get(row.variant_id) ?? null : null)
    })
  },

  async update(id: string, values: InventoryUpdate): Promise<InventoryItem> {
    const { data, error } = await supabase
      .from('inventory')
      .update({
        quantity: values.quantity,
        low_stock_threshold: values.lowStockThreshold,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, product_id, variant_id, quantity, low_stock_threshold, updated_at')
      .single()

    if (error) throw error
    const row = data as InventoryRow
    const [productResult, variantResult] = await Promise.all([
      supabase.from('products').select('id, name, sku, main_image_url').eq('id', row.product_id).single(),
      row.variant_id
        ? supabase.from('product_variants').select('id, sku, size, color').eq('id', row.variant_id).single()
        : Promise.resolve({ data: null, error: null }),
    ])
    if (productResult.error) throw productResult.error
    if (variantResult.error) throw variantResult.error
    return toInventoryItem(row, productResult.data as ProductRelation, variantResult.data as VariantRelation | null)
  },
}
