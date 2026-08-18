import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { fetchDeletionRequests, approveDeletionRequest } from '../../api/clients'
import useAuthStore from '../../store/authStore'
import { formatDate } from '../../utils/formatters'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

// Days left before the 14-day deadline (negative means late)
const daysRemaining = (requestedAt) => {
  const requested = new Date(requestedAt)
  const elapsed = Math.floor((Date.now() - requested.getTime()) / 86400000)
  return 14 - elapsed
}

export default function DeletionRequests() {
  const user = useAuthStore((s) => s.user)
  const qc = useQueryClient()
  const [approveTarget, setApproveTarget] = useState(null)

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['deletion-requests'],
    queryFn: fetchDeletionRequests,
  })

  const approveMutation = useMutation({
    mutationFn: (userId) => approveDeletionRequest(userId),
    onSuccess: () => {
      toast.success('Utilisateur anonymisé')
      setApproveTarget(null)
      qc.invalidateQueries({ queryKey: ['deletion-requests'] })
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Erreur lors de l\'anonymisation'),
  })

  // Admin only
  if (user?.role !== 'admin') return <Navigate to="/" replace />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold">Demandes de suppression RGPD</h2>
        <p className="text-sm text-gray-500 mt-1">
          Ces demandes doivent être traitées sous 14 jours conformément à notre engagement RGPD.
        </p>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Demandée le</th>
              <th className="px-4 py-3">Délai restant</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Chargement...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Aucune demande en attente.</td></tr>
            ) : requests.map((u) => {
              const remaining = daysRemaining(u.deletion_requested_at)
              const urgent = remaining <= 3
              return (
                <tr key={u.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">#{u.id}</td>
                  <td className="px-4 py-3">{u.last_name} {u.first_name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(u.deletion_requested_at)}</td>
                  <td className={`px-4 py-3 font-medium ${urgent ? 'text-red-600' : 'text-gray-700'}`}>
                    {remaining} jour{Math.abs(remaining) > 1 ? 's' : ''}
                  </td>
                  <td className="px-4 py-3">
                    <Button variant="danger" onClick={() => setApproveTarget(u)}>
                      Valider et anonymiser
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>

      <Modal
        isOpen={!!approveTarget}
        onClose={() => setApproveTarget(null)}
        title="Confirmer l'anonymisation"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Vous êtes sur le point d'anonymiser définitivement les données de{' '}
            <strong>{approveTarget?.last_name} {approveTarget?.first_name}</strong>.
            Cette action est irréversible. Confirmer ?
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1" onClick={() => setApproveTarget(null)}>
              Annuler
            </Button>
            <Button variant="danger" className="flex-1"
              onClick={() => approveMutation.mutate(approveTarget.id)}
              disabled={approveMutation.isPending}>
              {approveMutation.isPending ? 'Anonymisation…' : 'Confirmer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
