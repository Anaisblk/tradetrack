import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createQuote } from '../../api/quotes'
import { QUERY_KEYS } from '../../api/queryKeys'
import ClientSelector from '../../components/ClientSelector'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { computeItemAmounts, computeTotals } from '../../utils/tva'
import { formatCurrency } from '../../utils/formatters'
import { serializeQuoteNotes } from '../../utils/quoteNotes'
import { DEVICE_TYPES, getBrands, getModels } from '../../utils/deviceCatalog'
import { IconPlus } from '../../components/ui/Icon'

const OTHER = '__other__'

const buildOptions = (values) => [
  { value: '', label: 'Sélectionner...' },
  ...values.map((v) => ({ value: v, label: v })),
  { value: OTHER, label: '— Autre / non listé —' },
]

// Champ appareil : soit un <select> rigide, soit un <Input> libre quand "Autre" est choisi.
function DeviceField({ label, disabled, options, selectValue, isCustom, customValue, placeholder, onSelectChange, onCustomChange, onBackToList }) {
  if (isCustom) {
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-gray-700">{label}</label>
          <button type="button" onClick={onBackToList} className="text-xs text-indigo-600 hover:underline">
            ↩ liste
          </button>
        </div>
        <Input value={customValue} onChange={onCustomChange} placeholder={placeholder} />
      </div>
    )
  }
  return (
    <Select label={label} options={options} value={selectValue} onChange={onSelectChange} disabled={disabled} />
  )
}

const defaultValidUntil = () => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

