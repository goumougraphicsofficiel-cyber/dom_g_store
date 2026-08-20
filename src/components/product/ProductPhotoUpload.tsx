import { useEffect, useMemo, useRef, useState } from 'react'
import { ImagePlus, Trash2, Upload } from 'lucide-react'

const MAX_IMAGES = 5
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

type Props = {
  existingUrls: string[]
  selectedFiles: File[]
  disabled?: boolean
  onExistingUrlsChange: (urls: string[]) => void
  onSelectedFilesChange: (files: File[]) => void
  onError: (message: string) => void
}

export function ProductPhotoUpload({
  existingUrls,
  selectedFiles,
  disabled = false,
  onExistingUrlsChange,
  onSelectedFilesChange,
  onError,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const previews = useMemo(
    () => selectedFiles.map(file => ({ file, url: URL.createObjectURL(file) })),
    [selectedFiles],
  )

  useEffect(
    () => () => previews.forEach(preview => URL.revokeObjectURL(preview.url)),
    [previews],
  )

  const addFiles = (incoming: File[]) => {
    const valid: File[] = []

    for (const file of incoming) {
      if (!ACCEPTED_TYPES.has(file.type)) {
        onError(`« ${file.name} » n’est pas une image JPEG, PNG ou WebP.`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        onError(`« ${file.name} » dépasse la limite de 5 Mo.`)
        continue
      }
      valid.push(file)
    }

    const available = MAX_IMAGES - existingUrls.length - selectedFiles.length
    if (available <= 0) {
      onError('Vous pouvez ajouter au maximum 5 photos par produit.')
      return
    }
    if (valid.length > available) {
      onError(`Seulement ${available} photo${available > 1 ? 's' : ''} supplémentaire${available > 1 ? 's' : ''} autorisée${available > 1 ? 's' : ''}.`)
    }
    onSelectedFilesChange([...selectedFiles, ...valid.slice(0, available)])
  }

  return (
    <div className="product-photo-field">
      <span>Photos du produit</span>
      <div
        className={dragging ? 'photo-dropzone dragging' : 'photo-dropzone'}
        onDragEnter={event => { event.preventDefault(); setDragging(true) }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={event => {
          event.preventDefault()
          setDragging(false)
          if (!disabled) addFiles(Array.from(event.dataTransfer.files))
        }}
      >
        <ImagePlus />
        <strong>Glissez vos photos ici</strong>
        <small>JPEG, PNG ou WebP · 5 Mo maximum · 5 photos</small>
        <button
          className="btn secondary"
          disabled={disabled}
          type="button"
          onClick={() => inputRef.current?.click()}
        >
          <Upload /> Ajouter des photos
        </button>
        <input
          ref={inputRef}
          hidden
          multiple
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={disabled}
          onChange={event => {
            addFiles(Array.from(event.target.files ?? []))
            event.target.value = ''
          }}
        />
      </div>

      {existingUrls.length || previews.length ? (
        <div className="photo-preview-grid">
          {existingUrls.map((url, index) => (
            <div className="photo-preview" key={url}>
              <img src={url} alt={`Photo du produit ${index + 1}`} />
              {index === 0 ? <span>Principale</span> : null}
              <button
                type="button"
                className="icon-btn danger-text"
                disabled={disabled}
                aria-label={`Supprimer la photo ${index + 1}`}
                onClick={() => onExistingUrlsChange(existingUrls.filter(item => item !== url))}
              >
                <Trash2 />
              </button>
            </div>
          ))}
          {previews.map(({ file, url }, index) => (
            <div className="photo-preview pending" key={`${file.name}-${file.lastModified}`}>
              <img src={url} alt={`Nouvelle photo ${index + 1}`} />
              {existingUrls.length === 0 && index === 0 ? <span>Principale</span> : null}
              <button
                type="button"
                className="icon-btn danger-text"
                disabled={disabled}
                aria-label={`Retirer ${file.name}`}
                onClick={() => onSelectedFilesChange(selectedFiles.filter(item => item !== file))}
              >
                <Trash2 />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
