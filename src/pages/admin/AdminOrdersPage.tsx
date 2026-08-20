import { useEffect, useState } from 'react'
import { Eye, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge, EmptyState, Input, LoadingSkeleton, Modal, PageHeader, StatusBadge } from '../../components/ui'
import { ORDER_STATUSES, PAYMENT_STATUSES, supabaseOrderService, type AdminOrder, type AdminOrderItem, type SupabaseOrderStatus, type SupabasePaymentStatus } from '../../services/supabaseOrderService'
import { money } from '../../utils'
import { AdminLayout } from './AdminPages'

const orderLabels: Record<SupabaseOrderStatus, string> = {
  en_attente: 'En attente', confirmee: 'Confirmée', preparation: 'En préparation',
  expediee: 'Expédiée', livree: 'Livrée', annulee: 'Annulée', remboursee: 'Remboursée',
}
const paymentLabels: Record<SupabasePaymentStatus, string> = {
  en_attente: 'En attente', paye: 'Payé', echoue: 'Échoué', rembourse: 'Remboursé',
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return 'Une erreur inattendue est survenue avec Supabase.'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-GN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null)
  const [items, setItems] = useState<AdminOrderItem[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    let active = true
    void supabaseOrderService.list().then(rows => { if (active) setOrders(rows) }).catch(cause => {
      if (!active) return
      const message = errorMessage(cause)
      setError(message)
      toast.error(`Impossible de charger les commandes : ${message}`)
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const openDetail = async (order: AdminOrder) => {
    setSelectedOrder(order)
    setItems([])
    setDetailError('')
    setDetailLoading(true)
    try { setItems(await supabaseOrderService.listItems(order.id)) }
    catch (cause) {
      const message = errorMessage(cause)
      setDetailError(message)
      toast.error(`Impossible de charger les articles : ${message}`)
    } finally { setDetailLoading(false) }
  }

  const mergeOrder = (updated: AdminOrder) => {
    setOrders(current => current.map(order => order.id === updated.id ? updated : order))
    setSelectedOrder(current => current?.id === updated.id ? updated : current)
  }

  const changeStatus = async (order: AdminOrder, status: SupabaseOrderStatus) => {
    setUpdatingId(order.id)
    try { mergeOrder(await supabaseOrderService.updateStatus(order.id, status)); toast.success('Statut de commande mis à jour') }
    catch (cause) { toast.error(`Mise à jour impossible : ${errorMessage(cause)}`) }
    finally { setUpdatingId(null) }
  }

  const changePaymentStatus = async (order: AdminOrder, status: SupabasePaymentStatus) => {
    setUpdatingId(order.id)
    try { mergeOrder(await supabaseOrderService.updatePaymentStatus(order.id, status)); toast.success('Statut de paiement mis à jour') }
    catch (cause) { toast.error(`Mise à jour impossible : ${errorMessage(cause)}`) }
    finally { setUpdatingId(null) }
  }

  const needle = query.trim().toLowerCase()
  const filtered = orders.filter(order => !needle || `${order.orderNumber} ${order.customerName}`.toLowerCase().includes(needle))

  return <AdminLayout>
    <PageHeader title="Commandes" description="Suivez les paiements, préparations et livraisons."/>
    <div className="table-tools"><div className="search-field"><Search/><Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Numéro de commande ou client…"/></div></div>
    {loading ? <LoadingSkeleton/> : error ? <EmptyState title="Impossible de charger les commandes" text={error}/> : orders.length === 0 ? <EmptyState title="Aucune commande" text="Les commandes enregistrées dans Supabase apparaîtront ici."/> : filtered.length === 0 ? <EmptyState title="Aucun résultat" text="Modifiez votre recherche."/> : <div className="table-wrap"><table><thead><tr><th>N°</th><th>Client</th><th>Date</th><th>Montant</th><th>Paiement</th><th>Statut</th><th>Action</th></tr></thead><tbody>{filtered.map(order => <tr key={order.id}>
      <td><strong>{order.orderNumber}</strong></td><td>{order.customerName}</td><td>{formatDate(order.createdAt)}</td><td>{money(order.totalAmount)}</td>
      <td><select aria-label={`Statut de paiement de ${order.orderNumber}`} disabled={updatingId === order.id} value={order.paymentStatus} onChange={event => void changePaymentStatus(order, event.target.value as SupabasePaymentStatus)}>{PAYMENT_STATUSES.map(status => <option value={status} key={status}>{paymentLabels[status]}</option>)}</select></td>
      <td><select aria-label={`Statut de ${order.orderNumber}`} disabled={updatingId === order.id} value={order.status} onChange={event => void changeStatus(order, event.target.value as SupabaseOrderStatus)}>{ORDER_STATUSES.map(status => <option value={status} key={status}>{orderLabels[status]}</option>)}</select></td>
      <td><button className="icon-btn" aria-label={`Voir ${order.orderNumber}`} onClick={() => void openDetail(order)}><Eye/></button></td>
    </tr>)}</tbody></table></div>}

    <Modal open={selectedOrder !== null} onClose={() => { if (!detailLoading) setSelectedOrder(null) }} title={selectedOrder ? `Commande ${selectedOrder.orderNumber}` : 'Commande'}>
      {selectedOrder ? <div className="admin-order-detail">
        <div className="between"><StatusBadge status={orderLabels[selectedOrder.status]}/><Badge tone="info">Paiement : {paymentLabels[selectedOrder.paymentStatus]}</Badge></div>
        <section><h3>Articles</h3>{detailLoading ? <LoadingSkeleton/> : detailError ? <EmptyState title="Impossible de charger les articles" text={detailError}/> : items.length === 0 ? <EmptyState title="Aucun article enregistré"/> : items.map(item => <div className="invoice-line" key={item.id}><span><strong>{item.productName}</strong><small>{[item.productSku, item.variantDetails].filter(Boolean).join(' · ') || 'Sans variante'}</small></span><span>{item.quantity} × {money(item.unitPrice)}</span><strong>{money(item.totalPrice)}</strong></div>)}</section>
        <div className="order-detail-grid"><section><h3>Livraison</h3><p><strong>{[selectedOrder.shippingFirstName, selectedOrder.shippingLastName].filter(Boolean).join(' ') || 'Non renseigné'}</strong><br/>{selectedOrder.shippingPhone || 'Téléphone non renseigné'}<br/>{selectedOrder.shippingAddress || 'Adresse non renseignée'}<br/>{[selectedOrder.shippingDistrict, selectedOrder.shippingCity, selectedOrder.shippingCountry].filter(Boolean).join(', ')}</p><p>Mode : {selectedOrder.shippingMethod || 'Non renseigné'}<br/>Suivi : {selectedOrder.trackingNumber || 'Non attribué'}</p></section>
        <section><h3>Récapitulatif</h3><div className="invoice-totals"><span>Sous-total <strong>{money(selectedOrder.subtotal)}</strong></span><span>Réduction <strong>- {money(selectedOrder.discountAmount)}</strong></span><span>Livraison <strong>{money(selectedOrder.shippingAmount)}</strong></span><span className="total">Total <strong>{money(selectedOrder.totalAmount)}</strong></span></div></section></div>
      </div> : null}
    </Modal>
  </AdminLayout>
}
