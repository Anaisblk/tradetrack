import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { fetchProductsPaginated, createProduct, updateProduct, fetchCategories } from '../../api/products'
import { QUERY_KEYS } from '../../api/queryKeys'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import SortableHeader from '../../components/ui/SortableHeader'
import MobileSortSelect from '../../components/ui/MobileSortSelect'
import Pagination from '../../components/ui/Pagination'
import { IconPlus, IconPencil } from '../../components/ui/Icon'
import { formatCurrency } from '../../utils/formatters'

const EMPTY_FORM = {
  name: '',
  category_id: '',
  barcode: '',
  purchase_price: '',
  selling_price: '',
  stock_quantity: 0,
  condition: 'neuf',
}

// Same fields as the table headers, for the card view
const SORT_FIELDS = [
  { label: 'Produit', field: 'name' },
  { label: 'Catégorie', field: 'category' },
  { label: 'Prix vente TTC', field: 'selling_price' },
  { label: 'Stock', field: 'stock_quantity' },
]

export default function StockPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ field: null, direction: 'asc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [createError, setCreateError] = useState(null)
  const [editError, setEditError] = useState(null)
  const qc = useQueryClient()

  useEffect(() => { setPage(1) }, [search, sort.field, sort.direction, pageSize])

  const { data, isFetching } = useQuery({
    queryKey: [...QUERY_KEYS.products, 'paginated', 'piece', search, sort.field, sort.direction, page, pageSize],
    queryFn: () => fetchProductsPaginated({
      skip: (page - 1) * pageSize,
      limit: pageSize,
      search: search || undefined,
      order_by: sort.field || undefined,
      order_dir: sort.direction,
      category_type: 'piece',
    }),
    placeholderData: keepPreviousData,
  })
  const products = data?.items ?? []
  const total = data?.total ?? 0

  const handleSort = (field) => {
    setSort((s) => s.field === field
      ? { field, direction: s.direction === 'asc' ? 'desc' : 'asc' }
      : { field, direction: 'asc' })
  }
  const { data: categories = [] } = useQuery({ queryKey: QUERY_KEYS.categories, queryFn: fetchCategories })

  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.products })
      closeCreate()
      toast.success('Produit créé')
    },
    onError: (e) => setCreateError(e.response?.data?.detail || 'Erreur lors de la création'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.products })
      closeEdit()
      toast.success('Produit modifié')
    },
    onError: (e) => setEditError(e.response?.data?.detail || 'Erreur lors de la modification'),
  })

  const catOptions = [{ value: '', label: 'Aucune' }, ...categories.map((c) => ({ value: String(c.id), label: c.name }))]
  const conditionOptions = [
    { value: 'neuf', label: 'Neuf (TVA)' },
    { value: 'occasion', label: 'Occasion (TVM)' },
  ]

  const priceLabels = (_condition) => ({
    purchase: "Prix d'achat TTC",
    selling: 'Prix de vente TTC *',
    helper: null,
  })

  const closeCreate = () => {
    setShowCreateModal(false)
    setForm(EMPTY_FORM)
    setCreateError(null)
  }

  const openEdit = (product) => {
    setEditTarget(product)
    setEditForm({
      name: product.name,
      category_id: product.category_id ? String(product.category_id) : '',
      barcode: product.barcode || '',
      purchase_price: product.purchase_price ?? '',
      selling_price: product.selling_price ?? '',
      stock_quantity: product.stock_quantity ?? 0,
      condition: product.condition || 'neuf',
    })
    setEditError(null)
  }

  const closeEdit = () => {
    setEditTarget(null)
    setEditForm(EMPTY_FORM)
    setEditError(null)
  }

  const buildPayload = (f) => ({
    name: f.name.trim(),
    category_id: f.category_id ? Number(f.category_id) : null,
    barcode: f.barcode.trim() || null,
    purchase_price: f.purchase_price === '' ? null : Number(f.purchase_price),
    selling_price: f.selling_price === '' ? null : Number(f.selling_price),
    stock_quantity: Number(f.stock_quantity) || 0,
    condition: f.condition,
  })

  const validate = (f) => {
    if (!f.name.trim()) return 'Le nom est obligatoire'
    if (f.selling_price === '' || Number(f.selling_price) < 0) return 'Le prix de vente est invalide'
    if (f.purchase_price !== '' && Number(f.purchase_price) < 0) return "Le prix d'achat est invalide"
    if (Number(f.stock_quantity) < 0) return 'Le stock ne peut pas être négatif'
    return null
  }

  const handleCreate = (e) => {
    e.preventDefault()
    const err = validate(form)
    if (err) { setCreateError(err); return }
    createMutation.mutate(buildPayload(form))
  }

  const handleEdit = (e) => {
    e.preventDefault()
    const err = validate(editForm)
    if (err) { setEditError(err); return }
    updateMutation.mutate({ id: editTarget.id, data: buildPayload(editForm) })
  }

  const setF = (setter) => (field) => (e) => setter((prev) => ({ ...prev, [field]: e.target.value }))
  const setCreateField = setF(setForm)
  const setEditField = setF(setEditForm)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">Pièces détachées</h2>
        <Button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-1.5">
          <IconPlus size={16} />
          Nouveau
        </Button>
      </div>

      <div className="max-w-sm">
        <Input placeholder="Rechercher un produit..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <MobileSortSelect className="md:hidden" fields={SORT_FIELDS} sort={sort} onSort={handleSort} />

      <div className="bg-white rounded-xl border overflow-hidden">
        {/* Cards on mobile, table from md */}
        <div className="md:hidden divide-y">
          {products.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">Aucun produit</p>
          ) : products.map((p) => (
            <div key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="font-medium break-words">{p.name}</p>
                <Badge label={p.condition} color={p.condition === 'neuf' ? 'blue' : 'gray'} />
              </div>
              <p className="text-sm text-gray-500 mt-1">{p.category?.name || '—'}</p>
              <div className="flex items-center justify-between gap-3 mt-2 text-sm">
                <span className="font-medium">{formatCurrency(p.selling_price)}</span>
                <span className="text-gray-500">{p.condition === 'occasion' ? 'TVM' : 'TVA'}</span>
                <span className={p.stock_quantity < 3 ? 'text-red-600 font-bold' : ''}>
                  Stock : {p.stock_quantity}
                </span>
              </div>
              <button onClick={() => openEdit(p)} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 text-sm mt-3 py-1">
                <IconPencil size={14} />
                Modifier
              </button>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <SortableHeader label="Produit" field="name" sort={sort} onSort={handleSort} />
              <SortableHeader label="Catégorie" field="category" sort={sort} onSort={handleSort} />
              <th className="px-4 py-3">État</th>
              <SortableHeader label="Prix vente TTC" field="selling_price" sort={sort} onSort={handleSort} />
              <th className="px-4 py-3">Régime</th>
              <SortableHeader label="Stock" field="stock_quantity" sort={sort} onSort={handleSort} />
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Aucun produit</td></tr>
            ) : products.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-gray-500">{p.category?.name || '—'}</td>
                <td className="px-4 py-3"><Badge label={p.condition} color={p.condition === 'neuf' ? 'blue' : 'gray'} /></td>
                <td className="px-4 py-3">{formatCurrency(p.selling_price)}</td>
                <td className="px-4 py-3 text-gray-500">{p.condition === 'occasion' ? 'TVM' : 'TVA'}</td>
                <td className="px-4 py-3">
                  <span className={p.stock_quantity < 3 ? 'text-red-600 font-bold' : ''}>{p.stock_quantity}</span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => openEdit(p)} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 hover:underline text-sm">
                    <IconPencil size={14} />
                    Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          disabled={isFetching}
        />
      </div>
      <Modal isOpen={showCreateModal} onClose={closeCreate} title="Nouveau produit" size="lg">
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Nom *" className="sm:col-span-2" value={form.name} onChange={setCreateField('name')} autoFocus />
            <Select label="Catégorie" options={catOptions} value={form.category_id} onChange={setCreateField('category_id')} />
            <Input label="Code-barres" value={form.barcode} onChange={setCreateField('barcode')} />
            <Input label={priceLabels(form.condition).purchase} type="number" step="0.01" value={form.purchase_price} onChange={setCreateField('purchase_price')} />
            <Input label={priceLabels(form.condition).selling} type="number" step="0.01" value={form.selling_price} onChange={setCreateField('selling_price')} />
            <Input label="Stock initial" type="number" value={form.stock_quantity} onChange={setCreateField('stock_quantity')} />
            <Select label="État" options={conditionOptions} value={form.condition} onChange={setCreateField('condition')} />
          </div>
          {priceLabels(form.condition).helper && (
            <p className="text-xs text-gray-500">{priceLabels(form.condition).helper}</p>
          )}

          {createError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {createError}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeCreate}>Annuler</Button>
            <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Création…' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
      <Modal isOpen={!!editTarget} onClose={closeEdit} title={editTarget ? `Modifier — ${editTarget.name}` : ''} size="lg">
        <form onSubmit={handleEdit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Nom *" className="sm:col-span-2" value={editForm.name} onChange={setEditField('name')} autoFocus />
            <Select label="Catégorie" options={catOptions} value={editForm.category_id} onChange={setEditField('category_id')} />
            <Input label="Code-barres" value={editForm.barcode} onChange={setEditField('barcode')} />
            <Input label={priceLabels(editForm.condition).purchase} type="number" step="0.01" value={editForm.purchase_price} onChange={setEditField('purchase_price')} />
            <Input label={priceLabels(editForm.condition).selling} type="number" step="0.01" value={editForm.selling_price} onChange={setEditField('selling_price')} />
            <Input label="Stock" type="number" value={editForm.stock_quantity} onChange={setEditField('stock_quantity')} />
            <Select label="État" options={conditionOptions} value={editForm.condition} onChange={setEditField('condition')} />
          </div>
          {priceLabels(editForm.condition).helper && (
            <p className="text-xs text-gray-500">{priceLabels(editForm.condition).helper}</p>
          )}

          {editError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {editError}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeEdit}>Annuler</Button>
            <Button type="submit" className="flex-1" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
