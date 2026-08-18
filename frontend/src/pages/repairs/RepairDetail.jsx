import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { fetchRepair, updateRepair } from '../../api/repairs'
import { fetchQuotes } from '../../api/quotes'
import { QUERY_KEYS } from '../../api/queryKeys'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import RepairQuoteForm from '../../components/RepairQuoteForm'
import { IconPlus } from '../../components/ui/Icon'
import { REPAIR_STATUS_LABELS, QUOTE_STATUS_LABELS, getStatusColor, formatCurrency, formatDate } from '../../utils/formatters'

const PAYMENT_OPTIONS = [
  { value: 'cb', label: 'Carte bancaire' },
  { value: 'especes', label: 'Espèces' },
  { value: 'cheque', label: 'Chèque' },
  { value: 'virement', label: 'Virement' },
]

const PAYMENT_METHOD_LABELS = Object.fromEntries(PAYMENT_OPTIONS.map((o) => [o.value, o.label]))

export default function RepairDetail() {
  const { id } = useParams()
  const qc = useQueryClient()
  const { data: repair, isLoading } = useQuery({ queryKey: QUERY_KEYS.repair(id), queryFn: () => fetchRepair(id) })

  // Devis liés — Option B : on récupère les devis puis on filtre côté client
  // sur le tag inséré dans les notes par RepairQuoteForm.
  const { data: allQuotes = [] } = useQuery({ queryKey: QUERY_KEYS.quotes, queryFn: () => fetchQuotes() })
  const linkedQuotes = allQuotes.filter(
    (q) => q.notes && q.notes.includes(`Devis pour réparation #${id} —`)
  )

  // Détails techniques — pré-remplis depuis la réparation, resynchronisés à chaque rechargement.
  const [diagnosis, setDiagnosis] = useState('')
  const [repairCostHt, setRepairCostHt] = useState('')
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('cb')
  const [remiseNotes, setRemiseNotes] = useState('')

  useEffect(() => {
    if (!repair) return
    setDiagnosis(repair.diagnosis ?? '')
    setRepairCostHt(String(repair.repair_cost_ht))
  }, [repair])

  const mutation = useMutation({
    mutationFn: (data) => updateRepair(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.repair(id) })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.repairs })
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Erreur'),
  })

  if (isLoading) return <div className="p-8 text-gray-400">Chargement...</div>
  if (!repair) return <div className="p-8 text-gray-400">Réparation introuvable</div>

  const changeStatus = (status, successMsg) => {
    mutation.mutate({ status }, { onSuccess: () => toast.success(successMsg) })
  }

  const cancelRepair = () => {
    if (!window.confirm("Confirmer l'annulation de cette réparation ?")) return
    changeStatus('annulee', 'Réparation annulée')
  }

  const detailsUnchanged =
    diagnosis === (repair.diagnosis ?? '') && repairCostHt === String(repair.repair_cost_ht)

  const saveDetails = () => {
    const payload = {}
    if (diagnosis !== (repair.diagnosis ?? '')) payload.diagnosis = diagnosis
    if (repairCostHt !== String(repair.repair_cost_ht)) payload.repair_cost_ht = parseFloat(repairCostHt)
    mutation.mutate(payload, { onSuccess: () => toast.success('Détails mis à jour') })
  }

  const resteAPayer = Number(repair.repair_cost_ttc) - Number(repair.deposit_amount)

  const submitPayment = () => {
    const payload = {
      payment_method: paymentMethod,
      completed_date: new Date().toISOString().slice(0, 10),
    }
    const note = remiseNotes.trim()
    if (note) {
      payload.notes = repair.notes ? `${repair.notes}\n\nRemise : ${note}` : `Remise : ${note}`
    }
    mutation.mutate(payload, {
      onSuccess: () => {
        setShowPaymentModal(false)
        toast.success('Appareil remis, réparation clôturée')
      },
    })
  }

  const renderActions = () => {
    if (repair.status === 'recu') {
      return (
        <>
          <Button onClick={() => changeStatus('en_cours', 'Réparation démarrée')} disabled={mutation.isPending}>
            Démarrer la réparation
          </Button>
          <Button variant="danger" onClick={cancelRepair} disabled={mutation.isPending}>
            Annuler la réparation
          </Button>
        </>
      )
    }
    if (repair.status === 'en_cours') {
      return (
        <>
          <Button onClick={() => changeStatus('repare', 'Réparation marquée comme réparée')} disabled={mutation.isPending}>
            Marquer comme réparé
          </Button>
          <Button variant="danger" onClick={cancelRepair} disabled={mutation.isPending}>
            Annuler la réparation
          </Button>
        </>
      )
    }
    if (repair.status === 'repare' && !repair.completed_date) {
      return (
        <Button onClick={() => setShowPaymentModal(true)} disabled={mutation.isPending}>
          Encaisser et remettre au client
        </Button>
      )
    }
    if (repair.status === 'repare' && repair.completed_date) {
      return <p className="text-sm text-gray-500">Cette réparation est clôturée. Aucune action disponible.</p>
    }
    if (repair.status === 'annulee') {
      return <p className="text-sm text-gray-500">Cette réparation est annulée. Aucune action disponible.</p>
    }
    return null
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <h2 className="text-xl sm:text-2xl font-bold">Réparation #{repair.id}</h2>
          <Badge label={REPAIR_STATUS_LABELS[repair.status]} color={getStatusColor(repair.status)} />
        </div>
        <Button onClick={() => setShowQuoteModal(true)} className="inline-flex items-center gap-1.5">
          <IconPlus size={16} />
          Devis
        </Button>
      </div>

      {repair.completed_date != null && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm text-green-800">
          <span>
            <strong>Clôturée le {formatDate(repair.completed_date)}</strong>
            {repair.payment_method && ` — payée par ${PAYMENT_METHOD_LABELS[repair.payment_method]}`}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border p-6 space-y-2 text-sm">
          <h3 className="font-semibold mb-3">Appareil</h3>
          <p><span className="text-gray-500">Type :</span> {repair.device_type}</p>
          <p><span className="text-gray-500">Marque :</span> {repair.device_brand || '—'}</p>
          <p><span className="text-gray-500">Modèle :</span> {repair.device_model || '—'}</p>
          <p><span className="text-gray-500">N° série :</span> {repair.serial_number || '—'}</p>
          <p><span className="text-gray-500">Problème :</span> {repair.problem_description || '—'}</p>
        </div>

        <div className="bg-white rounded-xl border p-6 space-y-2 text-sm">
          <h3 className="font-semibold mb-3">Finances</h3>
          <p><span className="text-gray-500">Coût réparation TTC :</span> <strong>{formatCurrency(repair.repair_cost_ttc)}</strong></p>
          <p><span className="text-gray-500">Coût estimé :</span> {repair.estimated_cost != null ? formatCurrency(repair.estimated_cost) : '—'}</p>
          <p><span className="text-gray-500">Acompte :</span> {formatCurrency(repair.deposit_amount)}</p>
          <p><span className="text-gray-500">Reste à payer :</span> {formatCurrency(resteAPayer)}</p>
          <p><span className="text-gray-500">Mode de paiement :</span> {repair.payment_method ? PAYMENT_METHOD_LABELS[repair.payment_method] : '—'}</p>
          <p><span className="text-gray-500">Date estimée :</span> {formatDate(repair.estimated_date)}</p>
          <p><span className="text-gray-500">Date terminée :</span> {formatDate(repair.completed_date)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold">Actions</h3>
        <div className="flex flex-wrap gap-3">
          {renderActions()}
        </div>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold">Détails techniques</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Coût réparation HT (€)"
            type="number"
            step="0.01"
            value={repairCostHt}
            onChange={(e) => setRepairCostHt(e.target.value)}
          />
          <div>
            <label className="text-sm font-medium text-gray-700">Diagnostic</label>
            <textarea
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
            />
          </div>
        </div>
        <Button onClick={saveDetails} disabled={detailsUnchanged || mutation.isPending}>
          Enregistrer les détails techniques
        </Button>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-3">
        <h3 className="font-semibold">Devis liés à cette réparation</h3>
        {linkedQuotes.length === 0 ? (
          <p className="text-sm text-gray-500">
            Aucun devis pour cette réparation. Utilisez le bouton "+ Devis" en haut pour en créer un.
          </p>
        ) : (
          <ul className="space-y-2">
            {linkedQuotes.map((q) => (
              <li key={q.id} className="flex items-center justify-between text-sm border-b last:border-0 pb-2 last:pb-0">
                <div>
                  <span className="font-medium">Devis #{q.id}</span>
                  <span className="ml-2 text-gray-500">— créé le {formatDate(q.created_at)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge label={QUOTE_STATUS_LABELS?.[q.status] || q.status} color={getStatusColor(q.status)} />
                  <span className="font-medium">{formatCurrency(q.total_ttc)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        isOpen={showQuoteModal}
        onClose={() => setShowQuoteModal(false)}
        title={`Devis pour la réparation #${repair.id}`}
        size="lg"
      >
        <RepairQuoteForm
          repair={repair}
          onCancel={() => setShowQuoteModal(false)}
          onSuccess={() => {
            setShowQuoteModal(false)
            toast.success('Devis créé')
          }}
        />
      </Modal>

      <Modal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Encaisser et remettre l'appareil"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-500">Coût total TTC</span>
              <span>{formatCurrency(repair.repair_cost_ttc)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Acompte déjà versé</span>
              <span>{formatCurrency(repair.deposit_amount)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
              <span className="font-medium">Reste à payer</span>
              <strong>{formatCurrency(resteAPayer)}</strong>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Mode de paiement</label>
            <div className="flex flex-wrap gap-4">
              {PAYMENT_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="payment_method"
                    value={opt.value}
                    checked={paymentMethod === opt.value}
                    onChange={() => setPaymentMethod(opt.value)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Notes de remise</label>
            <textarea
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={2}
              placeholder="Ex : coque neuve fournie, appareil testé devant client..."
              value={remiseNotes}
              onChange={(e) => setRemiseNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setShowPaymentModal(false)}>
              Annuler
            </Button>
            <Button type="button" className="flex-1" onClick={submitPayment} disabled={mutation.isPending}>
              Valider et clôturer
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
