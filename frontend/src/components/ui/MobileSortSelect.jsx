import { IconArrowUp, IconArrowDown } from './Icon'

/**
 * Sort control for the card view on mobile, where table headers are hidden.
 * Uses the same sort state as the table.
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
