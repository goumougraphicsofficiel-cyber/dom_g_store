import officialLogoUrl from '../../assets/Logo Dom g Store.png'

interface BrandLogoProps {
  className?: string
}

export function BrandLogo({ className = '' }: BrandLogoProps) {
  return <span className={`brand-logo${className ? ` ${className}` : ''}`}>
    <img className="brand-logo-image" src={officialLogoUrl} alt="Dom G Store" draggable={false}/>
  </span>
}
