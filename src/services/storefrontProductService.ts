import { supabase } from '../lib/supabase'
import type { Product } from '../types'

type StorefrontProductRow = {
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
  main_image_url: string | null
  status: 'actif' | 'inactif' | 'brouillon' | null
  featured: boolean | null
  is_new: boolean | null
  category: { id: string; name: string; slug: string } | null
  inventory: Array<{ variant_id: string | null; quantity: number | null; low_stock_threshold: number | null }>
  product_images: Array<{ image_url: string; sort_order: number | null }>
}

const storefrontColumns = `
  id, category_id, name, slug, sku, brand, short_description, description,
  price, old_price, main_image_url, status, featured, is_new,
  category:categories!products_category_id_fkey (id, name, slug),
  inventory:inventory!inventory_product_id_fkey (variant_id, quantity, low_stock_threshold),
  product_images!product_images_product_id_fkey (image_url, sort_order)
`

function toStorefrontProduct(row: StorefrontProductRow): Product {
  const inventory = row.inventory.find(item => item.variant_id === null)
  const gallery = [...row.product_images]
    .sort((first, second) => (first.sort_order ?? 0) - (second.sort_order ?? 0))
    .map(item => item.image_url)
  const images = gallery.length > 0 ? gallery : row.main_image_url ? [row.main_image_url] : []

  return {
    id: row.id,
    reference: row.sku ?? '',
    name: row.name,
    slug: row.slug,
    category: row.category?.slug ?? '',
    categoryName: row.category?.name ?? '',
    brand: row.brand ?? '',
    description: row.short_description ?? row.description ?? '',
    details: row.description ?? row.short_description ?? '',
    price: Number(row.price),
    oldPrice: row.old_price === null ? undefined : Number(row.old_price),
    stock: inventory?.quantity ?? 0,
    alertStock: inventory?.low_stock_threshold ?? 0,
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

export const storefrontProductService = {
  async list(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select(storefrontColumns)
      .eq('status', 'actif')
      .order('created_at', { ascending: false })

    if (error) throw error
    return ((data ?? []) as unknown as StorefrontProductRow[]).map(toStorefrontProduct)
  },
}
