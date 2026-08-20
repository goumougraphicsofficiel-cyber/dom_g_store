import { useState } from 'react'
import { Heart, Minus, Plus, ShieldCheck, ShoppingCart, Truck } from 'lucide-react'
import { useParams } from 'react-router-dom'
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

  return <div className="container section">
    <div className="product-detail">
      <div className="gallery">
        {image ? <img className="gallery-main" src={image} alt={product.name}/> : null}
        <div>{product.images.map(url => <button onClick={() => setImage(url)} key={url}><img src={url} alt={`Vue de ${product.name}`}/></button>)}</div>
      </div>
      <div className="product-info">
        <span className="eyebrow">{[product.brand, product.reference].filter(Boolean).join(' · ')}</span>
        <h1>{product.name}</h1>
        <div className="detail-price">{money(product.price)} {product.oldPrice !== undefined ? <del>{money(product.oldPrice)}</del> : null}</div>
        <StatusBadge status={product.stock > 0 ? 'en stock' : 'rupture'}/>
        <p>{product.description}</p>
        {product.colors?.length ? <div className="option"><strong>Couleur</strong><div>{product.colors.map(value => <button className={color === value ? 'selected' : ''} onClick={() => setColor(value)} key={value}>{value}</button>)}</div></div> : null}
        {product.sizes?.length ? <div className="option"><strong>Taille</strong><div>{product.sizes.map(value => <button className={size === value ? 'selected' : ''} onClick={() => setSize(value)} key={value}>{value}</button>)}</div></div> : null}
        <div className="purchase">
          <div className="quantity"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus/></button><span>{quantity}</span><button onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}><Plus/></button></div>
          <Button disabled={product.stock === 0} onClick={() => addCart(product.id, quantity, color, size)}><ShoppingCart/> Ajouter au panier</Button>
          <button className={`icon-btn ${favorites.includes(product.id) ? 'active' : ''}`} onClick={() => toggleFavorite(product.id)} aria-label="Ajouter aux favoris"><Heart/></button>
        </div>
        <div className="delivery-notes"><span><Truck/> Livraison estimée sous 1 à 3 jours à Conakry</span><span><ShieldCheck/> Garantie 12 mois et retour sous 7 jours</span></div>
      </div>
    </div>
    <div className="detail-panels"><Card><h2>Description</h2><p>{product.details}</p></Card>{Object.keys(product.specs).length ? <Card><h2>Caractéristiques</h2>{Object.entries(product.specs).map(([key, value]) => <div className="spec" key={key}><span>{key}</span><strong>{value}</strong></div>)}</Card> : null}</div>
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
