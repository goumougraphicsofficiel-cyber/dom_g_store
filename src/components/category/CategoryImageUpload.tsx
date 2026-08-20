import { useEffect, useMemo, useRef } from 'react'
import { ImagePlus, Trash2, Upload } from 'lucide-react'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

type Props = {
  currentUrl: string
  selectedFile: File | null
  disabled?: boolean
  onFileChange: (file: File | null) => void
  onError: (message: string) => void
}

export function CategoryImageUpload({ currentUrl, selectedFile, disabled = false, onFileChange, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const previewUrl = useMemo(() => selectedFile ? URL.createObjectURL(selectedFile) : '', [selectedFile])

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const selectFile = (file?: File) => {
    if (!file) return
    if (!ACCEPTED_TYPES.has(file.type)) {
      onError('Sélectionnez une image JPEG, PNG ou WebP.')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      onError('Cette image dépasse la limite de 5 Mo.')
      return
    }
    onFileChange(file)
  }

  const visibleUrl = previewUrl || currentUrl

  return <div className="product-photo-field">
    <span>Image de la catégorie</span>
    <div className="photo-dropzone">
      <ImagePlus/>
      <strong>Choisissez une image depuis votre ordinateur</strong>
      <small>JPEG, PNG ou WebP · 5 Mo maximum</small>
      <button className="btn secondary" disabled={disabled} type="button" onClick={() => inputRef.current?.click()}><Upload/> {visibleUrl ? 'Remplacer l’image' : 'Ajouter une image'}</button>
      <input ref={inputRef} hidden type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={event => { selectFile(event.target.files?.[0]); event.target.value = '' }}/>
    </div>
    {visibleUrl ? <div className="photo-preview-grid"><div className="photo-preview">
      <img src={visibleUrl} alt="Aperçu de la catégorie"/>
      {selectedFile ? <span>Nouvelle image</span> : <span>Image actuelle</span>}
      {selectedFile ? <button type="button" className="icon-btn danger-text" disabled={disabled} aria-label="Retirer la nouvelle image" onClick={() => onFileChange(null)}><Trash2/></button> : null}
    </div></div> : null}
  </div>
}
