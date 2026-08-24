import { useEffect, useRef, useState } from 'react'
import { Check, ChevronRight, PackageCheck } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button, Card, EmptyState, Input, LoadingSkeleton, PageHeader } from '../../components/ui'
import { emptyAddress, useStore } from '../../context/StoreContext'
import { createOrderNumber, OrderCreationError, supabaseOrderService, type AdminOrder } from '../../services/supabaseOrderService'
import { storefrontProductService } from '../../services/storefrontProductService'
import type { Address } from '../../types'
import { money, uid } from '../../utils'

const deliveryOptions = [
  { id: 'standard', name: 'Livraison standard', delay: '2 à 4 jours', price: 50000 },
  { id: 'express', name: 'Livraison express', delay: 'Sous 24 heures', price: 120000 },
  { id: 'retrait', name: 'Retrait en boutique', delay: 'Disponible sous 2 heures', price: 0 },
]

function checkoutError(error: unknown) {
  if (error instanceof OrderCreationError) return error.message
  if (error instanceof Error) return error.message
  return 'Une erreur inattendue est survenue pendant la création de la commande.'
}

export function SupabaseCheckoutPage() {
  const { cart, products, setProducts, user, authUser, updateUser, clearCart } = useStore()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [address, setAddress] = useState<Address>(user?.addresses.find(item => item.primary) ?? user?.addresses[0] ?? emptyAddress())
  const [deliveryId, setDeliveryId] = useState('standard')
  const [payment, setPayment] = useState('Mobile Money')
  const [busy, setBusy] = useState(false)
  const submittingRef = useRef(false)
  const orderNumberRef = useRef<string | null>(null)
  const lines = cart.flatMap(line => {
    const product = products.find(item => item.id === line.productId)
    return product ? [{ ...line, product }] : []
  })
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0)
  const delivery = deliveryOptions.find(option => option.id === deliveryId) ?? deliveryOptions[0]
  const total = subtotal + delivery.price

  const next = () => {
    if (step === 2 && (!address.firstName || !address.lastName || !address.phone || !address.address || !address.city)) return toast.error('Complétez les informations de livraison obligatoires.')
    if (step === 2 && user && !user.addresses.some(item => item.id === address.id)) {
      const savedAddress = { ...address, id: uid('a'), primary: user.addresses.length === 0 }
      updateUser({ ...user, addresses: [...user.addresses, savedAddress] })
      setAddress(savedAddress)
    }
    setStep(current => Math.min(4, current + 1))
  }

  const confirm = async () => {
    if (submittingRef.current) return
    if (!authUser) return toast.error('Votre session a expiré. Reconnectez-vous avant de commander.')
    if (lines.length === 0) return toast.error('Votre panier ne contient aucun produit disponible.')
    submittingRef.current = true
    setBusy(true)
    try {
      const orderNumber = orderNumberRef.current ?? createOrderNumber()
      orderNumberRef.current = orderNumber
      const result = await supabaseOrderService.create({
        orderNumber,
        shippingMethod: delivery.name,
        shippingFirstName: address.firstName,
        shippingLastName: address.lastName,
        shippingPhone: address.phone,
        shippingAddress: address.address,
        shippingDistrict: address.district,
        shippingCity: address.city,
        shippingCountry: address.country || 'Guinée',
        items: lines.map(line => ({
          productId: line.product.id,
          variantId: null,
          variantDetails: [line.color, line.size].filter(Boolean).join(' · '),
          quantity: line.quantity,
        })),
      })
      try {
        setProducts(await storefrontProductService.list())
      } catch (refreshError) {
        console.error('Commande créée, mais le catalogue n’a pas pu être rafraîchi.', refreshError)
        toast.warning('Commande créée. Le stock sera actualisé au prochain chargement.')
      }
      clearCart()
      orderNumberRef.current = null
      toast.success('Commande enregistrée dans Supabase')
      navigate(`/commande/confirmation/${result.order.id}`)
    } catch (error) {
      console.error('Échec de création de la commande Supabase.', error)
      toast.error(checkoutError(error))
    } finally { submittingRef.current = false; setBusy(false) }
  }

  if (lines.length === 0) return <div className="container section"><EmptyState title="Votre panier est vide"/></div>

  return <div className="container section">
    <PageHeader title="Finaliser ma commande" description="Le paiement reste simulé, mais la commande sera réellement enregistrée."/>
    <div className="steps">{['Panier', 'Adresse', 'Livraison', 'Paiement'].map((label, index) => <div className={step >= index + 1 ? 'active' : ''} key={label}><span>{step > index + 1 ? <Check/> : index + 1}</span>{label}</div>)}</div>
    <div className="checkout-layout"><Card className="checkout-main">
      {step === 1 ? <><h2>Récapitulatif du panier</h2>{lines.map(line => <div className="checkout-line" key={`${line.productId}-${line.color}-${line.size}`}><img src={line.product.image} alt=""/><span><strong>{line.product.name}</strong><small>Quantité : {line.quantity}</small></span><strong>{money(line.product.price * line.quantity)}</strong></div>)}</> : null}
      {step === 2 ? <><h2>Adresse de livraison</h2>{user?.addresses.length ? <div className="address-options">{user.addresses.map(item => <label className={address.id === item.id ? 'selected' : ''} key={item.id}><input type="radio" checked={address.id === item.id} onChange={() => setAddress(item)}/><span><strong>{item.firstName} {item.lastName}</strong><small>{item.address}, {item.city}</small></span></label>)}</div> : null}<h3>{user?.addresses.length ? 'Ou ajouter une nouvelle adresse' : 'Votre adresse'}</h3><div className="form-grid">{([['firstName', 'Prénom'], ['lastName', 'Nom'], ['phone', 'Téléphone'], ['address', 'Adresse'], ['district', 'Quartier']] as const).map(([key, label]) => <label key={key}>{label}<Input value={address[key]} onChange={event => setAddress({ ...address, id: '', [key]: event.target.value })}/></label>)}<label>Ville<select value={address.city} onChange={event => setAddress({ ...address, city: event.target.value })}>{['Conakry', 'Kindia', 'Mamou', 'Labé', 'Kankan', 'Nzérékoré', 'Autre ville'].map(city => <option key={city}>{city}</option>)}</select></label></div></> : null}
      {step === 3 ? <><h2>Mode de livraison</h2><div className="select-cards">{deliveryOptions.map(option => <label className={deliveryId === option.id ? 'selected' : ''} key={option.id}><input type="radio" checked={deliveryId === option.id} onChange={() => setDeliveryId(option.id)}/><span><strong>{option.name}</strong><small>{option.delay}</small></span><b>{option.price ? money(option.price) : 'Gratuit'}</b></label>)}</div></> : null}
      {step === 4 ? <><h2>Paiement simulé</h2><div className="select-cards">{['Carte bancaire', 'Mobile Money', 'Paiement à la livraison'].map(option => <label className={payment === option ? 'selected' : ''} key={option}><input type="radio" checked={payment === option} onChange={() => setPayment(option)}/><span><strong>{option}</strong><small>Aucun débit réel ne sera effectué</small></span></label>)}</div></> : null}
      <div className="checkout-buttons">{step > 1 ? <Button className="secondary" disabled={busy} onClick={() => setStep(current => current - 1)}>Retour</Button> : null}{step < 4 ? <Button onClick={next}>Continuer <ChevronRight/></Button> : <Button disabled={busy} onClick={() => void confirm()}>{busy ? 'Enregistrement…' : 'Confirmer la commande'}</Button>}</div>
    </Card><Card className="summary"><h2>Total</h2><div><span>Sous-total</span><b>{money(subtotal)}</b></div><div><span>Livraison</span><b>{money(delivery.price)}</b></div><div className="total"><span>À payer</span><b>{money(total)}</b></div><small>Le paiement est simulé. La commande et ses articles seront enregistrés dans Supabase.</small></Card></div>
  </div>
}

