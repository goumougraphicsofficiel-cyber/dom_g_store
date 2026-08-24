import { Text } from '@react-email/components'
import type { OrderStatus, TransactionalOrder } from '../_lib/order-data'
import { EmailButton, EmailLayout, InfoRow, textStyle } from './components'

const statusContent: Record<OrderStatus, { label: string; subject: string; message: string }> = {
  en_attente: { label: 'En attente', subject: 'Commande en attente', message: 'Votre commande reste enregistrée et attend sa prochaine étape de traitement.' },
  confirmee: { label: 'Confirmée', subject: 'Commande confirmée', message: 'Votre commande a été confirmée par notre équipe.' },
  preparation: { label: 'En préparation', subject: 'Commande en préparation', message: 'Notre équipe prépare actuellement votre commande.' },
  expediee: { label: 'Expédiée', subject: 'Commande expédiée', message: 'Votre commande a quitté notre espace de préparation et est en cours d’acheminement.' },
  livree: { label: 'Livrée', subject: 'Commande livrée', message: 'Votre commande a été marquée comme livrée. Nous espérons qu’elle vous donne entière satisfaction.' },
  annulee: { label: 'Annulée', subject: 'Commande annulée', message: 'Votre commande a été annulée. Contactez notre service client si vous avez besoin de précisions.' },
  remboursee: { label: 'Remboursée', subject: 'Commande remboursée', message: 'Votre commande a été marquée comme remboursée.' },
}

export function OrderStatusEmail({ order, orderUrl }: { order: TransactionalOrder; orderUrl: string }) {
  const content = statusContent[order.status]
  return <EmailLayout preview={`${content.subject} — ${order.orderNumber}`} title={content.subject}>
    <Text style={textStyle}>Bonjour {order.shippingFirstName || 'cher client'},</Text><Text style={textStyle}>{content.message}</Text>
    <InfoRow label="Commande" value={order.orderNumber}/><InfoRow label="Nouveau statut" value={content.label}/>{order.trackingNumber ? <InfoRow label="Numéro de suivi" value={order.trackingNumber}/> : null}
    <EmailButton href={orderUrl}>Voir ma commande</EmailButton>
  </EmailLayout>
}

export function orderStatusSubject(status: OrderStatus, orderNumber: string) {
  return `${statusContent[status].subject} ${orderNumber} — Dom G Store`
}
