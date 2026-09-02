import { Heart, Home, Menu, Moon, Search, ShoppingBag, Store, Sun, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../brand/BrandLogo'
import { useStore } from '../../context/StoreContext'

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return <Link className={`logo official-logo${inverse ? ' inverse' : ''}`} to="/" aria-label="Dom G Store — Accueil">
    <BrandLogo/>
  </Link>
}

const navItems = [['/', 'Accueil'], ['/boutique', 'Boutique'], ['/categories', 'Catégories'], ['/promotions', 'Promotions']] as const

export function AppLayout() {
  const { cart, favorites, user, theme, toggleTheme } = useStore()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const cartCount = cart.reduce((total, line) => total + line.quantity, 0)
  const accountPath = user ? user.role === 'admin' ? '/admin' : '/compte' : '/connexion'

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 12)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (query.trim()) navigate(`/recherche?q=${encodeURIComponent(query.trim())}`)
  }

  return <>
    <header className={`navbar storefront-navbar${scrolled ? ' is-scrolled' : ''}`}>
      <div className="container nav-inner">
        <button className="mobile-only icon-btn menu-trigger" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><Menu/></button>
        <Logo/>
        <nav className="desktop-nav" aria-label="Navigation principale">{navItems.map(([to, label]) => <NavLink end={to === '/'} to={to} key={to}>{label}</NavLink>)}</nav>
        <form className="nav-search" onSubmit={submit}><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Que recherchez-vous ?" aria-label="Rechercher un produit"/></form>
        <div className="nav-icons">
          <button onClick={toggleTheme} className="icon-btn theme-toggle" aria-label="Changer le thème">{theme === 'light' ? <Moon/> : <Sun/>}</button>
          <Link className="icon-btn desktop-action" to="/favoris" aria-label={`Favoris, ${favorites.length} article${favorites.length > 1 ? 's' : ''}`}><Heart/><b>{favorites.length}</b></Link>
          <Link className="icon-btn" to="/panier" aria-label={`Panier, ${cartCount} article${cartCount > 1 ? 's' : ''}`}><ShoppingBag/><b>{cartCount}</b></Link>
          <Link className="icon-btn desktop-action" to={accountPath} aria-label="Compte"><UserRound/></Link>
        </div>
        <form className="mobile-search" onSubmit={submit}><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un produit…" aria-label="Rechercher sur la boutique"/></form>
      </div>
    </header>

    <div className={`mobile-menu-backdrop${open ? ' open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true"/>
    <aside className={`mobile-menu${open ? ' open' : ''}`} aria-hidden={!open}>
      <div className="mobile-menu-head"><Logo/><button className="icon-btn close" onClick={() => setOpen(false)} aria-label="Fermer le menu"><X/></button></div>
      <p>Votre sélection tech, création et lifestyle.</p>
      <nav>{navItems.map(([to, label]) => <NavLink end={to === '/'} key={to} to={to} onClick={() => setOpen(false)}>{label}</NavLink>)}</nav>
      <div className="mobile-menu-links"><NavLink to="/favoris" onClick={() => setOpen(false)}><Heart/> Mes favoris</NavLink><NavLink to={accountPath} onClick={() => setOpen(false)}><UserRound/> Mon compte</NavLink></div>
    </aside>

    <main><Outlet/></main>

    <nav className="mobile-bottom-nav" aria-label="Navigation mobile">
      <NavLink end to="/"><Home/><span>Accueil</span></NavLink>
      <NavLink to="/boutique"><Store/><span>Boutique</span></NavLink>
      <NavLink to="/favoris"><Heart/><span>Favoris</span></NavLink>
      <NavLink to="/panier" className="bottom-cart"><ShoppingBag/><span>Panier</span>{cartCount > 0 ? <b>{cartCount}</b> : null}</NavLink>
      <NavLink to={accountPath}><UserRound/><span>Compte</span></NavLink>
    </nav>

    <footer className="storefront-footer"><div className="container footer-grid">
      <div className="footer-brand"><Logo inverse/><p>L’essentiel, avec confiance.</p><span>Conakry · Guinée</span></div>
      <div><h3>Boutique</h3><a href="/#nouveautes">Nouveautés</a><Link to="/promotions">Promotions</Link><Link to="/categories">Catégories</Link></div>
      <div><h3>Aide</h3><Link to="/compte/commandes">Livraison</Link><Link to="/compte/commandes">Retours</Link><Link to={accountPath}>Contact</Link></div>
      <div><h3>Dom G Store</h3><Link to="/a-propos">À propos</Link><Link to="/conditions">Conditions</Link><Link to="/confidentialite">Confidentialité</Link></div>
    </div><div className="container copyright"><span>© 2026 Dom G Store</span><span>Qualité · Fiabilité · Service local</span></div></footer>
  </>
}
