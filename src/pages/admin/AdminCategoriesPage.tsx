import { useEffect, useState } from 'react'
import { Edit3, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { CategoryImage } from '../../components/category/CategoryImage'
import { CategoryImageUpload } from '../../components/category/CategoryImageUpload'
import { Button, Card, EmptyState, Input, LoadingSkeleton, Modal, PageHeader, StatusBadge } from '../../components/ui'
import { useStore } from '../../context/StoreContext'
import { supabaseCategoryImageService } from '../../services/supabaseCategoryImageService'
import { supabaseCategoryService, type AdminCategory } from '../../services/supabaseCategoryService'
import type { Category } from '../../types'
import { slugify } from '../../utils'
import { AdminLayout } from './AdminPages'

const blankCategory: Category = { id: '', name: '', slug: '', description: '', image: '', active: true, productCount: 0 }

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    if (error.message.includes('categories_slug_key')) return 'Ce slug est déjà utilisé par une autre catégorie.'
    return error.message
  }
  return 'Une erreur inattendue est survenue avec Supabase.'
}

export function AdminCategoriesPage() {
  const { setCategories: syncStoreCategories } = useStore()
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [form, setForm] = useState<Category>(blankCategory)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void supabaseCategoryService.list().then(items => { if (active) setCategories(items) }).catch(cause => {
      if (!active) return
      const message = errorMessage(cause)
      setError(message)
      toast.error(`Impossible de charger les catégories : ${message}`)
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const close = () => {
    if (saving) return
    setOpen(false)
    setForm(blankCategory)
    setSelectedFile(null)
  }

  const save = async () => {
    if (!form.name.trim()) return toast.error('Le nom est requis')
    setSaving(true)
    let saved: AdminCategory | null = null
    try {
      const payload = { name: form.name, slug: form.slug.trim() || slugify(form.name), description: form.description, image: form.image, active: form.active }
      saved = form.id ? await supabaseCategoryService.update(form.id, payload) : await supabaseCategoryService.create(payload)
      if (selectedFile) {
        const upload = await supabaseCategoryImageService.upload(saved.id, selectedFile, saved.image)
        saved = { ...saved, image: upload.imageUrl }
        if (upload.cleanupWarning) console.warn('La nouvelle image est enregistrée, mais l’ancienne n’a pas pu être supprimée.', upload.cleanupWarning)
      }
      const completed = saved
      const nextCategories = (categories.some(item => item.id === completed.id)
        ? categories.map(item => item.id === completed.id ? completed : item)
        : [...categories, completed]).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
      setCategories(nextCategories)
      syncStoreCategories(nextCategories.filter(category => category.active))
      toast.success(form.id ? 'Catégorie modifiée' : 'Catégorie ajoutée')
      setOpen(false)
      setForm(blankCategory)
      setSelectedFile(null)
    } catch (cause) {
      if (saved) {
        const retainedCategory = saved
        setForm(retainedCategory)
        setCategories(current => current.some(item => item.id === retainedCategory.id) ? current.map(item => item.id === retainedCategory.id ? retainedCategory : item) : [...current, retainedCategory])
      }
      console.error('Échec de l’enregistrement ou de l’image de la catégorie.', cause)
      toast.error(`Enregistrement impossible : ${errorMessage(cause)} Les données du formulaire sont conservées.`)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (category: AdminCategory) => {
    if (!confirm(`Supprimer la catégorie « ${category.name} » ?`)) return
    setDeletingId(category.id)
    try {
      await supabaseCategoryService.remove(category.id)
      try { await supabaseCategoryImageService.remove(category.id, category.image) }
      catch (storageError) { console.warn('Catégorie supprimée, mais son ancien fichier Storage n’a pas pu être nettoyé.', storageError) }
      const nextCategories = categories.filter(item => item.id !== category.id)
      setCategories(nextCategories)
      syncStoreCategories(nextCategories.filter(item => item.active))
      toast.success('Catégorie supprimée')
    } catch (cause) {
      toast.error(`Suppression impossible : ${errorMessage(cause)}`)
    } finally {
      setDeletingId(null)
    }
  }

  return <AdminLayout>
    <PageHeader title="Catégories" description="Organisez les rayons de votre boutique." action={<Button onClick={() => { setForm(blankCategory); setSelectedFile(null); setOpen(true) }}><Plus/> Ajouter</Button>}/>
    {loading ? <LoadingSkeleton/> : error ? <EmptyState title="Impossible de charger les catégories" text={error}/> : categories.length === 0 ? <EmptyState title="Aucune catégorie" text="Ajoutez votre première catégorie pour organiser le catalogue."/> : <div className="category-admin-grid">{categories.map(category => <Card key={category.id}>
      <CategoryImage url={category.image} name={category.name}/>
      <div><h3>{category.name}</h3><p>{category.productCount} produit{category.productCount > 1 ? 's' : ''}</p><StatusBadge status={category.active ? 'actif' : 'inactif'}/></div>
      <button className="icon-btn" aria-label={`Modifier ${category.name}`} onClick={() => { setForm(category); setSelectedFile(null); setOpen(true) }}><Edit3/></button>
      <button className="icon-btn danger-text" aria-label={`Supprimer ${category.name}`} disabled={deletingId === category.id} onClick={() => void remove(category)}><Trash2/></button>
    </Card>)}</div>}
    <Modal open={open} onClose={close} title={form.id ? 'Modifier la catégorie' : 'Ajouter une catégorie'}>
      <label>Nom<Input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/></label>
      <label>Slug<Input value={form.slug} placeholder="Généré automatiquement si vide" onChange={event => setForm({ ...form, slug: event.target.value })}/></label>
      <label>Description<textarea value={form.description} onChange={event => setForm({ ...form, description: event.target.value })}/></label>
      <CategoryImageUpload currentUrl={form.image} selectedFile={selectedFile} disabled={saving} onFileChange={setSelectedFile} onError={message => toast.error(message)}/>
      <label className="check"><input type="checkbox" checked={form.active} onChange={event => setForm({ ...form, active: event.target.checked })}/> Active</label>
      {saving && selectedFile ? <p className="upload-status">Téléversement en cours...</p> : null}
      <Button disabled={saving} onClick={() => void save()}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Button>
    </Modal>
  </AdminLayout>
}
