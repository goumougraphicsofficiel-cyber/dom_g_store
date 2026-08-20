import { ImageIcon } from 'lucide-react'
import { useState } from 'react'

export function CategoryImage({ url, name, className = '' }: { url: string; name: string; className?: string }) {
  return <CategoryImageSource key={url} url={url} name={name} className={className}/>
}

function CategoryImageSource({ url, name, className }: { url: string; name: string; className: string }) {
  const [failed, setFailed] = useState(false)
  return url && !failed
    ? <img className={className} src={url} alt={name} onError={() => setFailed(true)}/>
    : <span className={`category-image-placeholder ${className}`} role="img" aria-label={`Aucune image pour ${name}`}><ImageIcon/></span>
}
