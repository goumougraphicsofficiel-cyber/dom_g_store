import { supabase } from '../lib/supabase'
import type { Product } from '../types'
import { supabaseProductImageService } from './supabaseProductImageService'

type CategoryRelation = {
  id: string
  name: string
  slug: string
}

type InventoryRelation = {
  id: string
  variant_id: string | null
  quantity: number | null
  low_stock_threshold: number | null
}

type ProductImageRelation = {
  id: string
  image_url: string
  sort_order: number | null
}

type ProductRow = {
  id: string
  category_id: string | null
  name: string
  slug: string
  sku: string | null
  brand: string | null
  short_description: string | null
  description: string | null
  price: number | string
  old_price: number | string | null
  cost_price: number | string | null
  main_image_url: string | null
  status: 'actif' | 'inactif' | 'brouillon' | null
  featured: boolean | null
  is_new: boolean | null
  category: CategoryRelation | null
  inventory: InventoryRelation[]
  product_images: ProductImageRelation[]
}

const productColumns = `
  id,
  category_id,
  name,
  slug,
  sku,
  brand,
  short_description,
  description,
  price,
  old_price,
  cost_price,
  main_image_url,
  status,
  featured,
  is_new,
  category:categories!products_category_id_fkey (id, name, slug),
  inventory:inventory!inventory_product_id_fkey (id, variant_id, quantity, low_stock_threshold),
  product_images!product_images_product_id_fkey (id, image_url, sort_order)
`

function nullableNumber(value: number | string | null): number | undefined {
  return value === null ? undefined : Number(value)
}

function toProduct(row: ProductRow): Product {
  const standardInventory = row.inventory.find(item => item.variant_id === null)
  const galleryUrls = [...row.product_images]
    .sort((first, second) => (first.sort_order ?? 0) - (second.sort_order ?? 0))
    .map(item => item.image_url)
  const images = row.main_image_url
    ? [row.main_image_url, ...galleryUrls.filter(url => url !== row.main_image_url)]
    : galleryUrls

  return {
    id: row.id,
    reference: row.sku ?? '',
    name: row.name,
    slug: row.slug,
    category: row.category_id ?? '',
    brand: row.brand ?? '',
    description: row.description ?? '',
    details: row.short_description ?? '',
    price: Number(row.price),
    oldPrice: nullableNumber(row.old_price),
    cost: nullableNumber(row.cost_price),
    stock: standardInventory?.quantity ?? 0,
    alertStock: standardInventory?.low_stock_threshold ?? 0,
    image: images[0] ?? '',
    images,
    rating: 0,
    reviews: 0,
    specs: {},
    featured: row.featured ?? false,
    isNew: row.is_new ?? false,
    active: row.status === 'actif',
  }
}

function toProductPayload(product: Product) {
  return {
    category_id: product.category || null,
    name: product.name.trim(),
    slug: product.slug.trim(),
    sku: product.reference.trim() || null,
    brand: product.brand.trim() || null,
    short_description: product.details.trim() || null,
    description: product.description.trim() || null,
    price: product.price,
    old_price: product.oldPrice ?? null,
    cost_price: product.cost ?? null,
    main_image_url: product.image.trim() || null,
    status: product.active ? 'actif' : 'inactif',
    featured: product.featured ?? false,
    is_new: product.isNew ?? false,
    updated_at: new Date().toISOString(),
  }
}

async function syncStandardInventory(productId: string, quantity: number, lowStockThreshold: number) {
  const { data: existingRows, error: lookupError } = await supabase
    .from('inventory')
    .select('id')
    .eq('product_id', productId)
    .is('variant_id', null)
    .order('updated_at', { ascending: false })

  if (lookupError) throw lookupError

  const values = {
    quantity,
    low_stock_threshold: lowStockThreshold,
    updated_at: new Date().toISOString(),
  }

  if (existingRows?.[0]) {
    const { error } = await supabase
      .from('inventory')
      .update(values)
      .eq('id', existingRows[0].id)
      .select('id')
      .single()
    if (error) throw error

    const duplicateIds = existingRows.slice(1).map(row => row.id)
    if (duplicateIds.length) {
      const { error: duplicateError } = await supabase.from('inventory').delete().in('id', duplicateIds)
      if (duplicateError) throw duplicateError
    }
    return
  }

  const { error } = await supabase
    .from('inventory')
    .insert({ product_id: productId, variant_id: null, ...values })
    .select('id')
    .single()
  if (error) throw error
}

export class ProductInventorySyncError extends Error {
  readonly product: Product
  readonly cause: unknown

  constructor(product: Product, cause: unknown) {
    super(`Le produit « ${product.name} » a été enregistré, mais la synchronisation du stock a échoué.`)
    this.name = 'ProductInventorySyncError'
    this.product = product
    this.cause = cause
  }
}

async function synchronizeSavedProduct(row: ProductRow, stock: number, alertStock: number): Promise<Product> {
  const savedProduct = { ...toProduct(row), stock, alertStock }
  try {
    await syncStandardInventory(row.id, stock, alertStock)
    return savedProduct
  } catch (error) {
    throw new ProductInventorySyncError(savedProduct, error)
  }
}

export const supabaseProductService = {
  async list(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(productColumns)
      .order('created_at', { ascending: false })

    if (error) throw error
    return ((data ?? []) as unknown as ProductRow[]).map(toProduct)
  },

  async create(product: Product): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert(toProductPayload(product))
      .select(productColumns)
      .single()

    if (error) throw error
    return synchronizeSavedProduct(data as unknown as ProductRow, product.stock, product.alertStock)
  },

  async update(product: Product): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update(toProductPayload(product))
      .eq('id', product.id)
      .select(productColumns)
      .single()

    if (error) throw error
    return synchronizeSavedProduct(data as unknown as ProductRow, product.stock, product.alertStock)
  },

  async remove(ids: string[]): Promise<void> {
    await supabaseProductImageService.removeForProducts(ids)
    const { error: inventoryError } = await supabase.from('inventory').delete().in('product_id', ids)
    if (inventoryError) throw inventoryError
    const { error: productError } = await supabase.from('products').delete().in('id', ids)
    if (productError) throw productError
  },
}
