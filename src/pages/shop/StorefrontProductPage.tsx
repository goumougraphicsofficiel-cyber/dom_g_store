import { useState } from 'react'
import { ChevronRight, Heart, Minus, PackageCheck, Plus, ShieldCheck, ShoppingBag, Truck } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ProductGrid } from '../../components/product/ProductCard'
import { Button, Card, EmptyState, LoadingSkeleton, PageHeader, StatusBadge } from '../../components/ui'
import { useStore } from '../../context/StoreContext'
import type { Product } from '../../types'
import { money } from '../../utils'

function ProductDetails({ product, related }: { product: Product; related: Product[] }) {
  const { reviews, addCart, toggleFavorite, favorites } = useStore()
  const [image, setImage] = useState(product.image)
  const [quantity, setQuantity] = useState(1)
  const [color, setColor] = useState(product.colors?.[0])
  const [size, setSize] = useState(product.sizes?.[0])
  const productReviews = reviews.filter(review => review.productId === product.id)
  const isOutOfStock = product.stock <= 0

  const sale = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0
  const isLowStock = !isOutOfStock && product.alertStock > 0 && product.stock <= product.alertStock

  return <div className="container section product-page">
    <nav className="breadcrumbs" aria-label="Fil d’Ariane"><Link to="/">Accueil</Link><ChevronRight/><Link to="/boutique">Boutique</Link><ChevronRight/><span>{product.name}</span></nav>
    <div className="product-detail premium-product-detail">
      <div className="gallery">
        <div className="gallery-stage">{image ? <img className="gallery-main" src={image} alt={product.name}/> : <span className="gallery-empty"><ShoppingBag/> Image à venir</span>}{sale > 0 ? <span className="detail-sale">-{sale}%</span> : null}</div>
        <div className="gallery-thumbnails">{product.images.map(url => <button className={image === url ? 'active' : ''} onClick={() => setImage(url)} key={url}><img src={url} alt={`Vue de ${product.name}`}/></button>)}</div>
      </div>
      <div className="product-info">
        <span className="eyebrow">{product.categoryName || product.category}</span>
        <h1>{product.name}</h1>
        <p className="product-reference">{[product.brand, product.reference].filter(Boolean).join(' · ')}</p>
        <div className="detail-price"><strong>{money(product.price)}</strong>{product.oldPrice !== undefined ? <del>{money(product.oldPrice)}</del> : null}</div>
        <div className="availability"><StatusBadge status={isOutOfStock ? 'rupture' : isLowStock ? 'stock faible' : 'en stock'}/>{!isOutOfStock ? <span>{product.stock} unité{product.stock > 1 ? 's' : ''} disponible{product.stock > 1 ? 's' : ''}</span> : null}</div>
        <p className="product-lead">{product.description}</p>
        {product.colors?.length ? <div className="option"><strong>Couleur</strong><div>{product.colors.map(value => <button className={color === value ? 'selected' : ''} onClick={() => setColor(value)} key={value}>{value}</button>)}</div></div> : null}
        {product.sizes?.length ? <div className="option"><strong>Taille</strong><div>{product.sizes.map(value => <button className={size === value ? 'selected' : ''} onClick={() => setSize(value)} key={value}>{value}</button>)}</div></div> : null}
        <div className="purchase premium-purchase">
          <div className="quantity"><button disabled={isOutOfStock||quantity<=1} onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Diminuer la quantité"><Minus/></button><span>{quantity}</span><button disabled={isOutOfStock||quantity>=product.stock} onClick={() => setQuantity(Math.min(product.stock, quantity + 1))} aria-label="Augmenter la quantité"><Plus/></button></div>
          <Button className="gold-button" disabled={isOutOfStock} onClick={() => addCart(product.id, quantity, color, size)}><ShoppingBag/> {isOutOfStock?'Rupture de stock':'Ajouter au panier'}</Button>
          <button className={`icon-btn ${favorites.includes(product.id) ? 'active' : ''}`} onClick={() => toggleFavorite(product.id)} aria-label="Ajouter aux favoris"><Heart/></button>
        </div>
        <div className="delivery-notes"><span><Truck/><b>Livraison suivie</b><small>Estimée sous 1 à 3 jours à Conakry</small></span><span><ShieldCheck/><b>Achat protégé</b><small>Paiement sécurisé et assistance locale</small></span><span><PackageCheck/><b>Garantie</b><small>Accompagnement après votre achat</small></span></div>
      </div>
    </div>
    <div className="detail-panels premium-detail-panels"><Card><span className="section-kicker">Tout savoir</span><h2>Description</h2><p>{product.details}</p></Card>{Object.keys(product.specs).length ? <Card><span className="section-kicker">En détail</span><h2>Caractéristiques</h2>{Object.entries(product.specs).map(([key, value]) => <div className="spec" key={key}><span>{key}</span><strong>{value}</strong></div>)}</Card> : null}</div>
    {productReviews.length ? <section className="section"><PageHeader title={`Avis clients (${productReviews.length})`}/>{productReviews.slice(0, 3).map(review => <Card className="review" key={review.id}><div><strong>{review.customer}</strong><span>{'★'.repeat(review.rating)}</span></div><h3>{review.title}</h3><p>{review.comment}</p></Card>)}</section> : null}
    {related.length ? <section><PageHeader title="Vous aimerez aussi"/><ProductGrid products={related}/></section> : null}
  </div>
}

export function StorefrontProductPage() {
  const { id } = useParams()
  const { products, catalogLoading, catalogError } = useStore()
  const product = products.find(item => item.id === id)

  if (catalogLoading) return <div className="container section"><LoadingSkeleton/></div>
  if (catalogError) return <div className="container section"><EmptyState title="Impossible de charger le produit" text={catalogError}/></div>
  if (!product) return <div className="container section"><EmptyState title="Produit introuvable"/></div>

  const related = products.filter(item => item.category === product.category && item.id !== product.id).slice(0, 4)
  return <ProductDetails key={product.id} product={product} related={related}/>
}
