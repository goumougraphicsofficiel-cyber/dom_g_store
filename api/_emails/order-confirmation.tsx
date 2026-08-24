import { Heading, Text } from '@react-email/components'
import type { TransactionalOrder } from '../_lib/order-data'
import { Divider, EmailButton, EmailLayout, InfoRow, OrderItems, subheadingStyle, textStyle } from './components'

const money = (value: number) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)} GNF`
const date = (value: string) => new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value))
const status = (value: string) => value.replaceAll('_', ' ')

export function OrderConfirmationEmail({ order, orderUrl }: { order: TransactionalOrder; orderUrl: string }) {
  const customerName = [order.shippingFirstName, order.shippingLastName].filter(Boolean).join(' ') || 'cher client'
  const address = [order.shippingAddress, order.shippingDistrict, order.shippingCity, order.shippingCountry].filter(Boolean).join(', ')
  return <EmailLayout preview={`Confirmation de votre commande ${order.orderNumber}`} title="Votre commande est bien enregistrée">
    <Text style={textStyle}>Bonjour {customerName},</Text>
    <Text style={textStyle}>Merci pour votre confiance. Nous avons bien reçu votre commande et notre équipe va la traiter avec attention.</Text>
    <InfoRow label="Commande" value={order.orderNumber}/><InfoRow label="Date" value={date(order.createdAt)}/><InfoRow label="Statut" value={status(order.status)}/><InfoRow label="Statut du paiement" value={status(order.paymentStatus)}/>
    <OrderItems items={order.items} money={money}/><Divider/>
    <InfoRow label="Sous-total" value={money(order.subtotal)}/>{order.discountAmount > 0 ? <InfoRow label="Remise" value={`− ${money(order.discountAmount)}`}/> : null}<InfoRow label="Livraison" value={money(order.shippingAmount)}/><InfoRow label="Total" value={money(order.totalAmount)} strong/>
    <Heading as="h2" style={subheadingStyle}>Livraison</Heading><Text style={textStyle}>{address || 'Informations de livraison non renseignées'}</Text><Text style={textStyle}>Méthode : {order.shippingMethod || 'Non renseignée'}{order.shippingPhone ? ` · ${order.shippingPhone}` : ''}</Text>
    <EmailButton href={orderUrl}>Voir ma commande</EmailButton>
  </EmailLayout>
}

export function orderConfirmationSubject(orderNumber: string) {
  return `Confirmation de votre commande ${orderNumber} — Dom G Store`
}
