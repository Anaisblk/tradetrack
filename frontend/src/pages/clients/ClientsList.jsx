import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { fetchClientsPaginated, createClient, updateClient } from '../../api/clients'
import { QUERY_KEYS } from '../../api/queryKeys'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import SortableHeader from '../../components/ui/SortableHeader'
import Pagination from '../../components/ui/Pagination'
import { IconPlus, IconPencil } from '../../components/ui/Icon'

const EMPTY_FORM = { first_name: '', last_name: '', phone: '', email: '', address: '' }

export default function ClientsList() {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ field: null, direction: 'asc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_FORM)

  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editError, setEditError] = useState(null)

  const qc = useQueryClient()

  useEffect(() => { setPage(1) }, [search, sort.field, sort.direction, pageSize])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...QUERY_KEYS.clients, 'paginated', search, sort.field, sort.direction, page, pageSize],
    queryFn: () => fetchClientsPaginated({
      skip: (page - 1) * pageSize,
      limit: pageSize,
      search: search || undefined,
      order_by: sort.field || undefined,
      order_dir: sort.direction,
    }),
    placeholderData: keepPreviousData,
  })
  const clients = data?.items ?? []
  const total = data?.total ?? 0

  const handleSort = (field) => {
    setSort((s) => s.field === field
      ? { field, direction: s.direction === 'asc' ? 'desc' : 'asc' }
      : { field, direction: 'asc' })
  }

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.clients })
      setShowCreateModal(false)
      setCreateForm(EMPTY_FORM)
      toast.success('Client créé')
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Erreur'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateClient(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.clients })
      closeEdit()
      toast.success('Client mis à jour')
    },
    onError: (e) => setEditError(e.response?.data?.detail || 'Erreur lors de la mise à jour'),
  })

  const openEdit = (client) => {
    setEditTarget(client)
    setEditForm({
      first_name: client.first_name,
      last_name: client.last_name,
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
    })
    setEditError(null)
  }

  const closeEdit = () => {
    setEditTarget(null)
    setEditForm(EMPTY_FORM)
    setEditError(null)
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    setEditError(null)
    if (!editForm.first_name.trim() || !editForm.last_name.trim()) {
      setEditError('Le prénom et le nom sont obligatoires')
      return
    }
    updateMutation.mutate({
      id: editTarget.id,
      data: {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        phone: editForm.phone.trim() || null,
        email: editForm.email.trim() || null,
        address: editForm.address.trim() || null,
      },
    })
  }

  const setEdit = (field) => (e) => setEditForm((prev) => ({ ...prev, [field]: e.target.value }))
  const setCreate = (field) => (e) => setCreateForm((prev) => ({ ...prev, [field]: e.target.value }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Clients</h2>
        <Button onClick={() => setShowCreateModal(true)} className="inline-flex items-center gap-1.5">
          <IconPlus size={16} />
          Nouveau
        </Button>
      </div>

      <div className="max-w-sm">
        <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <SortableHeader label="Nom" field="name" sort={sort} onSort={handleSort} />
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">Chargement...</td></tr>
            ) : clients.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-gray-400">Aucun client</td></tr>
            ) : clients.map((c) => (
              <tr key={c.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{c.first_name} {c.last_name}</td>
                <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                <td className="px-4 py-3 text-gray-600">{c.email || '—'}</td>
                <td className="px-4 py-3 flex items-center gap-3">
                  <Link to={`/clients/${c.id}`} className="text-indigo-600 hover:underline text-sm">Voir</Link>
                  <button onClick={() => openEdit(c)} className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 hover:underline text-sm">
                    <IconPencil size={14} />
                    Modifier
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          disabled={isFetching}
        />
      </div>

      {/* Modale création */}
      <Modal isOpen={showCreateModal} onClose={() => { setShowCreateModal(false); setCreateForm(EMPTY_FORM) }} title="Nouveau client">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom *" value={createForm.first_name} onChange={setCreate('first_name')} />
            <Input label="Nom *" value={createForm.last_name} onChange={setCreate('last_name')} />
          </div>
          <Input label="Téléphone" value={createForm.phone} onChange={setCreate('phone')} />
          <Input label="Email" type="email" value={createForm.email} onChange={setCreate('email')} />
          <Input label="Adresse" value={createForm.address} onChange={setCreate('address')} />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => { setShowCreateModal(false); setCreateForm(EMPTY_FORM) }}>Annuler</Button>
            <Button className="flex-1" onClick={() => createMutation.mutate(createForm)} disabled={createMutation.isPending}>Créer</Button>
          </div>
        </div>
      </Modal>

      {/* Modale édition */}
      <Modal isOpen={!!editTarget} onClose={closeEdit} title={editTarget ? `Modifier — ${editTarget.first_name} ${editTarget.last_name}` : ''} size="sm">
        <form onSubmit={handleEditSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom *" value={editForm.first_name} onChange={setEdit('first_name')} autoFocus />
            <Input label="Nom *" value={editForm.last_name} onChange={setEdit('last_name')} />
          </div>
          <Input label="Téléphone" type="tel" value={editForm.phone} onChange={setEdit('phone')} />
          <Input label="Email" type="email" value={editForm.email} onChange={setEdit('email')} />
          <Input label="Adresse" value={editForm.address} onChange={setEdit('address')} />

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
