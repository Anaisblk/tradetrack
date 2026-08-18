import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { fetchClient, updateClient } from '../../api/clients'
import { fetchRepairs } from '../../api/repairs'
import { QUERY_KEYS } from '../../api/queryKeys'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { IconPencil } from '../../components/ui/Icon'
import { REPAIR_STATUS_LABELS, getStatusColor, formatDate, formatCurrency } from '../../utils/formatters'

const EMPTY_FORM = { first_name: '', last_name: '', phone: '', email: '', address: '' }

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: client } = useQuery({ queryKey: QUERY_KEYS.client(id), queryFn: () => fetchClient(id) })
  const { data: allRepairs = [] } = useQuery({ queryKey: QUERY_KEYS.repairs, queryFn: fetchRepairs })
  const clientRepairs = allRepairs
    .filter((r) => r.client_id === Number(id))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)

  const openEdit = () => {
    setForm({
      first_name: client.first_name,
      last_name: client.last_name,
      phone: client.phone || '',
      email: client.email || '',
      address: client.address || '',
    })
    setFormError(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setFormError(null)
  }

  const mutation = useMutation({
    mutationFn: (data) => updateClient(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.client(id) })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.clients })
      closeModal()
      toast.success('Client mis à jour')
    },
    onError: (e) => setFormError(e.response?.data?.detail || 'Erreur lors de la mise à jour'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setFormError(null)
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError('Le prénom et le nom sont obligatoires')
      return
    }
    mutation.mutate({
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
    })
  }

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  if (!client) return <div className="p-8 text-gray-400">Chargement...</div>

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-xl sm:text-2xl font-bold">{client.first_name} {client.last_name}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-700">Informations</h3>
            <button
              onClick={openEdit}
              className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <IconPencil size={14} />
              Modifier
            </button>
          </div>
          <div className="text-sm space-y-2">
            <p><span className="text-gray-500">Téléphone :</span> {client.phone || '—'}</p>
            <p><span className="text-gray-500">Email :</span> {client.email || '—'}</p>
            <p><span className="text-gray-500">Adresse :</span> {client.address || '—'}</p>
            <p><span className="text-gray-500">Compte client :</span> {client.user_id ? 'Oui' : 'Non'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 mt-6">
        <h3 className="font-semibold mb-4">Historique des réparations</h3>
        {clientRepairs.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucune réparation pour ce client.
          </p>
        ) : (
          <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
            <thead className="text-gray-500 border-b">
              <tr className="text-left">
                <th className="pb-2">N°</th>
                <th className="pb-2">Date</th>
                <th className="pb-2">Appareil</th>
                <th className="pb-2">Statut</th>
                <th className="pb-2 text-right">Montant TTC</th>
              </tr>
            </thead>
            <tbody>
              {clientRepairs.map((r) => (
                <tr
                  key={r.id}
                  className="border-t hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/repairs/${r.id}`)}
                >
                  <td className="py-2 font-medium">#{r.id}</td>
                  <td className="py-2 text-gray-600">{formatDate(r.created_at)}</td>
                  <td className="py-2">
                    {r.device_type}
                    {r.device_brand && ` ${r.device_brand}`}
                    {r.device_model && ` ${r.device_model}`}
                  </td>
                  <td className="py-2">
                    <Badge
                      label={REPAIR_STATUS_LABELS[r.status] || r.status}
                      color={getStatusColor(r.status)}
                    />
                  </td>
                  <td className="py-2 text-right font-medium">
                    {formatCurrency(r.repair_cost_ttc)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={closeModal} title="Modifier le client" size="sm">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Prénom *" value={form.first_name} onChange={set('first_name')} autoFocus />
            <Input label="Nom *" value={form.last_name} onChange={set('last_name')} />
          </div>
          <Input label="Téléphone" type="tel" value={form.phone} onChange={set('phone')} />
          <Input label="Email" type="email" value={form.email} onChange={set('email')} />
          <Input label="Adresse" value={form.address} onChange={set('address')} />

          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
