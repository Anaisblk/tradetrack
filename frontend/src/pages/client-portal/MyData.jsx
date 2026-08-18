import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { fetchMe, fetchMyDataSummary, exportMyData, requestMyDeletion } from '../../api/clients'
import { formatDate } from '../../utils/formatters'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

export default function MyData() {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const qc = useQueryClient()

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: fetchMe })
  const deletionRequestedAt = me?.deletion_requested_at

  // Le volume réellement détenu conditionne l'export : le backend refuse de produire un
  // PDF vide, l'interface ne doit donc pas le proposer. Même source de vérité des deux côtés.
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['me', 'data-summary'],
    queryFn: fetchMyDataSummary,
  })
  const hasData = summary?.has_data === true

  // « 2 réparations, 1 devis » — seules les sections non vides sont citées.
  const summaryLabel = [
    [summary?.repairs, 'réparation'],
    [summary?.quotes, 'devis'],
    [summary?.appointments, 'rendez-vous'],
  ]
    .filter(([n]) => n > 0)
    .map(([n, mot]) => `${n} ${mot}${n > 1 && !mot.endsWith('s') ? 's' : ''}`)
    .join(', ')

  const exportMutation = useMutation({
    mutationFn: exportMyData,
    onSuccess: (blob) => {
      // Téléchargement local du PDF
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mes-donnees-tradetrack-${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Vos données ont été téléchargées')
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Erreur lors de l\'export'),
  })

  const requestMutation = useMutation({
    mutationFn: requestMyDeletion,
    onSuccess: () => {
      toast.success('Demande enregistrée. Elle sera traitée sous 14 jours.')
      setShowDeleteModal(false)
      setConfirmText('')
      qc.invalidateQueries({ queryKey: ['me'] })
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Erreur lors de la demande'),
  })

  const canDelete = confirmText === 'SUPPRIMER'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Mes données personnelles</h2>
        <p className="text-sm text-gray-500 mt-1">
          Conformément au RGPD, vous pouvez à tout moment consulter, exporter ou supprimer vos données.
        </p>
      </div>

      {/* Export — masqué tant qu'il n'y a rien à exporter */}
      {summaryLoading ? (
        // Pendant le chargement, on n'affiche aucun bouton : mieux vaut ne rien montrer
        // qu'une action qui disparaîtrait juste après.
        <div className="bg-white rounded-xl border p-6">
          <p className="text-sm text-gray-400">Chargement de vos données…</p>
        </div>
      ) : hasData ? (
        <div className="bg-white rounded-xl border p-6 space-y-3">
          <h3 className="font-semibold">Exporter mes données</h3>
          <p className="text-sm text-gray-600">
            Téléchargez un PDF contenant toutes les données que nous détenons sur vous : profil,
            historique de vos réparations, devis, rendez-vous. Ce document est établi conformément
            à l'article 20 du RGPD (droit à la portabilité).
          </p>
          <p className="text-sm text-gray-500">
            Nous détenons actuellement {summaryLabel}.
          </p>
          <Button onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
            {exportMutation.isPending ? 'Préparation…' : 'Télécharger mes données (PDF)'}
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border p-6 space-y-2">
          <h3 className="font-semibold">Aucune donnée enregistrée</h3>
          <p className="text-sm text-gray-600">
            Vous n'avez encore aucune donnée à afficher : ni réparation, ni devis, ni rendez-vous.
          </p>
          <p className="text-sm text-gray-500">
            Dès votre première visite à l'atelier, votre historique apparaîtra ici et vous pourrez
            le télécharger au format PDF.
          </p>
        </div>
      )}

      {/* Suppression */}
      <div className="bg-white rounded-xl border border-red-200 p-6 space-y-3">
        <h3 className="font-semibold text-red-700">Supprimer mes données</h3>

        {deletionRequestedAt ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800 space-y-1">
            <p className="font-semibold">Demande de suppression en cours</p>
            <p>Soumise le {formatDate(deletionRequestedAt)}</p>
            <p>Elle sera traitée par un administrateur sous 14 jours à compter de cette date.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              En cliquant sur ce bouton, vous soumettez une demande de suppression de vos données.
              Elle sera traitée par un administrateur sous un délai maximum de 14 jours.
            </p>
            <p className="text-sm text-gray-600">
              <strong>À noter :</strong> votre historique d'achats et de réparations sera conservé sous forme
              anonymisée pendant 10 ans, comme l'exige la loi française en matière de comptabilité. Plus aucun
              lien avec votre identité ne subsistera.
            </p>
            <Button variant="secondary" className="border-red-300 text-red-600 hover:bg-red-50"
              onClick={() => setShowDeleteModal(true)}>
              Demander la suppression de mes données
            </Button>
          </>
        )}
      </div>

      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setConfirmText('') }}
        title="Confirmer la demande de suppression"
        size="sm"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Vous êtes sur le point de soumettre une demande de suppression de vos données personnelles.
            Elle sera traitée par un administrateur sous 14 jours.
          </p>
          <p className="text-sm text-gray-700">
            Pour confirmer, tapez <strong>SUPPRIMER</strong> ci-dessous :
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="SUPPRIMER"
          />
          <div className="flex gap-2 pt-2">
            <Button variant="secondary" className="flex-1"
              onClick={() => { setShowDeleteModal(false); setConfirmText('') }}>
              Annuler
            </Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={() => requestMutation.mutate()}
              disabled={!canDelete || requestMutation.isPending}>
              {requestMutation.isPending ? 'Envoi…' : 'Confirmer'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
