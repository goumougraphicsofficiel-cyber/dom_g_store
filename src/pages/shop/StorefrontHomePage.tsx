import { ArrowRight, Headphones, PackageCheck, ShieldCheck, Sparkles, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CategoryImage } from '../../components/category/CategoryImage'
import { ProductGrid } from '../../components/product/ProductCard'
import { EmptyState, LoadingSkeleton, PageHeader } from '../../components/ui'
import { useStore } from '../../context/StoreContext'
import type { Product } from '../../types'

function ProductSection({ id, eyebrow, title, subtitle, products, emptyText }: { id?: string; eyebrow: string; title: string; subtitle: string; products: Product[]; emptyText: string }) {
  return <section className="section container reveal-section" id={id}>
    <span className="section-kicker">{eyebrow}</span>
    <PageHeader title={title} description={subtitle} action={<Link className="section-link" to="/boutique">Tout voir <ArrowRight/></Link>}/>
    {products.length > 0 ? <ProductGrid products={products}/> : <EmptyState title={emptyText}/>}
  </section>
}

export function StorefrontHomePage() {
  const { products, categories, catalogLoading, catalogError } = useStore()
  const heroProduct = products.find(product => product.featured && product.image) ?? products.find(product => product.stock > 0 && product.image) ?? products.find(product => product.image) ?? products[0]
  const featuredProducts = products.filter(product => product.featured)
  const essentials = (featuredProducts.length > 0 ? featuredProducts : products).slice(0, 4)
  const newProducts = products.filter(product => product.isNew).slice(0, 4)
  const discountedProducts = products.filter(product => product.oldPrice !== undefined).slice(0, 4)

  if (catalogLoading) return <div className="container section"><LoadingSkeleton/></div>
  if (catalogError) return <div className="container section"><EmptyState title="Impossible de charger la boutique" text={catalogError}/></div>

  return <>
    <section className="hero-section premium-hero">
      <div className="hero-orb" aria-hidden="true"/>
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="hero-kicker"><Sparkles/> DOM G STORE</span>
          <h1>La technologie qui accompagne <em>votre quotidien.</em></h1>
          <p>Découvrez notre sélection d’équipements et accessoires choisis pour leur qualité, leur performance et leur fiabilité.</p>
          <div className="button-row">
            <Link className="btn gold-button" to="/boutique">Découvrir la boutique <ArrowRight/></Link>
            <a className="btn hero-secondary" href="#nouveautes">Voir les nouveautés</a>
          </div>
          <div className="hero-trust"><span><ShieldCheck/> Produits sélectionnés</span><span><Truck/> Livraison suivie</span></div>
        </div>
        <div className="hero-visual">
          {heroProduct?.image ? <Link to={`/produits/${heroProduct.id}`} className="hero-product"><img src={heroProduct.image} alt={heroProduct.name}/><div><span>{heroProduct.categoryName || 'Sélection Dom G'}</span><strong>{heroProduct.name}</strong><b>{new Intl.NumberFormat('fr-FR').format(heroProduct.price)} FG</b></div></Link> : <div className="hero-empty"><PackageCheck/><span>Votre prochaine découverte vous attend</span></div>}
          <span className="hero-stamp">Dom G<br/>Selection</span>
        </div>
      </div>
    </section>

    <section className="trust-bar reveal-section"><div className="container trust-grid"><div><Truck/><span><strong>Livraison rapide</strong><small>Suivie jusqu’à destination</small></span></div><div><ShieldCheck/><span><strong>Paiement sécurisé</strong><small>Un parcours protégé</small></span></div><div><PackageCheck/><span><strong>Produits sélectionnés</strong><small>Qualité et fiabilité</small></span></div><div><Headphones/><span><strong>Service client</strong><small>Une équipe locale</small></span></div></div></section>

    <section className="section container reveal-section category-showcase">
      <span className="section-kicker">Explorez nos univers</span>
      <PageHeader title="Catégories populaires" description="Trouvez rapidement les produits qui correspondent à vos envies." action={<Link className="section-link" to="/categories">Toutes les catégories <ArrowRight/></Link>}/>
      {categories.length > 0 ? <div className="category-grid">{categories.slice(0, 5).map(category => {
        const productCount = category.productCount ?? products.filter(product => product.category === category.slug).length
        return <Link className="category-card" to={`/categories/${category.slug}`} key={category.id}><CategoryImage url={category.image} name={category.name}/><div><span>{productCount} produit{productCount > 1 ? 's' : ''}</span><h3>{category.name}</h3><i><ArrowRight/></i></div></Link>
      })}</div> : <EmptyState title="Aucune catégorie disponible"/>}
    </section>

    <ProductSection eyebrow="Le choix Dom G" title="Nos incontournables" subtitle={featuredProducts.length > 0 ? 'Les références qui font la différence.' : 'Une sélection issue de notre catalogue actuel.'} products={essentials} emptyText="Aucun produit disponible"/>
    <ProductSection id="nouveautes" eyebrow="Tout juste arrivés" title="Nouveautés" subtitle="Découvrez les dernières références ajoutées à la boutique." products={newProducts} emptyText="Aucune nouveauté disponible"/>
    <section className="container promo-banner reveal-section"><div><span className="section-kicker">Offres Dom G</span><h2>Des offres pensées pour vous.</h2><p>Profitez de nos meilleures sélections et découvrez les promotions du moment.</p><Link className="btn gold-button" to="/promotions">Voir les promotions <ArrowRight/></Link></div>{(discountedProducts[0]??heroProduct)?.image?<img src={(discountedProducts[0]??heroProduct)?.image} alt={(discountedProducts[0]??heroProduct)?.name}/>:null}</section>
    <ProductSection eyebrow="Opportunités du moment" title="Promotions" subtitle="Les vrais prix remisés actuellement disponibles." products={discountedProducts} emptyText="Aucune promotion disponible"/>

    <section className="section container reveal-section"><div className="newsletter">
      <div><span className="section-kicker">Le meilleur de Dom G</span><h2>Une longueur d’avance sur les nouveautés.</h2><p>Recevez nos arrivages et offres directement dans votre boîte mail.</p></div>
      <div className="newsletter-note"><strong>Newsletter bientôt disponible</strong><span>Aucune inscription ne sera enregistrée pour le moment.</span></div>
    </div></section>
  </>
}