export function SupabaseConfirmationPage() {
  const { id } = useParams()
  const [order, setOrder] = useState<AdminOrder | null>(null)
  const [loading, setLoading] = useState(() => Boolean(id))
  const [error, setError] = useState(() => id ? '' : 'Identifiant de commande manquant.')

  useEffect(() => {
    let active = true
    if (!id) return () => { active = false }
    void supabaseOrderService.get(id).then(result => { if (active) setOrder(result) }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : 'Impossible de charger la commande.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  if (loading) return <div className="container section"><LoadingSkeleton/></div>
  if (error || !order) return <div className="container section"><EmptyState title="Commande introuvable" text={error}/></div>

  return <div className="container section confirmation"><PackageCheck/><span className="success-pill">Commande enregistrée</span><h1>Merci, votre commande est confirmée !</h1><p>La commande <strong>{order.orderNumber}</strong> a bien été enregistrée.</p><Card><div><span>Total</span><strong>{money(order.totalAmount)}</strong></div><div><span>Livraison</span><strong>{order.shippingMethod || 'Non renseignée'}</strong></div><div><span>Adresse</span><strong>{[order.shippingAddress, order.shippingCity].filter(Boolean).join(', ')}</strong></div></Card><div className="button-row"><Link className="btn secondary" to="/boutique">Continuer mes achats</Link></div></div>
}
