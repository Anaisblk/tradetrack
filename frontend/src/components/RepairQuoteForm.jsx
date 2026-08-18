import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createQuote, updateQuote } from '../api/quotes'
import { updateRepair } from '../api/repairs'
import { QUERY_KEYS } from '../api/queryKeys'
import Button from './ui/Button'
import { IconPlus } from './ui/Icon'
import { computeTotals } from '../utils/tva'
import { formatCurrency } from '../utils/formatters'

const newLine = () => ({ description: '', quantity: 1, unit_price_ht: '', tva_rate: 20 })

export default function RepairQuoteForm({ repair, onCancel, onSuccess, cancelLabel = 'Annuler' }) {
  const [items, setItems] = useState([newLine()])
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState('brouillon')
  const [error, setError] = useState(null)

  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async ({ data, status, repairCostHt }) => {
      const created = await createQuote(data)
      if (status && status !== 'brouillon') {
        await updateQuote(created.id, { status })
      }
      // Met à jour le coût de la réparation à partir du total HT du devis.
      // Le backend recalcule automatiquement tva_amount et repair_cost_ttc.
      if (repairCostHt > 0) {
        await updateRepair(repair.id, { repair_cost_ht: repairCostHt })
      }
      return created
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.quotes })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.repairs })
      qc.invalidateQueries({ queryKey: QUERY_KEYS.repair(repair.id) })
      onSuccess?.()
    },
    onError: (e) => setError(e.response?.data?.detail || 'Erreur lors de la création du devis'),
  })

  const setLine = (idx, field, value) => {
    // Stockage en string brute pour permettre l'édition libre.
    // La conversion en nombre se fait au submit.
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  const addLine = () => setItems((prev) => [...prev, newLine()])
  const removeLine = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx))

  const totals = computeTotals(items)

  const handleSubmit = () => {
    setError(null)
    const filled = items.filter((l) => l.description.trim() && Number(l.quantity) > 0 && Number(l.unit_price_ht) > 0)
    if (filled.length === 0) {
      setError('Ajoutez au moins une ligne avec description, quantité et prix.')
      return
    }
    const deviceInfo = [repair.device_brand, repair.device_model].filter(Boolean).join(' ').trim()
    const repairTag = `Devis pour réparation #${repair.id} — ${repair.device_type}${deviceInfo ? ' ' + deviceInfo : ''}`
    mutation.mutate({
      data: {
        client_id: repair.client_id || null,
        notes: notes.trim() ? `${repairTag}\n\n${notes.trim()}` : repairTag,
        items: filled.map((l) => ({
          product_id: null,
          description: l.description.trim(),
          quantity: parseInt(l.quantity) || 1,
          unit_price_ht: Number(l.unit_price_ht) || 0,
          tva_rate: 20,
        })),
      },
      status,
      repairCostHt: totals.total_ht,
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4 text-sm">
        <div className="font-semibold text-indigo-900 mb-1">
          Devis pour la réparation #{repair.id}
        </div>
        <div className="text-indigo-800 space-y-0.5">
          {repair.client && (
            <div><span className="text-indigo-600">Client :</span>{' '}
              {repair.client.first_name} {repair.client.last_name}</div>
          )}
          <div><span className="text-indigo-600">Appareil :</span>{' '}
            {repair.device_type}
            {repair.device_brand && ` ${repair.device_brand}`}
            {repair.device_model && ` ${repair.device_model}`}
          </div>
          {(repair.diagnosis || repair.problem_description) && (
            <div><span className="text-indigo-600">
              {repair.diagnosis ? 'Diagnostic' : 'Problème signalé'} :</span>{' '}
              {repair.diagnosis || repair.problem_description.split('\n')[0]}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Lignes du devis (prix TTC)</label>
          <button
            type="button"
            onClick={addLine}
            className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
          >
            <IconPlus size={14} />
            Ligne
          </button>
        </div>

        <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="text-gray-500 border-b">
            <tr className="text-left">
              <th className="pb-2">Description</th>
              <th className="pb-2 w-20">Qté</th>
              <th className="pb-2 w-32 whitespace-nowrap">Prix unitaire TTC</th>
              <th className="pb-2 w-8"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((line, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="py-2">
                  <input
                    className="w-full px-2 py-1 border rounded text-sm"
                    placeholder="Ex : Main d'œuvre, écran, batterie…"
                    value={line.description}
                    onChange={(e) => setLine(idx, 'description', e.target.value)}
                  />
                </td>
                <td className="py-2">
                  <input type="number" min="1" className="w-16 px-2 py-1 border rounded text-sm"
                    value={line.quantity} onChange={(e) => setLine(idx, 'quantity', e.target.value)} />
                </td>
                <td className="py-2">
                  <input type="number" step="0.01" min="0" className="w-28 px-2 py-1 border rounded text-sm"
                    value={line.unit_price_ht} onChange={(e) => setLine(idx, 'unit_price_ht', e.target.value)} />
                </td>
                <td className="py-2">
                  {items.length > 1 && (
                    <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600">×</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <div className="flex justify-end">
        <div className="bg-gray-50 rounded-lg p-4 w-full sm:w-auto sm:min-w-56 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-gray-500">Total HT</span><span>{formatCurrency(totals.total_ht)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">TVA</span><span>{formatCurrency(totals.tva_amount)}</span></div>
          <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total TTC</span><span>{formatCurrency(totals.total_ttc)}</span></div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700">Notes</label>
        <textarea
          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-2">Statut du devis</label>
        <div className="flex flex-wrap gap-4 text-sm">
          {[
            { value: 'brouillon', label: 'En attente' },
            { value: 'accepte', label: 'Approuvé par le client' },
            { value: 'refuse', label: 'Refusé par le client' },
          ].map(({ value, label }) => (
            <label key={value} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="quote_status"
                value={value}
                checked={status === value}
                onChange={(e) => setStatus(e.target.value)}
                className="accent-indigo-600"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Création…' : 'Créer'}
        </Button>
      </div>
    </div>
  )
}
