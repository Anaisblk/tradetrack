import { IconArrowUp, IconArrowDown, IconArrowUpDown } from './Icon'

/**
 * Clickable table header. Sort state is held by the page and passed down.
 */
export default function SortableHeader({ label, field, sort, onSort, className = '' }) {
  const isActive = sort?.field === field
  const direction = isActive ? sort.direction : null
  const Icon = !isActive ? IconArrowUpDown : (direction === 'asc' ? IconArrowUp : IconArrowDown)
  const iconColor = isActive ? 'text-indigo-600' : 'text-slate-400'

  return (
    <th className={`pb-2 px-4 py-3 ${className}`}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className="inline-flex items-center gap-1 text-left font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <span>{label}</span>
        <span className={iconColor}>
          <Icon size={14} />
        </span>
      </button>
    </th>
  )
}