export default function NewQuote() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [client, setClient] = useState(null)

  // Appareil concerné
  const [deviceType, setDeviceType] = useState('')
  const [isCustomType, setIsCustomType] = useState(false)
  const [customType, setCustomType] = useState('')
  const [deviceBrand, setDeviceBrand] = useState('')
  const [isCustomBrand, setIsCustomBrand] = useState(false)
  const [customBrand, setCustomBrand] = useState('')
  const [deviceModel, setDeviceModel] = useState('')
  const [isCustomModel, setIsCustomModel] = useState(false)
  const [customModel, setCustomModel] = useState('')
  const [problem, setProblem] = useState('')

  // Lignes du devis
  const [items, setItems] = useState([])

  // Validité et notes
  const [validUntil, setValidUntil] = useState(defaultValidUntil())
  const [freeNotes, setFreeNotes] = useState('')

  const effectiveType = isCustomType ? customType.trim() : deviceType
  const effectiveBrand = isCustomBrand ? customBrand.trim() : deviceBrand
  const effectiveModel = isCustomModel ? customModel.trim() : deviceModel

  const typeOptions = buildOptions(DEVICE_TYPES.filter((t) => t !== 'Autre'))
  const brandOptions = buildOptions(getBrands(effectiveType))
  const modelOptions = buildOptions(getModels(effectiveBrand, effectiveType))

  const resetBrand = () => { setDeviceBrand(''); setIsCustomBrand(false); setCustomBrand('') }
  const resetModel = () => { setDeviceModel(''); setIsCustomModel(false); setCustomModel('') }

  const onTypeChange = (e) => {
    const v = e.target.value
    resetBrand(); resetModel()
    if (v === OTHER) { setIsCustomType(true); setDeviceType('') }
    else { setIsCustomType(false); setDeviceType(v) }
  }
  const onBrandChange = (e) => {
    const v = e.target.value
    resetModel()
    if (v === OTHER) { setIsCustomBrand(true); setDeviceBrand('') }
    else { setIsCustomBrand(false); setDeviceBrand(v) }
  }
  const onModelChange = (e) => {
    const v = e.target.value
    if (v === OTHER) { setIsCustomModel(true); setDeviceModel('') }
    else { setIsCustomModel(false); setDeviceModel(v) }
  }

  const backToType = () => { setIsCustomType(false); setCustomType(''); setDeviceType(''); resetBrand(); resetModel() }
  const backToBrand = () => { setIsCustomBrand(false); setCustomBrand(''); setDeviceBrand(''); resetModel() }
  const backToModel = () => { setIsCustomModel(false); setCustomModel(''); setDeviceModel('') }

  const addFreeItem = () => setItems([...items, { product_id: null, description: '', condition: 'neuf', purchase_price: 0, quantity: 1, unit_price_ht: '', tva_rate: 20 }])

  const updateItem = (idx, field, value) => {
    // Stockage en string brute pour permettre l'édition libre. Conversion au submit.
    setItems(items.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const totals = computeTotals(items)

  const mutation = useMutation({
    mutationFn: createQuote,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.quotes })
      toast.success('Devis créé')
      navigate('/quotes')
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Erreur lors de la création'),
  })

  const handleSubmit = () => {
    if (!client) { toast.error('Le client est obligatoire'); return }
    if (!effectiveType) { toast.error("Le type d'appareil est obligatoire"); return }

    const notes = serializeQuoteNotes({
      deviceType: effectiveType,
      deviceBrand: effectiveBrand,
      deviceModel: effectiveModel,
      problem,
      freeNotes,
    })

    mutation.mutate({
      client_id: client.id,
      notes: notes || null,
      valid_until: validUntil || null,
      items: items.map((i) => ({
        ...i,
        product_id: i.product_id || null,
        quantity: Number(i.quantity) || 1,
        unit_price_ht: Number(i.unit_price_ht) || 0,
        tva_rate: Number(i.tva_rate) || 20,
      })),
    })
  }

  return (
    <div className="max-w-4xl space-y-6">
      <h2 className="text-2xl font-bold">Nouveau devis</h2>

      {/* Section 1 : Client */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold">Client</h3>
        <ClientSelector value={client} onChange={setClient} />
      </div>

      {/* Section 2 : Appareil concerné */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold">Appareil concerné</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <DeviceField
            label="Type d'appareil *"
            options={typeOptions}
            selectValue={deviceType}
            isCustom={isCustomType}
            customValue={customType}
            placeholder="Ex : Vidéoprojecteur"
            onSelectChange={onTypeChange}
            onCustomChange={(e) => setCustomType(e.target.value)}
            onBackToList={backToType}
          />
          <DeviceField
            label="Marque"
            disabled={!effectiveType}
            options={brandOptions}
            selectValue={deviceBrand}
            isCustom={isCustomBrand}
            customValue={customBrand}
            placeholder="Ex : Marque"
            onSelectChange={onBrandChange}
            onCustomChange={(e) => setCustomBrand(e.target.value)}
            onBackToList={backToBrand}
          />
          <DeviceField
            label="Modèle"
            disabled={!effectiveBrand}
            options={modelOptions}
            selectValue={deviceModel}
            isCustom={isCustomModel}
            customValue={customModel}
            placeholder="Ex : Modèle"
            onSelectChange={onModelChange}
            onCustomChange={(e) => setCustomModel(e.target.value)}
            onBackToList={backToModel}
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Description du problème / prestation demandée</label>
          <textarea
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
            value={problem}
            onChange={(e) => setProblem(e.target.value)}
          />
        </div>
      </div>

      {/* Section 3 : Lignes du devis */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Lignes du devis (prix TTC)</h3>
          <Button variant="secondary" onClick={addFreeItem} className="inline-flex items-center gap-1.5">
            <IconPlus size={16} />
            Ligne
          </Button>
        </div>

        {items.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-gray-500 border-b">
              <tr className="text-left">
                <th className="pb-2">Description</th>
                <th className="pb-2 w-20">Qté</th>
                <th className="pb-2 w-28">Prix unitaire TTC</th>
                <th className="pb-2 w-20">Régime</th>
                <th className="pb-2 w-28">TTC</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const { subtotalTTC } = computeItemAmounts(item)
                const isOccasion = item.condition === 'occasion'
                return (
                  <tr key={idx} className="border-b">
                    <td className="py-2">
                      <input className="w-full px-2 py-1 border rounded text-sm" value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Description..." />
                    </td>
                    <td className="py-2"><input type="number" min="1" className="w-16 px-2 py-1 border rounded text-sm" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} /></td>
                    <td className="py-2">
                      <input type="number" step="0.01" className="w-24 px-2 py-1 border rounded text-sm" value={item.unit_price_ht} onChange={(e) => updateItem(idx, 'unit_price_ht', e.target.value)} />
                    </td>
                    <td className="py-2 text-gray-500">{isOccasion ? 'TVM' : 'TVA'}</td>
                    <td className="py-2 font-medium">{formatCurrency(subtotalTTC)}</td>
                    <td><button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-red-400">×</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {/* Section 4 : Totaux */}
        <div className="flex justify-end">
          <div className="bg-gray-50 rounded-lg p-4 min-w-48 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">HT</span><span>{formatCurrency(totals.total_ht)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">TVA</span><span>{formatCurrency(totals.tva_amount)}</span></div>
            <div className="flex justify-between font-bold border-t pt-1"><span>TTC</span><span>{formatCurrency(totals.total_ttc)}</span></div>
          </div>
        </div>
      </div>

      {/* Section 5 : Validité et notes */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold">Validité et notes</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Valide jusqu'au" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Notes</label>
          <textarea
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={2}
            placeholder="Optionnel"
            value={freeNotes}
            onChange={(e) => setFreeNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Boutons */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => navigate('/quotes')}>Annuler</Button>
        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Création…' : 'Créer le devis'}
        </Button>
      </div>
    </div>
  )
}
