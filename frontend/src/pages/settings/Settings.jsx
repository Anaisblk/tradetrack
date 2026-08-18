import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import { QUERY_KEYS } from '../../api/queryKeys'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { IconPlus } from '../../components/ui/Icon'

const fetchUsers = () => api.get('/users').then((r) => r.data)
const createUser = (data) => api.post('/users', data).then((r) => r.data)
const updateUser = (id, data) => api.put(`/users/${id}`, data).then((r) => r.data)
const deleteUser = (id) => api.delete(`/users/${id}`)

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'vendeur', label: 'Vendeur' },
  { value: 'technicien', label: 'Technicien' },
  { value: 'client', label: 'Client' },
]

export default function SettingsPage() {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '', phone: '', role: 'vendeur' })
  const qc = useQueryClient()

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); setShowModal(false); toast.success('Utilisateur créé') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Erreur'),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id) => deleteUser(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur désactivé') },
  })

  const roleColors = { admin: 'red', vendeur: 'blue', technicien: 'green', client: 'gray' }

  return (
    <div className="space-y-8 max-w-4xl">
      <h2 className="text-xl sm:text-2xl font-bold">Paramètres</h2>

      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Gestion des utilisateurs</h3>
          <Button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5">
            <IconPlus size={16} />
            Nouveau
          </Button>
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="text-gray-500 border-b">
            <tr className="text-left">
              <th className="pb-2">Nom</th>
              <th className="pb-2">Email</th>
              <th className="pb-2">Rôle</th>
              <th className="pb-2">Statut</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t">
                <td className="py-2">{u.first_name} {u.last_name}</td>
                <td className="py-2 text-gray-600">{u.email}</td>
                <td className="py-2"><Badge label={u.role} color={roleColors[u.role]} /></td>
                <td className="py-2"><Badge label={u.is_active ? 'Actif' : 'Inactif'} color={u.is_active ? 'green' : 'gray'} /></td>
                <td className="py-2">
                  {u.is_active && (
                    <button className="text-red-500 hover:underline text-xs" onClick={() => deactivateMutation.mutate(u.id)}>
                      Désactiver
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Nouvel utilisateur">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Prénom *" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <Input label="Nom *" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <Input label="Email *" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Mot de passe *" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Input label="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Select label="Rôle" options={ROLE_OPTIONS} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button className="flex-1" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>Créer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
