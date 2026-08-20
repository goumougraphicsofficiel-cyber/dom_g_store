import { supabase } from '../lib/supabase'

const BUCKET = 'product-images'

function safeFileName(name: string) {
  const extension = name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  return `${crypto.randomUUID()}.${extension}`
}

function categoryStoragePath(url: string, categoryId: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const markerIndex = url.indexOf(marker)
  if (markerIndex === -1) return null
  const path = decodeURIComponent(url.slice(markerIndex + marker.length))
  return path.startsWith(`categories/${categoryId}/`) ? path : null
}

export type CategoryImageUploadResult = { imageUrl: string; cleanupWarning: string | null }

export const supabaseCategoryImageService = {
  async upload(categoryId: string, file: File, previousUrl: string): Promise<CategoryImageUploadResult> {
    const path = `categories/${categoryId}/${safeFileName(file.name)}`
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    })
    if (uploadError) throw uploadError

    const imageUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    const { error: updateError } = await supabase
      .from('categories')
      .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq('id', categoryId)
      .select('id')
      .single()

    if (updateError) {
      await supabase.storage.from(BUCKET).remove([path])
      throw updateError
    }

    const previousPath = categoryStoragePath(previousUrl, categoryId)
    if (previousPath) {
      const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([previousPath])
      return { imageUrl, cleanupWarning: cleanupError?.message ?? null }
    }
    return { imageUrl, cleanupWarning: null }
  },

  async remove(categoryId: string, imageUrl: string): Promise<void> {
    const path = categoryStoragePath(imageUrl, categoryId)
    if (!path) return
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) throw error
  },
}
