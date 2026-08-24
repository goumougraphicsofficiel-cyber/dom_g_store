import { useEffect, useState } from 'react'
import {
  supabaseOrderService,
  type AdminOrder,
  type AdminOrderItem,
} from '../services/supabaseOrderService'

type ClientOrderDetail = { order: AdminOrder; items: AdminOrderItem[] }

export function useClientOrder(id: string | undefined) {
  const [detail, setDetail] = useState<ClientOrderDetail | null>(null)
  const [loading, setLoading] = useState(Boolean(id))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    if (!id) {
      return () => { active = false }
    }

    void supabaseOrderService.getForCurrentUser(id)
      .then(result => {
        if (!active) return
        setDetail(result)
        setError(null)
      })
      .catch(cause => {
        if (!active) return
        console.error('Impossible de charger le détail de la commande depuis Supabase.', cause)
        setError(cause instanceof Error ? cause.message : 'Impossible de charger cette commande.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [id])

  return { detail, loading, error }
}
