import { Eye, Heart, ShoppingBag, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '../../context/StoreContext'
import type { Product } from '../../types'
import { money } from '../../utils'
import { Badge, Button, Card } from '../ui'

export function ProductCard({ product }: { product: Product }) {
  const { addCart, toggleFavorite, favorites } = useStore()
  const sale = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0
  const isOutOfStock = product.stock <= 0
  const isLowStock = !isOutOfStock && product.alertStock > 0 && product.stock <= product.alertStock
  const isFavorite = favorites.includes(product.id)

  return <Card className={`product-card premium-product-card${isOutOfStock ? ' out-of-stock' : ''}`}>
    <div className="product-image">
      <Link to={`/produits/${product.id}`} aria-label={`Voir ${product.name}`}>{product.image ? <img src={product.image} alt={product.name}/> : <span className="product-image-empty"><ShoppingBag/></span>}</Link>
      <div className="product-badges">{sale > 0 ? <Badge tone="danger">-{sale}%</Badge> : product.isNew ? <Badge tone="info">Nouveau</Badge> : null}{isOutOfStock ? <Badge tone="danger">Rupture</Badge> : isLowStock ? <Badge tone="warning">Stock limité</Badge> : null}</div>
      <button className={`favorite${isFavorite ? ' active' : ''}`} onClick={() => toggleFavorite(product.id)} aria-label={isFavorite ? `Retirer ${product.name} des favoris` : `Ajouter ${product.name} aux favoris`}><Heart fill={isFavorite ? 'currentColor' : 'none'}/></button>
      <Link className="quick-view" to={`/produits/${product.id}`} aria-label={`Aperçu de ${product.name}`}><Eye/><span>Aperçu</span></Link>
    </div>
    <div className="product-body">
      <span className="eyebrow">{product.categoryName ?? product.category ?? 'Dom G Store'}</span>
      <Link to={`/produits/${product.id}`}><h3>{product.name}</h3></Link>
      {product.reviews > 0 ? <div className="rating"><Star fill="currentColor"/> {product.rating.toFixed(1)} <span>({product.reviews})</span></div> : <span className="product-brand">{product.brand || 'Sélection Dom G'}</span>}
      <div className="price"><strong>{money(product.price)}</strong>{product.oldPrice !== undefined ? <del>{money(product.oldPrice)}</del> : null}</div>
      <Button className="product-add gold-button" disabled={isOutOfStock} onClick={() => addCart(product.id)}><ShoppingBag/> {isOutOfStock ? 'Rupture de stock' : 'Ajouter au panier'}</Button>
    </div>
  </Card>
}

export const ProductGrid = ({ products }: { products: Product[] }) => <div className="product-grid">{products.map(product => <ProductCard key={product.id} product={product}/>)}</div>
