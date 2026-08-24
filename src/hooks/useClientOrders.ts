import { useEffect, useState } from 'react'
import { supabaseOrderService, type ClientOrder } from '../services/supabaseOrderService'

export function useClientOrders() {
  const [orders, setOrders] = useState<ClientOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    void supabaseOrderService.listForCurrentUser()
      .then(rows => {
        if (!active) return
        setOrders(rows)
        setError(null)
      })
      .catch(cause => {
        if (!active) return
        console.error('Impossible de charger les commandes du client depuis Supabase.', cause)
        setError(cause instanceof Error ? cause.message : 'Impossible de charger vos commandes.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return { orders, loading, error }
}
