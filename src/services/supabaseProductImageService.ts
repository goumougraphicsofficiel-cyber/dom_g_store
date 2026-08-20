import { supabase } from '../lib/supabase'

const BUCKET = 'product-images'

type ProductImageRow = {
  id: string
  product_id: string
  image_url: string
  sort_order: number | null
}

function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const markerIndex = url.indexOf(marker)
  return markerIndex === -1 ? null : decodeURIComponent(url.slice(markerIndex + marker.length))
}

function safeFileName(name: string): string {
  const extension = name.split('.').pop()?.toLowerCase() || 'jpg'
  return `${crypto.randomUUID()}.${extension.replace(/[^a-z0-9]/g, '') || 'jpg'}`
}

function storageErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/bucket.*not found|not found.*bucket/i.test(message)) {
    return 'Le bucket Supabase Storage « product-images » n’existe pas encore.'
  }
  return message
}

export class ProductImageSyncError extends Error {
  readonly cause: unknown

  constructor(cause: unknown) {
    super(`Synchronisation des photos impossible : ${storageErrorMessage(cause)}`)
    this.name = 'ProductImageSyncError'
    this.cause = cause
  }
}

async function cleanupUploadedFiles(paths: string[]) {
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
}

export const supabaseProductImageService = {
  async sync(productId: string, retainedUrls: string[], files: File[]): Promise<string[]> {
    const { data: existingData, error: existingError } = await supabase
      .from('product_images')
      .select('id, product_id, image_url, sort_order')
      .eq('product_id', productId)

    if (existingError) throw new ProductImageSyncError(existingError)

    const existingRows = (existingData ?? []) as ProductImageRow[]
    const retainedSet = new Set(retainedUrls)
    const removedRows = existingRows.filter(row => !retainedSet.has(row.image_url))
    const uploadedPaths: string[] = []
    const uploadedUrls: string[] = []

    try {
      for (const file of files) {
        const path = `products/${productId}/${safeFileName(file.name)}`
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
          contentType: file.type,
          upsert: false,
        })
        if (uploadError) throw uploadError

        uploadedPaths.push(path)
        uploadedUrls.push(supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl)
      }

      if (removedRows.length) {
        const { error: deleteRowsError } = await supabase
          .from('product_images')
          .delete()
          .in('id', removedRows.map(row => row.id))
        if (deleteRowsError) throw deleteRowsError
      }

      const existingUrlSet = new Set(existingRows.map(row => row.image_url))
      const missingRetainedUrls = retainedUrls.filter(url => !existingUrlSet.has(url))
      const finalUrls = [...retainedUrls, ...uploadedUrls]
      const urlsToInsert = [...missingRetainedUrls, ...uploadedUrls]

      if (urlsToInsert.length) {
        const { error: insertRowsError } = await supabase.from('product_images').insert(
          urlsToInsert.map(imageUrl => ({
            product_id: productId,
            image_url: imageUrl,
            sort_order: finalUrls.indexOf(imageUrl),
          })),
        )
        if (insertRowsError) throw insertRowsError
      }

      for (const row of existingRows.filter(item => retainedSet.has(item.image_url))) {
        const { error: sortError } = await supabase
          .from('product_images')
          .update({ sort_order: finalUrls.indexOf(row.image_url) })
          .eq('id', row.id)
        if (sortError) throw sortError
      }

      const { error: mainImageError } = await supabase
        .from('products')
        .update({ main_image_url: finalUrls[0] ?? null, updated_at: new Date().toISOString() })
        .eq('id', productId)
      if (mainImageError) throw mainImageError

      const removedPaths = removedRows
        .map(row => storagePathFromPublicUrl(row.image_url))
        .filter((path): path is string => path !== null)
      if (removedPaths.length) {
        const { error: removeStorageError } = await supabase.storage.from(BUCKET).remove(removedPaths)
        if (removeStorageError) throw removeStorageError
      }

      return finalUrls
    } catch (error) {
      await cleanupUploadedFiles(uploadedPaths)
      throw new ProductImageSyncError(error)
    }
  },

  async removeForProducts(productIds: string[]): Promise<void> {
    const { data, error } = await supabase
      .from('product_images')
      .select('image_url')
      .in('product_id', productIds)
    if (error) throw error

    const paths = (data ?? [])
      .map(row => storagePathFromPublicUrl(row.image_url))
      .filter((path): path is string => path !== null)
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths)
      if (storageError) throw storageError
    }

    const { error: rowsError } = await supabase.from('product_images').delete().in('product_id', productIds)
    if (rowsError) throw rowsError
  },
}
