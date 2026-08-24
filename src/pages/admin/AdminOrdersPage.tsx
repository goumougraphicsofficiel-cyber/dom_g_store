import { useEffect, useState } from 'react'
import { Eye, Search } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Card, EmptyState, Input, LoadingSkeleton, PageHeader } from '../../components/ui'
import { ORDER_STATUSES, PAYMENT_STATUSES, supabaseOrderService, type AdminOrder, type AdminOrderItem, type SupabaseOrderStatus, type SupabasePaymentStatus } from '../../services/supabaseOrderService'
import { money } from '../../utils'
import { sendOrderStatusEmail } from '../../services/transactionalEmailService'
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

  const mergeOrder = (updated: AdminOrder) => {
    setOrders(current => current.map(order => order.id === updated.id ? updated : order))
  }

  const changeStatus = async (order: AdminOrder, status: SupabaseOrderStatus) => {
    setUpdatingId(order.id)
    try {
      mergeOrder(await supabaseOrderService.updateStatus(order.id, status))
      try { await sendOrderStatusEmail(order.id, status); toast.success('Statut mis à jour et e-mail envoyé') }
      catch { toast.warning('Statut mis à jour, mais l’e-mail client n’a pas pu être envoyé.') }
    }
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
    {loading ? <LoadingSkeleton/> : error ? <EmptyState title="Impossible de charger les commandes" text={error}/> : orders.length === 0 ? <EmptyState title="Aucune commande" text="Les commandes enregistrées dans Supabase apparaîtront ici."/> : filtered.length === 0 ? <EmptyState title="Aucun résultat" text="Modifiez votre recherche."/> : <div className="table-wrap"><table><thead><tr><th>N°</th><th>Client</th><th>Téléphone</th><th>Date</th><th>Montant</th><th>Livraison</th><th>Paiement</th><th>Statut</th><th>Action</th></tr></thead><tbody>{filtered.map(order => <tr key={order.id}>
      <td><strong>{order.orderNumber}</strong></td><td>{order.customerName}</td><td>{order.customerPhone||'—'}</td><td>{formatDate(order.createdAt)}</td><td>{money(order.totalAmount)}</td><td>{order.shippingMethod||'—'}</td>
      <td><select aria-label={`Statut de paiement de ${order.orderNumber}`} disabled={updatingId === order.id} value={order.paymentStatus} onChange={event => void changePaymentStatus(order, event.target.value as SupabasePaymentStatus)}>{PAYMENT_STATUSES.map(status => <option value={status} key={status}>{paymentLabels[status]}</option>)}</select></td>
      <td><select aria-label={`Statut de ${order.orderNumber}`} disabled={updatingId === order.id} value={order.status} onChange={event => void changeStatus(order, event.target.value as SupabaseOrderStatus)}>{ORDER_STATUSES.map(status => <option value={status} key={status}>{orderLabels[status]}</option>)}</select></td>
      <td>{updatingId===order.id?<small role="status">Mise à jour…</small>:<Link className="icon-btn" aria-label={`Voir ${order.orderNumber}`} to={`/admin/commandes/${order.id}`}><Eye/></Link>}</td>
    </tr>)}</tbody></table></div>}
  </AdminLayout>
}

export function AdminOrderDetailPage() {
  const { id } = useParams()
  const [detail, setDetail] = useState<{ order: AdminOrder; items: AdminOrderItem[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    let active = true
    if (!id) return () => { active = false }
    void supabaseOrderService.getAdminDetail(id).then(result => { if (active) setDetail(result) }).catch(cause => {
      if (!active) return
      setError(errorMessage(cause))
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  const updateOrder = async (kind: 'order' | 'payment', value: SupabaseOrderStatus | SupabasePaymentStatus) => {
    if (!detail) return
    setUpdating(true)
    try {
      const order = kind === 'order'
        ? await supabaseOrderService.updateStatus(detail.order.id, value as SupabaseOrderStatus)
        : await supabaseOrderService.updatePaymentStatus(detail.order.id, value as SupabasePaymentStatus)
      setDetail(current => current ? { ...current, order } : current)
      if (kind === 'order') {
        try { await sendOrderStatusEmail(order.id, order.status); toast.success('Statut mis à jour et e-mail envoyé') }
        catch { toast.warning('Statut mis à jour, mais l’e-mail client n’a pas pu être envoyé.') }
      } else toast.success('Statut de paiement mis à jour')
    } catch (cause) {
      toast.error(`Mise à jour impossible : ${errorMessage(cause)}`)
    } finally { setUpdating(false) }
  }

  if (loading) return <AdminLayout><LoadingSkeleton/></AdminLayout>
  if (error) return <AdminLayout><EmptyState title="Impossible de charger la commande" text={error}/><Link className="btn secondary" to="/admin/commandes">Retour aux commandes</Link></AdminLayout>
  if (!detail) return <AdminLayout><EmptyState title="Commande introuvable"/><Link className="btn secondary" to="/admin/commandes">Retour aux commandes</Link></AdminLayout>

  const { order, items } = detail
  return <AdminLayout><PageHeader title={`Commande ${order.orderNumber}`} description={`Créée le ${formatDate(order.createdAt)}`} action={<Link className="btn secondary" to="/admin/commandes">Retour aux commandes</Link>}/><Card><div className="order-detail-grid"><label>Statut de commande<select disabled={updating} value={order.status} onChange={event => void updateOrder('order', event.target.value as SupabaseOrderStatus)}>{ORDER_STATUSES.map(status => <option key={status} value={status}>{orderLabels[status]}</option>)}</select></label><label>Statut du paiement<select disabled={updating} value={order.paymentStatus} onChange={event => void updateOrder('payment', event.target.value as SupabasePaymentStatus)}>{PAYMENT_STATUSES.map(status => <option key={status} value={status}>{paymentLabels[status]}</option>)}</select></label></div>{updating?<p role="status">Mise à jour en cours…</p>:null}</Card><Card><h2>Client et livraison</h2><p><strong>{order.customerName}</strong><br/>{order.customerPhone||'Téléphone non renseigné'}<br/>{order.shippingAddress||'Adresse non renseignée'}<br/>{[order.shippingDistrict,order.shippingCity,order.shippingCountry].filter(Boolean).join(', ')}</p><p>Méthode : {order.shippingMethod||'Non renseignée'}{order.trackingNumber?<><br/>Suivi : {order.trackingNumber}</>:null}</p></Card><Card><h2>Articles</h2>{items.length?items.map(item=><div className="invoice-line" key={item.id}><span><strong>{item.productName}</strong><small>{item.productSku||'SKU non renseigné'}{item.variantDetails?` · ${item.variantDetails}`:''}</small></span><span>{item.quantity} × {money(item.unitPrice)}</span><strong>{money(item.totalPrice)}</strong></div>):<EmptyState title="Aucun article" text="Aucun article n’est associé à cette commande."/>}<div className="invoice-totals"><span>Sous-total <b>{money(order.subtotal)}</b></span><span>Réduction <b>-{money(order.discountAmount)}</b></span><span>Livraison <b>{money(order.shippingAmount)}</b></span><span className="total">Total <b>{money(order.totalAmount)}</b></span></div></Card><Link className="btn secondary" to="/admin/commandes">Retour aux commandes</Link></AdminLayout>
}
