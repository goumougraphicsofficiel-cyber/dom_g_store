import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { X, PackageOpen } from 'lucide-react'
export const Button=({className='',...p}:ButtonHTMLAttributes<HTMLButtonElement>)=><button className={`btn ${className}`} {...p}/>
export const Input=({className='',...p}:InputHTMLAttributes<HTMLInputElement>)=><input className={`input ${className}`} {...p}/>
export const Card=({className='',...p}:HTMLAttributes<HTMLDivElement>)=><div className={`card ${className}`} {...p}/>
export const Badge=({children,tone='neutral'}:{children:ReactNode;tone?:string})=><span className={`badge ${tone}`}>{children}</span>
export const PageHeader=({title,description,action}:{title:string;description?:string;action?:ReactNode})=><div className="page-header"><div><h1>{title}</h1>{description?<p>{description}</p>:null}</div>{action}</div>
export const EmptyState=({title='Aucun élément',text='Revenez bientôt ou modifiez vos critères.'}:{title?:string;text?:string})=><div className="empty"><PackageOpen/><h3>{title}</h3><p>{text}</p></div>
export const LoadingSkeleton=()=> <div className="skeleton-grid">{Array.from({length:8},(_,i)=><div className="skeleton" key={i}/>)}</div>
export function Modal({open,onClose,title,children}:{open:boolean;onClose:()=>void;title:string;children:ReactNode}){if(!open)return null;return <div className="overlay" role="dialog" aria-modal="true"><div className="modal"><div className="modal-head"><h2>{title}</h2><button className="icon-btn" onClick={onClose} aria-label="Fermer"><X/></button></div>{children}</div></div>}
export const StatusBadge=({status}:{status:string})=><Badge tone={status.includes('livr')||status==='approuvé'||status==='en stock'?'success':status.includes('annul')||status==='rupture'?'danger':status.includes('attente')||status.includes('faible')?'warning':'info'}>{status}</Badge>
