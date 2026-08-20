import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { Badge, Button, EmptyState, Input, LoadingSkeleton, PageHeader } from '../../components/ui'
import {
  supabaseInventoryService,
  type InventoryItem,
  type StockStatus,
} from '../../services/supabaseInventoryService'
import { AdminLayout } from './AdminPages'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Une erreur inattendue est survenue avec Supabase.'
}

function statusLabel(status: StockStatus) {
  if (status === 'rupture') return 'Rupture'
  if (status === 'stock faible') return 'Stock faible'
  return 'En stock'
}

function statusTone(status: StockStatus) {
  if (status === 'rupture') return 'danger'
  if (status === 'stock faible') return 'warning'
  return 'success'
}

function calculateStatus(quantity: number, threshold: number): StockStatus {
  if (quantity === 0) return 'rupture'
  if (quantity <= threshold) return 'stock faible'
  return 'en stock'
}

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
    : '—'
}

export function AdminStocksPage(){const [stocks,setStocks]=useState<InventoryItem[]>([]),[q,setQ]=useState(''),[status,setStatus]=useState<'tous'|StockStatus>('tous'),[loading,setLoading]=useState(true),[error,setError]=useState(''),[updatingId,setUpdatingId]=useState<string|null>(null);useEffect(()=>{let active=true;void supabaseInventoryService.list().then(items=>{if(active)setStocks(items)}).catch(cause=>{if(!active)return;const message=errorMessage(cause);setError(message);toast.error(`Impossible de charger les stocks : ${message}`)}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);const filtered=stocks.filter(item=>{const needle=q.trim().toLowerCase();const matchesSearch=!needle||`${item.productName} ${item.productSku} ${item.variantSku} ${item.variantLabel}`.toLowerCase().includes(needle);return matchesSearch&&(status==='tous'||item.status===status)});const changeValue=(id:string,key:'quantity'|'lowStockThreshold',value:number)=>setStocks(current=>current.map(item=>{if(item.id!==id)return item;const updated={...item,[key]:value};return {...updated,status:calculateStatus(updated.quantity,updated.lowStockThreshold)}}));const save=async(item:InventoryItem)=>{if(!Number.isInteger(item.quantity)||!Number.isInteger(item.lowStockThreshold)||item.quantity<0||item.lowStockThreshold<0)return toast.error('La quantité et le seuil doivent être des nombres entiers positifs.');setUpdatingId(item.id);try{const updated=await supabaseInventoryService.update(item.id,{quantity:item.quantity,lowStockThreshold:item.lowStockThreshold});setStocks(current=>current.map(stock=>stock.id===updated.id?updated:stock));toast.success('Stock mis à jour dans Supabase')}catch(cause){console.error('Échec de mise à jour de public.inventory.',cause);toast.error(`Mise à jour impossible : ${errorMessage(cause)}`)}finally{setUpdatingId(null)}};const alerts=stocks.filter(item=>item.status!=='en stock').length;return <AdminLayout><PageHeader title="Gestion des stocks" description={`${alerts} alerte${alerts>1?'s':''} nécessite${alerts>1?'nt':''} votre attention.`}/><div className="table-tools"><div className="search-field"><Search/><Input value={q} onChange={event=>setQ(event.target.value)} placeholder="Produit, SKU ou variante…"/></div><select aria-label="Filtrer par statut" value={status} onChange={event=>setStatus(event.target.value as 'tous'|StockStatus)}><option value="tous">Tous les statuts</option><option value="en stock">En stock</option><option value="stock faible">Stock faible</option><option value="rupture">Rupture</option></select></div>{loading?<LoadingSkeleton/>:error?<EmptyState title="Impossible de charger les stocks" text={error}/>:stocks.length===0?<EmptyState title="Aucun stock enregistré" text="Les lignes ajoutées dans l’inventaire apparaîtront ici."/>:filtered.length===0?<EmptyState title="Aucun résultat" text="Modifiez la recherche ou le filtre de statut."/>:<div className="table-wrap"><table><thead><tr><th>Produit</th><th>SKU</th><th>Variante</th><th>Quantité</th><th>Seuil faible</th><th>Statut</th><th>Dernière modification</th><th>Action</th></tr></thead><tbody>{filtered.map(item=><tr key={item.id}><td><div className="table-product">{item.productImage?<img src={item.productImage} alt=""/>:<span className="product-thumb-empty"/>}<strong>{item.productName}</strong></div></td><td>{item.productSku}</td><td><span>{item.variantLabel}</span>{item.variantSku?<small>{item.variantSku}</small>:null}</td><td><Input aria-label={`Quantité de ${item.productName}`} className="stock-input" min={0} step={1} type="number" value={item.quantity} onChange={event=>changeValue(item.id,'quantity',Number(event.target.value))}/></td><td><Input aria-label={`Seuil de ${item.productName}`} className="stock-input" min={0} step={1} type="number" value={item.lowStockThreshold} onChange={event=>changeValue(item.id,'lowStockThreshold',Number(event.target.value))}/></td><td><Badge tone={statusTone(item.status)}>{statusLabel(item.status)}</Badge></td><td>{formatDate(item.updatedAt)}</td><td><Button className="secondary small" disabled={updatingId===item.id} onClick={()=>void save(item)}>{updatingId===item.id?'Mise à jour…':'Enregistrer'}</Button></td></tr>)}</tbody></table></div>}</AdminLayout>}
