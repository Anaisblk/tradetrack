import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { fetchAppointments, createAppointment, deleteAppointment } from '../../api/appointments'
import { QUERY_KEYS } from '../../api/queryKeys'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import ClientSelector from '../../components/ClientSelector'
import { IconPlus } from '../../components/ui/Icon'
import { formatDateTime, APPOINTMENT_STATUS_LABELS, getStatusColor } from '../../utils/formatters'

const EMPTY_FORM = { title: '', description: '', date: '', start_time: '', end_time: '' }
const OPEN_TIME = '09:00'
const CLOSE_TIME = '19:30'
const SLOT_MINUTES = 15

function buildSlots(start, end, step) {
  const toMin = (s) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5))
  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  const slots = []
  for (let m = toMin(start); m <= toMin(end); m += step) slots.push(fmt(m))
  return slots.map((v) => ({ value: v, label: v }))
}

const TIME_SLOTS = buildSlots(OPEN_TIME, CLOSE_TIME, SLOT_MINUTES)
const START_OPTIONS = [{ value: '', label: '—' }, ...TIME_SLOTS.slice(0, -1)] // exclut 19:30 (sinon pas de fin possible)
const END_OPTIONS = [{ value: '', label: '—' }, ...TIME_SLOTS.slice(1)]       // commence à 09:15

export default function PlanningPage() {
  const [showModal, setShowModal] = useState(false)
  const [client, setClient] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState(null)
  const qc = useQueryClient()

  const { data: appointments = [] } = useQuery({ queryKey: QUERY_KEYS.appointments, queryFn: fetchAppointments })

  const createMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEYS.appointments })
      closeModal()
      toast.success('RDV créé')
    },
    onError: (e) => setFormError(e.response?.data?.detail || 'Erreur lors de la création'),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAppointment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEYS.appointments }); toast.success('RDV supprimé') },
  })

  const closeModal = () => {
    setShowModal(false)
    setClient(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setFormError(null)
    if (!form.title.trim()) { setFormError('Le titre est obligatoire'); return }
    if (!form.date || !form.start_time || !form.end_time) { setFormError('Date, heure de début et heure de fin sont obligatoires'); return }
    if (form.end_time <= form.start_time) { setFormError("L'heure de fin doit être après l'heure de début"); return }

    createMutation.mutate({
      title: form.title.trim(),
      description: form.description.trim() || null,
      start_datetime: `${form.date}T${form.start_time}`,
      end_datetime: `${form.date}T${form.end_time}`,
      client_id: client?.id || null,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">Planning</h2>
        <Button onClick={() => setShowModal(true)} className="inline-flex items-center gap-1.5">
          <IconPlus size={16} />
          Nouveau
        </Button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3">Titre</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Début</th>
              <th className="px-4 py-3">Fin</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{a.title}</td>
                <td className="px-4 py-3">{a.client ? `${a.client.first_name} ${a.client.last_name}` : '—'}</td>
                <td className="px-4 py-3">{formatDateTime(a.start_datetime)}</td>
                <td className="px-4 py-3">{formatDateTime(a.end_datetime)}</td>
                <td className="px-4 py-3">
                  <Badge label={APPOINTMENT_STATUS_LABELS[a.status]} color={getStatusColor(a.status)} />
                </td>
                <td className="px-4 py-3">
                  <button className="text-red-500 hover:underline text-xs" onClick={() => deleteMutation.mutate(a.id)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={closeModal} title="Nouveau rendez-vous">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input label="Titre *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />

          <ClientSelector value={client} onChange={setClient} />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input label="Date *" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            <Select label="Heure début *" options={START_OPTIONS} value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            <Select label="Heure fin *" options={END_OPTIONS} value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={closeModal}>Annuler</Button>
            <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Création…' : 'Créer'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
