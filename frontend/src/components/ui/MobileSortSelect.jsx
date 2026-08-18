import { IconArrowUp, IconArrowDown } from './Icon'

/**
 * Contrôle de tri pour l'affichage en cartes (mobile).
 *
 * Sous `md`, les tableaux laissent place à des cartes : les en-têtes cliquables de
 * SortableHeader disparaissent donc avec eux. Ce composant rend le tri à nouveau
 * accessible, en s'appuyant sur exactement le même état que le tableau.
 *
 * Props (identiques à SortableHeader, pour rester interchangeable) :
 *  - fields : [{ label, field }] — les mêmes colonnes triables que le tableau
 *  - sort   : { field, direction }
 *  - onSort : (field) => void — bascule le sens si le champ est déjà actif
 */
export default function MobileSortSelect({ fields = [], sort, onSort, className = '' }) {
  if (fields.length === 0) return null

  const active = fields.find((f) => f.field === sort?.field)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label className="text-sm text-slate-500 whitespace-nowrap" htmlFor="mobile-sort">
        Trier :
      </label>
      <select
        id="mobile-sort"
        value={sort?.field ?? ''}
        onChange={(e) => onSort(e.target.value)}
        className="flex-1 min-w-0 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">Par défaut</option>
        {fields.map(({ label, field }) => (
          <option key={field} value={field}>{label}</option>
        ))}
      </select>
      {active && (
        <button
          type="button"
          onClick={() => onSort(active.field)}
          aria-label={sort.direction === 'asc' ? 'Trier par ordre décroissant' : 'Trier par ordre croissant'}
          className="p-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          {sort.direction === 'asc' ? <IconArrowUp size={16} /> : <IconArrowDown size={16} />}
        </button>
      )}
    </div>
  )
}
