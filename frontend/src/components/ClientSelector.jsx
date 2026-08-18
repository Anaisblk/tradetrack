import { useState, useEffect, useRef } from 'react'
import { fetchClients, createClient } from '../api/clients'
import Modal from './ui/Modal'
import Input from './ui/Input'
import Button from './ui/Button'
import { IconPlus } from './ui/Icon'

const EMPTY_FORM = { first_name: '', last_name: '', phone: '', email: '', address: '' }

export default function ClientSelector({ value, onChange }) {
  const [mode, setMode] = useState('idle') // 'idle' | 'selected'
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState(null)
  const timer = useRef(null)

  useEffect(() => {
    if (mode !== 'idle' || !search.trim()) { setResults([]); setShowDropdown(false); return }
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      try {
        const data = await fetchClients({ search: search.trim(), limit: 10 })
        setResults(data)
        setShowDropdown(true)
      } catch {}
    }, 300)
    return () => clearTimeout(timer.current)
  }, [search, mode])

  const selectClient = (client) => {
    onChange(client)
    setMode('selected')
    setSearch('')
    setResults([])
    setShowDropdown(false)
  }

  const reset = () => {
    onChange(null)
    setMode('idle')
    setSearch('')
    setResults([])
    setShowDropdown(false)
  }

  const openModal = () => {
    setShowDropdown(false)
    setCreateError(null)
    setForm(EMPTY_FORM)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setForm(EMPTY_FORM)
    setCreateError(null)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreateError(null)
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setCreateError('Le prénom et le nom sont obligatoires')
      return
    }
    setCreating(true)
    try {
      const client = await createClient({
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
      })
      closeModal()
      selectClient(client)
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'Erreur lors de la création du client')
    } finally {
      setCreating(false)
    }
  }

  const setField = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // --- Client sélectionné ---
  if (mode === 'selected' && value) {
    return (
      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Client</label>
        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2.5">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {value.first_name} {value.last_name}
            </p>
            {value.phone && (
              <p className="text-xs text-gray-500 mt-0.5">{value.phone}</p>
            )}
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4"
            title="Changer de client"
          >
            ×
          </button>
        </div>
      </div>
    )
  }

  // --- Mode recherche (idle) ---
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 block mb-1">Client</label>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Rechercher un client existant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => results.length > 0 && setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          />
          {showDropdown && (
            <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
              {results.length > 0
                ? results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                      onMouseDown={() => selectClient(c)}
                    >
                      {c.first_name} {c.last_name}
                      {c.phone ? <span className="text-gray-400"> · {c.phone}</span> : null}
                    </button>
                  ))
                : (
                    <p className="px-4 py-2 text-sm text-gray-400">Aucun résultat pour "{search}"</p>
                  )}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={openModal}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 whitespace-nowrap"
        >
          <IconPlus size={16} />
          Nouveau client
        </button>
      </div>

      <Modal isOpen={showModal} onClose={closeModal} title="Nouveau client" size="sm">
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Prénom *"
              value={form.first_name}
              onChange={setField('first_name')}
              autoFocus
            />
            <Input
              label="Nom *"
              value={form.last_name}
              onChange={setField('last_name')}
            />
          </div>
          <Input
            label="Téléphone"
            type="tel"
            value={form.phone}
            onChange={setField('phone')}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={setField('email')}
          />
          <Input
            label="Adresse"
            value={form.address}
            onChange={setField('address')}
          />

          {createError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {createError}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>
              Annuler
            </Button>
            <Button type="submit" className="flex-1" disabled={creating}>
              {creating ? 'Création…' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
