import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { createRepair } from '../../api/repairs'
import { fetchQuote, updateQuote } from '../../api/quotes'
import { fetchClient } from '../../api/clients'
import { QUERY_KEYS } from '../../api/queryKeys'
import ClientSelector from '../../components/ClientSelector'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import { DEVICE_TYPES, getBrands, getModels } from '../../utils/deviceCatalog'

// Valeur sentinelle pour l'option "Autre" qui bascule le select en saisie libre.
const OTHER = '__other__'

// 14 défauts signalés, dans l'ordre exact du cahier des charges.
const DEFECTS = [
  'Écran cassé/défectueux',
  'Batterie',
  'Vitre arrière',
  'Connecteur de charge',
  'Haut-parleur',
  'Micro',
  "Bouton d'alimentation",
  'Boutons de volume',
  'Caméra',
  'Face ID / capteur biométrique',
  'Surchauffe',
  "Ne s'allume plus",
  'Problème logiciel',
  'Autre',
]

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

export default function NewRepair() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const fromQuote = searchParams.get('fromQuote')

  // --- Section 1 : client ---
  const [client, setClient] = useState(null)

  // --- Section 2 : appareil ---
  const [deviceType, setDeviceType] = useState('')
  const [isCustomType, setIsCustomType] = useState(false)
  const [customType, setCustomType] = useState('')

  const [deviceBrand, setDeviceBrand] = useState('')
  const [isCustomBrand, setIsCustomBrand] = useState(false)
  const [customBrand, setCustomBrand] = useState('')

  const [deviceModel, setDeviceModel] = useState('')
  const [isCustomModel, setIsCustomModel] = useState(false)
  const [customModel, setCustomModel] = useState('')

  const [serialNumber, setSerialNumber] = useState('')

  // --- Section 3 : défauts ---
  const [defects, setDefects] = useState([])
  const [observations, setObservations] = useState('')

  // --- Section 4 : notes de dépôt ---
  const [depositNotes, setDepositNotes] = useState('')

  // --- Section 5 : estimation ---
  const [estimatedCost, setEstimatedCost] = useState('')
  const [depositAmount, setDepositAmount] = useState('')

  // Préremplissage depuis un devis (passerelle "→ Réparation")
  useEffect(() => {
    if (!fromQuote) return
    const type = searchParams.get('device_type') || ''
    if (type) {
      if (DEVICE_TYPES.includes(type)) setDeviceType(type)
      else { setIsCustomType(true); setCustomType(type) }
    }
    const brand = searchParams.get('device_brand') || ''
    if (brand) {
      if (getBrands(type).includes(brand)) setDeviceBrand(brand)
      else { setIsCustomBrand(true); setCustomBrand(brand) }
    }
    const model = searchParams.get('device_model') || ''
    if (model) {
      if (getModels(brand, type).includes(model)) setDeviceModel(model)
      else { setIsCustomModel(true); setCustomModel(model) }
    }
    const problem = searchParams.get('problem') || ''
    if (problem) setObservations(problem)
    const cost = searchParams.get('estimated_cost') || ''
    if (cost) setEstimatedCost(cost)
    const clientId = searchParams.get('client_id')
    if (clientId) fetchClient(clientId).then(setClient).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Valeurs effectives (select figé OU saisie libre)
  const effectiveType = isCustomType ? customType.trim() : deviceType
  const effectiveBrand = isCustomBrand ? customBrand.trim() : deviceBrand
  const effectiveModel = isCustomModel ? customModel.trim() : deviceModel

  const typeOptions = buildOptions(DEVICE_TYPES.filter((t) => t !== 'Autre'))
  const brandOptions = buildOptions(getBrands(effectiveType))
  const modelOptions = buildOptions(getModels(effectiveBrand, effectiveType))

  // --- Handlers appareil (cascade : changer un niveau réinitialise les niveaux inférieurs) ---
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

  const toggleDefect = (d) => {
    setDefects((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]))
  }

  const mutation = useMutation({
    mutationFn: createRepair,
    onSuccess: async (repair) => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.repairs })
      toast.success(`Réparation #${repair.id} enregistrée`)

      // Rattache le devis d'origine à la nouvelle réparation (passerelle "→ Réparation").
      if (fromQuote) {
        try {
          const quote = await fetchQuote(fromQuote)
          const brand = effectiveBrand ? ' ' + effectiveBrand : ''
          const model = effectiveModel ? ' ' + effectiveModel : ''
          const newNotes = `Devis pour réparation #${repair.id} — ${effectiveType}${brand}${model}\n\n${quote.notes || ''}`
          await updateQuote(fromQuote, { notes: newNotes })
          qc.invalidateQueries({ queryKey: QUERY_KEYS.quotes })
          qc.invalidateQueries({ queryKey: QUERY_KEYS.repair(repair.id) })
        } catch {
          toast.error("Réparation créée mais le devis d'origine n'a pas pu être rattaché")
        }
      }

      navigate(`/repairs/${repair.id}`)
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Erreur lors de la création'),
  })

  const handleSubmit = () => {
    if (!client) { toast.error('Le client est obligatoire'); return }
    if (!effectiveType) { toast.error("Le type d'appareil est obligatoire"); return }
    if (defects.length === 0 && !observations.trim()) {
      toast.error('Indiquez au moins un défaut ou une observation')
      return
    }

    const parts = []
    if (defects.length) parts.push(defects.join(' ; '))
    if (observations.trim()) parts.push('Observations : ' + observations.trim())
    const problemDescription = parts.join('\n\n')

    // Traçabilité : mention du devis d'origine dans les notes de dépôt.
    let notes = depositNotes.trim()
    if (fromQuote) {
      const tag = `Créé à partir du devis #${fromQuote}`
      notes = notes ? `${notes}\n\n${tag}` : tag
    }

    mutation.mutate({
      client_id: client.id,
      device_type: effectiveType,
      device_brand: effectiveBrand || null,
      device_model: effectiveModel || null,
      serial_number: serialNumber.trim() || null,
      problem_description: problemDescription,
      notes: notes || null,
      estimated_cost: estimatedCost ? Number(estimatedCost) : null,
      deposit_amount: Number(depositAmount) || 0,
    })
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-2xl font-bold">Nouvelle réparation</h2>

      {fromQuote && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800">
          Cette réparation est créée à partir du devis #{fromQuote}.
        </div>
      )}

      {/* Section 1 : Client */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold">Client</h3>
        <ClientSelector value={client} onChange={setClient} />
      </div>

      {/* Section 2 : Appareil */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold">Appareil</h3>
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
        <Input
          label="N° de série"
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          placeholder="Optionnel"
        />
      </div>

      {/* Section 3 : Défauts signalés */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold">Défauts signalés par le client</h3>
        <div className="grid grid-cols-3 gap-2">
          {DEFECTS.map((d) => (
            <label key={d} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                checked={defects.includes(d)}
                onChange={() => toggleDefect(d)}
              />
              {d}
            </label>
          ))}
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Observations complémentaires</label>
          <textarea
            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
          />
        </div>
      </div>

      {/* Section 4 : Notes de dépôt */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold">Notes de dépôt</h3>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={3}
          placeholder="Accessoires laissés, code déverrouillage, remarques..."
          value={depositNotes}
          onChange={(e) => setDepositNotes(e.target.value)}
        />
      </div>

      {/* Section 5 : Estimation (facultative) */}
      <div className="bg-white rounded-xl border p-6 space-y-4">
        <h3 className="font-semibold">Estimation (facultative)</h3>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Coût estimé (€)"
            type="number"
            step="0.01"
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
          />
          <Input
            label="Acompte versé (€)"
            type="number"
            step="0.01"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />
        </div>
      </div>

      {/* Boutons */}
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => navigate('/repairs')}>Annuler</Button>
        <Button onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Enregistrement…' : 'Enregistrer la réparation'}
        </Button>
      </div>
    </div>
  )
}
