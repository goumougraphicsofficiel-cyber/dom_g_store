import type { ReactNode } from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'

const colors = { navy: '#101827', gold: '#be9637', background: '#f7f7f5', white: '#ffffff', muted: '#667085', border: '#e5e7eb' }

export function EmailLayout({ preview, title, children }: { preview: string; title: string; children: ReactNode }) {
  return <Html lang="fr"><Head/><Preview>{preview}</Preview><Body style={styles.body}><Container style={styles.container}>
    <Section style={styles.header}><Text style={styles.brand}>DOM G STORE</Text><Text style={styles.tagline}>L’essentiel, avec confiance.</Text></Section>
    <Section style={styles.content}><Heading style={styles.heading}>{title}</Heading>{children}</Section>
    <Section style={styles.footer}><Text style={styles.footerText}>Cet e-mail automatique a été envoyé par Dom G Store. Merci de ne pas y répondre directement.</Text><Text style={styles.footerText}>Conakry, République de Guinée</Text></Section>
  </Container></Body></Html>
}

export function EmailButton({ href, children }: { href: string; children: ReactNode }) {
  return <Button href={href} style={styles.button}>{children}</Button>
}

export function InfoRow({ label, value, strong = false }: { label: string; value: ReactNode; strong?: boolean }) {
  return <Section style={styles.infoRow}><Text style={styles.infoLabel}>{label}</Text><Text style={strong ? styles.infoValueStrong : styles.infoValue}>{value}</Text></Section>
}

export function OrderItems({ items, money }: {
  items: Array<{ id: string; productName: string; productSku: string; variantDetails: string; quantity: number; unitPrice: number; totalPrice: number }>
  money: (value: number) => string
}) {
  return <Section style={styles.items}><Heading as="h2" style={styles.subheading}>Articles</Heading>{items.map(item => <Section key={item.id} style={styles.item}>
    <Text style={styles.itemName}>{item.productName}</Text>
    <Text style={styles.itemMeta}>{[item.productSku && `SKU : ${item.productSku}`, item.variantDetails].filter(Boolean).join(' · ')}</Text>
    <Text style={styles.itemPrice}>{item.quantity} × {money(item.unitPrice)} <strong style={{ color: colors.navy }}>— {money(item.totalPrice)}</strong></Text>
  </Section>)}</Section>
}

export function Divider() {
  return <Hr style={styles.hr}/>
}

const styles: Record<string, React.CSSProperties> = {
  body: { backgroundColor: colors.background, color: colors.navy, fontFamily: 'Arial, Helvetica, sans-serif', margin: 0, padding: '28px 12px' },
  container: { backgroundColor: colors.white, border: `1px solid ${colors.border}`, borderRadius: '14px', margin: '0 auto', maxWidth: '620px', overflow: 'hidden' },
  header: { backgroundColor: colors.navy, padding: '26px 32px' },
  brand: { color: colors.gold, fontSize: '20px', fontWeight: 700, letterSpacing: '1.8px', margin: 0 },
  tagline: { color: colors.white, fontSize: '13px', margin: '7px 0 0' },
  content: { padding: '30px 32px' },
  heading: { color: colors.navy, fontSize: '25px', lineHeight: '1.3', margin: '0 0 18px' },
  subheading: { color: colors.navy, fontSize: '17px', lineHeight: '1.4', margin: '22px 0 10px' },
  text: { color: colors.navy, fontSize: '15px', lineHeight: '1.65', margin: '8px 0' },
  infoRow: { borderBottom: `1px solid ${colors.border}`, padding: '8px 0' },
  infoLabel: { color: colors.muted, display: 'inline-block', fontSize: '13px', margin: 0, width: '42%' },
  infoValue: { color: colors.navy, display: 'inline-block', fontSize: '14px', margin: 0, textAlign: 'right', width: '58%' },
  infoValueStrong: { color: colors.gold, display: 'inline-block', fontSize: '17px', fontWeight: 700, margin: 0, textAlign: 'right', width: '58%' },
  items: { marginTop: '8px' },
  item: { borderBottom: `1px solid ${colors.border}`, padding: '12px 0' },
  itemName: { color: colors.navy, fontSize: '14px', fontWeight: 700, margin: '0 0 4px' },
  itemMeta: { color: colors.muted, fontSize: '12px', margin: '0 0 5px' },
  itemPrice: { color: colors.muted, fontSize: '13px', margin: 0 },
  button: { backgroundColor: colors.gold, borderRadius: '8px', color: colors.navy, display: 'inline-block', fontSize: '14px', fontWeight: 700, marginTop: '22px', padding: '12px 20px', textDecoration: 'none' },
  hr: { borderColor: colors.border, margin: '24px 0' },
  footer: { backgroundColor: '#eef0f2', padding: '20px 32px' },
  footerText: { color: colors.muted, fontSize: '11px', lineHeight: '1.5', margin: '3px 0', textAlign: 'center' },
}

export const textStyle = styles.text
export const subheadingStyle = styles.subheading
