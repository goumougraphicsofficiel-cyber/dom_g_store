import { Link } from 'react-router-dom'
import { CategoryImage } from '../../components/category/CategoryImage'
import { Badge, EmptyState, LoadingSkeleton, PageHeader } from '../../components/ui'
import { useStore } from '../../context/StoreContext'

export function StorefrontCategoriesPage() {
  const { categories, products, catalogLoading, catalogError } = useStore()
  if (catalogLoading) return <div className="container section"><LoadingSkeleton/></div>
  if (catalogError) return <div className="container section"><EmptyState title="Impossible de charger les catégories" text={catalogError}/></div>

  return <div className="container section">
    <PageHeader title="Toutes les catégories" description="Explorez nos univers et trouvez rapidement ce dont vous avez besoin."/>
    {categories.length > 0 ? <div className="category-page-grid">{categories.map(category => {
      const productCount = category.productCount ?? products.filter(product => product.category === category.slug).length
      return <Link to={`/categories/${category.slug}`} className="category-large" key={category.id}>
        <CategoryImage url={category.image} name={category.name}/>
        <div><h2>{category.name}</h2><p>{category.description}</p><Badge tone="info">{productCount} produit{productCount > 1 ? 's' : ''}</Badge></div>
      </Link>
    })}</div> : <EmptyState title="Aucune catégorie disponible"/>}
  </div>
}
