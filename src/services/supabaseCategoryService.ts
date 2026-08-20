import { supabase } from '../lib/supabase'
import type { Category } from '../types'

type CategoryStatus = 'actif' | 'inactif'

type CategoryRow = {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  status: CategoryStatus | null
  products?: Array<{ count: number }>
}

export type AdminCategory = Category & { productCount: number }

export type CategoryInput = Pick<Category, 'name' | 'slug' | 'description' | 'image' | 'active'>

const categoryColumns = 'id, name, slug, description, image_url, status, products(count)'

function toAdminCategory(row: CategoryRow): AdminCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? '',
    image: row.image_url ?? '',
    active: row.status === 'actif',
    productCount: row.products?.[0]?.count ?? 0,
  }
}

function toCategoryPayload(category: CategoryInput) {
  return {
    name: category.name.trim(),
    slug: category.slug.trim(),
    description: category.description.trim() || null,
    image_url: category.image.trim() || null,
    status: (category.active ? 'actif' : 'inactif') as CategoryStatus,
    updated_at: new Date().toISOString(),
  }
}

export const supabaseCategoryService = {
  async list(): Promise<AdminCategory[]> {
    const { data, error } = await supabase
      .from('categories')
      .select(categoryColumns)
      .order('name', { ascending: true })

    if (error) throw error
    return ((data ?? []) as CategoryRow[]).map(toAdminCategory)
  },

  async create(category: CategoryInput): Promise<AdminCategory> {
    const { data, error } = await supabase
      .from('categories')
      .insert(toCategoryPayload(category))
      .select(categoryColumns)
      .single()

    if (error) throw error
    return toAdminCategory(data as CategoryRow)
  },

  async update(id: string, category: CategoryInput): Promise<AdminCategory> {
    const { data, error } = await supabase
      .from('categories')
      .update(toCategoryPayload(category))
      .eq('id', id)
      .select(categoryColumns)
      .single()

    if (error) throw error
    return toAdminCategory(data as CategoryRow)
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
  },
}
