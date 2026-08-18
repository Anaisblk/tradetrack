import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { changeMyPassword } from '../../api/clients'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const EMPTY = { current_password: '', new_password: '', confirm: '' }

export default function MyAccount() {
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState(null)

  const mutation = useMutation({
    mutationFn: changeMyPassword,
    onSuccess: () => {
      setForm(EMPTY)
      setError(null)
      toast.success('Mot de passe modifié')
    },
    onError: (e) => setError(e.response?.data?.detail || 'Impossible de modifier le mot de passe'),
  })

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    setError(null)
    if (form.new_password.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères')
      return
    }
    if (form.new_password !== form.confirm) {
      setError('Les deux mots de passe ne correspondent pas')
      return
    }
    mutation.mutate({ current_password: form.current_password, new_password: form.new_password })
  }

  return (
    <div className="bg-white rounded-xl border p-4 sm:p-6 max-w-md">
      <h2 className="font-semibold">Changer mon mot de passe</h2>
      <p className="text-sm text-gray-500 mt-1">
        Si la boutique vous a communiqué un mot de passe temporaire, remplacez-le ici.
      </p>

      <form onSubmit={handleSubmit} className="space-y-3 mt-4">
        <Input
          label="Mot de passe actuel *"
          type="password"
          value={form.current_password}
          onChange={set('current_password')}
          required
          autoComplete="current-password"
        />
        <Input
          label="Nouveau mot de passe *"
          type="password"
          value={form.new_password}
          onChange={set('new_password')}
          required
          autoComplete="new-password"
        />
        <Input
          label="Confirmer le nouveau mot de passe *"
          type="password"
          value={form.confirm}
          onChange={set('confirm')}
          required
          autoComplete="new-password"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button className="w-full justify-center" disabled={mutation.isPending}>
          {mutation.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </form>
    </div>
  )
}
