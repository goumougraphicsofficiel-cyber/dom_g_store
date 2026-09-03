import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, Headphones, PackageCheck, ShieldCheck, Sparkles, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { CategoryImage } from '../../components/category/CategoryImage'
import { ProductGrid } from '../../components/product/ProductCard'
import { EmptyState, LoadingSkeleton, PageHeader } from '../../components/ui'
import { useStore } from '../../context/StoreContext'
import { supabaseNewsletterService } from '../../services/supabaseNewsletterService'
import { toast } from 'sonner'
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
  const heroProducts = useMemo(() => {
    const displayable = products.filter(product => product.image)
    return [...displayable.filter(product => product.featured), ...displayable.filter(product => !product.featured && product.stock > 0), ...displayable.filter(product => !product.featured && product.stock <= 0)].slice(0, 4)
  }, [products])
  const [heroIndex, setHeroIndex] = useState(0)
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterBusy, setNewsletterBusy] = useState(false)
  const activeHeroIndex = heroProducts.length > 0 ? heroIndex % heroProducts.length : 0
  const heroProduct = heroProducts[activeHeroIndex] ?? products[0]
  const featuredProducts = products.filter(product => product.featured)
  const essentials = (featuredProducts.length > 0 ? featuredProducts : products).slice(0, 4)
  const newProducts = products.slice(0, 4)
  const discountedProducts = products.filter(product => product.oldPrice !== undefined).slice(0, 4)

  useEffect(() => {
    if (heroProducts.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const interval = window.setInterval(() => setHeroIndex(current => (current + 1) % heroProducts.length), 4800)
    return () => window.clearInterval(interval)
  }, [heroProducts.length])

  const subscribeNewsletter=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault()
    if(newsletterBusy)return
    setNewsletterBusy(true)
    try{
      const result=await supabaseNewsletterService.subscribe(newsletterEmail)
      setNewsletterEmail('')
      toast.success(result==='already_subscribed'?'Cette adresse est déjà inscrite.':'Inscription à la newsletter confirmée.')
    }catch(error){toast.error(error instanceof Error?error.message:'Impossible de vous inscrire pour le moment.')}finally{setNewsletterBusy(false)}
  }

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
          {heroProduct?.image ? <div className="hero-product" aria-live="polite">
            {heroProducts.map((product, index) => <Link to={`/produits/${product.id}`} className={`hero-product-slide${index === activeHeroIndex ? ' active' : ''}`} aria-hidden={index !== activeHeroIndex} tabIndex={index === activeHeroIndex ? 0 : -1} key={product.id}>
              <img src={product.image} alt={product.name}/>
              <div><span>{product.categoryName || 'Sélection Dom G'}</span><strong>{product.name}</strong><b>{new Intl.NumberFormat('fr-FR').format(product.price)} FG</b></div>
            </Link>)}
            {heroProducts.length > 1 ? <div className="hero-product-dots" aria-label="Produits présentés">{heroProducts.map((product, index) => <button type="button" className={index === activeHeroIndex ? 'active' : ''} onClick={() => setHeroIndex(index)} aria-label={`Afficher ${product.name}`} aria-current={index === activeHeroIndex ? 'true' : undefined} key={product.id}/>)}</div> : null}
          </div> : <div className="hero-empty"><PackageCheck/><span>Votre prochaine découverte vous attend</span></div>}
          <span className="hero-stamp">Dom G<br/>Selection</span>
        </div>
      </div>
    </section>

    <ProductSection id="nouveautes" eyebrow="Tout juste arrivés" title="Nouveautés" subtitle="Découvrez les dernières références ajoutées à la boutique." products={newProducts} emptyText="Aucune nouveauté disponible"/>
    <section className="container promo-banner reveal-section"><div><span className="section-kicker">Offres Dom G</span><h2>Des offres pensées pour vous.</h2><p>Profitez de nos meilleures sélections et découvrez les promotions du moment.</p><Link className="btn gold-button" to="/promotions">Voir les promotions <ArrowRight/></Link></div>{(discountedProducts[0]??heroProduct)?.image?<img src={(discountedProducts[0]??heroProduct)?.image} alt={(discountedProducts[0]??heroProduct)?.name}/>:null}</section>
    <ProductSection eyebrow="Opportunités du moment" title="Promotions" subtitle="Les vrais prix remisés actuellement disponibles." products={discountedProducts} emptyText="Aucune promotion disponible"/>

    <section className="trust-bar reveal-section"><div className="container trust-grid"><div><Truck/><span><strong>Livraison rapide</strong><small>Suivie jusqu’à destination</small></span></div><div><ShieldCheck/><span><strong>Paiement sécurisé</strong><small>Un parcours protégé</small></span></div><div><PackageCheck/><span><strong>Produits sélectionnés</strong><small>Qualité et fiabilité</small></span></div><div><Headphones/><span><strong>Service client</strong><small>Une équipe locale</small></span></div></div></section>

    <ProductSection eyebrow="Le choix Dom G" title="Nos incontournables" subtitle={featuredProducts.length > 0 ? 'Les références qui font la différence.' : 'Une sélection issue de notre catalogue actuel.'} products={essentials} emptyText="Aucun produit disponible"/>

    <section className="section container reveal-section category-showcase">
      <span className="section-kicker">Explorez nos univers</span>
      <PageHeader title="Catégories populaires" description="Trouvez rapidement les produits qui correspondent à vos envies." action={<Link className="section-link" to="/categories">Toutes les catégories <ArrowRight/></Link>}/>
      {categories.length > 0 ? <div className="category-grid">{categories.slice(0, 5).map(category => {
        const productCount = category.productCount ?? products.filter(product => product.category === category.slug).length
        return <Link className="category-card" to={`/categories/${category.slug}`} key={category.id}><CategoryImage url={category.image} name={category.name}/><div><span>{productCount} produit{productCount > 1 ? 's' : ''}</span><h3>{category.name}</h3><i><ArrowRight/></i></div></Link>
      })}</div> : <EmptyState title="Aucune catégorie disponible"/>}
    </section>

    <section className="section container reveal-section"><div className="newsletter">
      <div><span className="section-kicker">Le meilleur de Dom G</span><h2>Une longueur d’avance sur les nouveautés.</h2><p>Recevez nos arrivages et offres directement dans votre boîte mail.</p></div>
      <form onSubmit={subscribeNewsletter}><input className="input" required type="email" autoComplete="email" maxLength={254} value={newsletterEmail} onChange={event=>setNewsletterEmail(event.target.value)} placeholder="votre@email.com" aria-label="Votre adresse e-mail"/><button className="btn gold-button" disabled={newsletterBusy}>{newsletterBusy?'Inscription…':'S’inscrire'}</button></form>
    </div></section>
  </>
}
