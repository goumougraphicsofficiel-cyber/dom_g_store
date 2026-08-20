import { ArrowRight, Headphones, PackageCheck, ShieldCheck, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ProductGrid } from '../../components/product/ProductCard'
import { CategoryImage } from '../../components/category/CategoryImage'
import { Badge, Button, EmptyState, Input, LoadingSkeleton, PageHeader } from '../../components/ui'
import { useStore } from '../../context/StoreContext'
import type { Product } from '../../types'

function ProductSection({ title, subtitle, products, emptyText }: {
  title: string
  subtitle: string
  products: Product[]
  emptyText: string
}) {
  return <section className="section container">
    <PageHeader title={title} description={subtitle} action={<Link to="/boutique">Tout voir →</Link>}/>
    {products.length > 0 ? <ProductGrid products={products}/> : <EmptyState title={emptyText}/>}</section>
}

export function StorefrontHomePage() {
  const { products, categories, catalogLoading, catalogError } = useStore()
  const heroProduct = products.find(product => product.featured && product.image)
    ?? products.find(product => product.stock > 0 && product.image)
    ?? products.find(product => product.image)
    ?? products[0]
  const featuredProducts = products.filter(product => product.featured)
  const essentials = (featuredProducts.length > 0 ? featuredProducts : products).slice(0, 4)
  const newProducts = products.filter(product => product.isNew).slice(0, 4)
  const discountedProducts = products.filter(product => product.oldPrice !== undefined).slice(0, 4)

  if (catalogLoading) return <div className="container section"><LoadingSkeleton/></div>
  if (catalogError) return <div className="container section"><EmptyState title="Impossible de charger la boutique" text={catalogError}/></div>

  return <>
    <section className="hero-section">
      <div className="container hero-grid">
        <div>
          <Badge tone="info">La boutique qui vous ressemble</Badge>
          <h1>Bienvenue sur Dom G Store</h1>
          <p>{products.length > 0
            ? 'Découvrez des produits sélectionnés pour leur qualité et leur fiabilité.'
            : 'Notre catalogue ne contient actuellement aucun produit disponible.'}</p>
          <div className="button-row">
            <Link className="btn" to="/boutique">Découvrir la boutique <ArrowRight/></Link>
            {discountedProducts.length > 0 ? <Link className="btn secondary" to="/promotions">Voir les offres</Link> : null}
          </div>
        </div>
        {heroProduct?.image ? <img src={heroProduct.image} alt={heroProduct.name}/> : null}
      </div>
    </section>

    <section className="section container">
      <PageHeader title="Catégories populaires" description="Explorez les catégories disponibles" action={<Link to="/categories">Toutes les catégories →</Link>}/>
      {categories.length > 0 ? <div className="category-grid">{categories.slice(0, 5).map(category => {
        const productCount = category.productCount ?? products.filter(product => product.category === category.slug).length
        return <Link className="category-card" to={`/categories/${category.slug}`} key={category.id}>
          <CategoryImage url={category.image} name={category.name}/>
          <div><h3>{category.name}</h3><span>{productCount} produit{productCount > 1 ? 's' : ''}</span></div>
        </Link>
      })}</div> : <EmptyState title="Aucune catégorie disponible"/>}
    </section>

    <ProductSection title="Nos incontournables" subtitle={featuredProducts.length > 0 ? 'Les produits mis en avant' : 'Une sélection de produits du catalogue'} products={essentials} emptyText="Aucun produit disponible"/>
    <ProductSection title="Nouveautés" subtitle="Les dernières nouveautés du catalogue" products={newProducts} emptyText="Aucune nouveauté disponible"/>
    <ProductSection title="Prix doux du moment" subtitle="Les produits disposant actuellement d’un ancien prix" products={discountedProducts} emptyText="Aucune promotion disponible"/>

    <section className="benefits"><div className="container benefit-grid">
      <div><Truck/><h3>Livraison suivie</h3><p>À Conakry et dans les principales villes</p></div>
      <div><ShieldCheck/><h3>Paiement sécurisé</h3><p>Des parcours de paiement clairement présentés</p></div>
      <div><Headphones/><h3>Service client local</h3><p>Une équipe disponible et à votre écoute</p></div>
      <div><PackageCheck/><h3>Retours simplifiés</h3><p>Des informations de retour accessibles</p></div>
    </div></section>

    <section className="section container"><div className="newsletter">
      <div><span className="eyebrow">Le meilleur de Dom G</span><h2>Recevez nos offres en avant-première</h2><p>Actualités et nouveaux produits directement dans votre boîte mail.</p></div>
      <form onSubmit={event => { event.preventDefault(); toast.success('Inscription à la newsletter confirmée') }}><Input required type="email" placeholder="votre@email.com"/><Button>S’inscrire</Button></form>
    </div></section>
  </>
}
