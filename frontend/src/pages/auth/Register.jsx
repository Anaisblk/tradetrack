import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { register } from '../../api/auth'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'

export default function RegisterPage() {
  const [form, setForm] = useState({ email: '', password: '', first_name: '', last_name: '', phone: '' })
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!accepted) {
      toast.error('Vous devez accepter la politique de confidentialité')
      return
    }
    setLoading(true)
    try {
      await register(form)
      toast.success('Compte créé ! Vous pouvez vous connecter.')
      navigate('/login')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Inscription échouée')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-indigo-600">TradeTrack</h1>
          <p className="text-gray-500 mt-1">Créer votre compte client</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Prénom" autoComplete="given-name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
            <Input label="Nom" autoComplete="family-name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
          </div>
          <Input label="Email" type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Téléphone" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Mot de passe" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />

          <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 accent-indigo-600"
            />
            <span>
              J'accepte la{' '}
              <button
                type="button"
                onClick={() => setShowPolicy(true)}
                className="text-indigo-600 hover:underline"
              >
                politique de confidentialité
              </button>
              {' '}et le traitement de mes données par TradeTrack.
            </span>
          </label>

          <Button className="w-full justify-center" disabled={loading || !accepted}>
            {loading ? 'Inscription…' : 'Inscription'}
          </Button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline">Se connecter</Link>
        </p>
      </div>

      <Modal isOpen={showPolicy} onClose={() => setShowPolicy(false)} title="Politique de confidentialité" size="lg">
        <div className="space-y-4 text-sm text-gray-700">
          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Quelles données sont collectées ?</h3>
            <p>
              À l'inscription, nous collectons votre nom, prénom, adresse email, mot de passe (stocké de manière chiffrée),
              et optionnellement votre téléphone. Lors de vos achats et réparations, nous enregistrons l'historique de vos
              transactions pour la facturation et le suivi.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Pourquoi ?</h3>
            <p>
              Ces données nous permettent de gérer votre compte, d'établir vos factures, de suivre vos réparations
              et de vous contacter à ce sujet. La conservation des écritures comptables est une
              obligation légale (10 ans).
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Qui y a accès ?</h3>
            <p>
              Seul le personnel de TradeTrack (administrateurs, vendeurs, techniciens) accède à vos données pour
              les besoins du service. Nous ne revendons aucune donnée à des tiers.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Vos droits</h3>
            <p>
              Conformément au RGPD, vous pouvez à tout moment, depuis votre espace client (rubrique « Mes données »)&nbsp;:
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li><strong>Exporter</strong> l'ensemble de vos données au format JSON</li>
              <li><strong>Supprimer</strong> vos informations personnelles (nom, email, téléphone, adresse)</li>
            </ul>
            <p className="mt-2">
              Vous disposez également des droits d'accès, de rectification, de limitation et d'opposition prévus
              par les articles 15 à 22 du RGPD.
            </p>
          </section>

          <section>
            <h3 className="font-semibold text-gray-900 mb-1">Durée de conservation</h3>
            <p>
              Vos données de profil sont conservées tant que votre compte est actif. Les écritures comptables
              (devis, réparations) sont conservées 10 ans conformément à la loi française, sous forme
              anonymisée si vous demandez la suppression de votre compte.
            </p>
          </section>
        </div>
      </Modal>
    </div>
  )
}
