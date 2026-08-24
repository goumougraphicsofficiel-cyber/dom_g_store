import { Heading, Text } from '@react-email/components'
import type { TransactionalOrder } from '../_lib/order-data'
import { Divider, EmailButton, EmailLayout, InfoRow, OrderItems, subheadingStyle, textStyle } from './components'

const money = (value: number) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)} GNF`
const date = (value: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value))

export function AdminNewOrderEmail({ order, adminUrl }: { order: TransactionalOrder; adminUrl: string }) {
  const customer = [order.shippingFirstName, order.shippingLastName].filter(Boolean).join(' ') || 'Client non renseigné'
  const address = [order.shippingAddress, order.shippingDistrict, order.shippingCity, order.shippingCountry].filter(Boolean).join(', ')
  return <EmailLayout preview={`Nouvelle commande ${order.orderNumber}`} title="Une nouvelle commande est arrivée">
    <InfoRow label="Commande" value={order.orderNumber}/><InfoRow label="Date" value={date(order.createdAt)}/><InfoRow label="Statut" value={order.status.replaceAll('_', ' ')}/>
    <Heading as="h2" style={subheadingStyle}>Client</Heading><Text style={textStyle}><strong>{customer}</strong><br/>{order.customerEmail}<br/>{order.shippingPhone || 'Téléphone non renseigné'}<br/>{address || 'Adresse non renseignée'}</Text>
    <OrderItems items={order.items} money={money}/><Divider/>
    <InfoRow label="Sous-total" value={money(order.subtotal)}/>{order.discountAmount > 0 ? <InfoRow label="Remise" value={`− ${money(order.discountAmount)}`}/> : null}<InfoRow label="Livraison" value={money(order.shippingAmount)}/><InfoRow label="Total" value={money(order.totalAmount)} strong/>
    <Text style={textStyle}>Livraison : {order.shippingMethod || 'Non renseignée'} · Statut du paiement : {order.paymentStatus.replaceAll('_', ' ')}</Text>
    <EmailButton href={adminUrl}>Ouvrir la commande</EmailButton>
  </EmailLayout>
}

export function adminOrderSubject(order: TransactionalOrder) {
  return `Nouvelle commande ${order.orderNumber} — ${money(order.totalAmount)}`
}
