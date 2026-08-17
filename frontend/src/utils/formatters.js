import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export const formatCurrency = (amount) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount ?? 0)

export const formatDate = (date) =>
  date ? format(new Date(date), 'dd/MM/yyyy', { locale: fr }) : '—'

export const formatDateTime = (date) =>
  date ? format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: fr }) : '—'

export const REPAIR_STATUS_LABELS = {
  recu: 'Reçu',
  en_cours: 'En cours',
  repare: 'Réparé',
  annulee: 'Annulée',
}

export const QUOTE_STATUS_LABELS = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  expire: 'Expiré',
}

export const APPOINTMENT_STATUS_LABELS = {
  planifie: 'Planifié',
  confirme: 'Confirmé',
  annule: 'Annulé',
  termine: 'Terminé',
}

export const getStatusColor = (status) => {
  const map = {
    finalisee: 'green', accepte: 'green', confirme: 'green', repare: 'green',
    en_cours: 'blue', planifie: 'blue',
    annulee: 'red', refuse: 'red', annule: 'red',
    expire: 'yellow', brouillon: 'yellow',
    recu: 'gray', envoye: 'gray', termine: 'gray',
  }
  return map[status] || 'gray'
}
