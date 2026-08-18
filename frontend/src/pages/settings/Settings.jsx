import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../../api/axios'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { IconPlus } from '../../components/ui/Icon'

const fetchUsers = () => api.get('/users').then((r) => r.data)
const createUser = (data) => api.post('/users', data).then((r) => r.data)
const updateUser = ({ id, data }) => api.put(`/users/${id}`, data).then((r) => r.data)
const deleteUser = (id) => api.delete(`/users/${id}`)
const approveUser = (id) => api.post(`/users/${id}/approve`).then((r) => r.data)
const rejectUser = (id) => api.post(`/users/${id}/reject`).then((r) => r.data)

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'vendeur', label: 'Vendeur' },
  { value: 'technicien', label: 'Technicien' },
  { value: 'client', label: 'Client' },
]

const EMPTY_CREATE = { email: '', password: '', first_name: '', last_name: '', phone: '', role: 'vendeur' }

// Pending accounts need an action, so they are listed first
const PRIORITY = { pending: 0, rejected: 1, approved: 2 }

function statusBadge(u) {
  if (u.approval_status === 'pending') return { label: 'En attente', color: 'orange' }
  if (u.approval_status === 'rejected') return { label: 'Refusé', color: 'red' }
  return u.is_active ? { label: 'Actif', color: 'green' } : { label: 'Inactif', color: 'gray' }
}

export default function SettingsPage() {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_CREATE)
  const [credTarget, setCredTarget] = useState(null)
  const [credForm, setCredForm] = useState({ email: '', password: '' })
  const qc = useQueryClient()

  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: fetchUsers })

  const sorted = [...users].sort(
    (a, b) => (PRIORITY[a.approval_status] ?? 2) - (PRIORITY[b.approval_status] ?? 2)
  )
  const pendingCount = users.filter((u) => u.approval_status === 'pending').length

  const refresh = (message) => () => {
    qc.invalidateQueries({ queryKey: ['users'] })
    toast.success(message)
  }
  const fail = (e) => toast.error(e.response?.data?.detail || 'Erreur')

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => { refresh('Utilisateur créé')(); setShowModal(false); setForm(EMPTY_CREATE) },
    onError: fail,
  })
  const deactivateMutation = useMutation({
    mutationFn: deleteUser, onSuccess: refresh('Utilisateur désactivé'), onError: fail,
  })
  const approveMutation = useMutation({
    mutationFn: approveUser, onSuccess: refresh('Compte validé'), onError: fail,
  })
  const rejectMutation = useMutation({
    mutationFn: rejectUser, onSuccess: refresh('Demande refusée'), onError: fail,
  })
  const credMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => { refresh('Identifiants modifiés')(); setCredTarget(null) },
    onError: fail,
  })

  const openCred = (u) => {
    setCredTarget(u)
    setCredForm({ email: u.email, password: '' })
  }

  const submitCred = () => {
    // Empty password field means the password stays unchanged
    const data = { email: credForm.email }
    if (credForm.password.trim()) data.password = credForm.password
    credMutation.mutate({ id: credTarget.id, data })
  }

  const roleColors = { admin: 'red', vendeur: 'blue', technicien: 'green', client: 'gray' }

  return (
    <div className="space-y-8 max-w-4xl">
      <h2 className="text-xl sm:text-2xl font-bold">Paramètres</h2>

      <div className="bg-white rounded-xl border p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold">
            Gestion des utilisateurs
            {pendingCount > 0 && (
              <span className="ml-2 text-sm font-normal text-orange-600">
                — {pendingCount} demande{pendingCount > 1 ? 's' : ''} en attente
              </span>
            )}
          </h3>
          <Button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5">
            <IconPlus size={16} />
            Nouveau
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
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
              {sorted.map((u) => {
                const badge = statusBadge(u)
                const isPending = u.approval_status === 'pending'
                return (
                  <tr key={u.id} className={`border-t ${isPending ? 'bg-orange-50' : ''}`}>
                    <td className="py-2">{u.first_name} {u.last_name}</td>
                    <td className="py-2 text-gray-600 break-all">{u.email}</td>
                    <td className="py-2"><Badge label={u.role} color={roleColors[u.role]} /></td>
                    <td className="py-2"><Badge label={badge.label} color={badge.color} /></td>
                    <td className="py-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {isPending && (
                          <>
                            <button
                              className="text-green-600 hover:underline text-xs font-medium py-1"
                              onClick={() => approveMutation.mutate(u.id)}
                              disabled={approveMutation.isPending}
                            >
                              Approuver
                            </button>
                            <button
                              className="text-red-500 hover:underline text-xs py-1"
                              onClick={() => rejectMutation.mutate(u.id)}
                              disabled={rejectMutation.isPending}
                            >
                              Refuser
                            </button>
                          </>
                        )}
                        {u.approval_status === 'rejected' && (
                          <button
                            className="text-green-600 hover:underline text-xs py-1"
                            onClick={() => approveMutation.mutate(u.id)}
                          >
                            Approuver finalement
                          </button>
                        )}
                        {u.approval_status === 'approved' && (
                          <>
                            <button
                              className="text-indigo-600 hover:underline text-xs py-1"
                              onClick={() => openCred(u)}
                            >
                              Identifiants
                            </button>
                            {u.is_active && (
                              <button
                                className="text-red-500 hover:underline text-xs py-1"
                                onClick={() => deactivateMutation.mutate(u.id)}
                              >
                                Désactiver
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* User created by an admin, approved right away */}
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
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button className="flex-1 justify-center" onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending}>Créer</Button>
          </div>
        </div>
      </Modal>

      {/* Resets the credentials of someone who lost their access */}
      <Modal
        isOpen={credTarget !== null}
        onClose={() => setCredTarget(null)}
        title={credTarget ? `Identifiants — ${credTarget.first_name} ${credTarget.last_name}` : ''}
      >
        <div className="space-y-3">
          <Input
            label="Email"
            type="email"
            value={credForm.email}
            onChange={(e) => setCredForm({ ...credForm, email: e.target.value })}
          />
          <Input
            label="Nouveau mot de passe"
            type="text"
            placeholder="Laisser vide pour ne pas le changer"
            value={credForm.password}
            onChange={(e) => setCredForm({ ...credForm, password: e.target.value })}
          />
          <p className="text-xs text-gray-500 bg-gray-50 border rounded-lg p-3">
            Communiquez ce mot de passe temporaire à la personne, puis invitez-la à le
            remplacer depuis <strong>Mon espace client → Mon compte</strong>.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => setCredTarget(null)}>Annuler</Button>
            <Button className="flex-1 justify-center" onClick={submitCred} disabled={credMutation.isPending}>Enregistrer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
