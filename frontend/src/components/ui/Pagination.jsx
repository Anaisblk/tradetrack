/**
 * Reusable pagination: page numbers and a page size selector.
 */
export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, disabled = false }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, total)

  const goTo = (n) => {
    const safe = Math.max(1, Math.min(totalPages, n))
    if (safe !== page) onPageChange(safe)
  }

  // Compact page list: 1, ..., n-1, n, n+1, ..., last
  const buildPages = () => {
    const pages = new Set([1, totalPages, page, page - 1, page + 1])
    const sorted = [...pages].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b)
    const withGaps = []
    sorted.forEach((n, i) => {
      if (i > 0 && n - sorted[i - 1] > 1) withGaps.push('…')
      withGaps.push(n)
    })
    return withGaps
  }

  const pages = buildPages()

  const baseBtn = 'px-3 py-1.5 text-sm rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 bg-white text-sm">
      <div className="flex items-center gap-2 text-slate-500">
        <span>{total === 0 ? 'Aucun résultat' : `${start}–${end} sur ${total}`}</span>
        <span className="hidden sm:inline">·</span>
        <label className="flex items-center gap-1.5 hidden sm:flex">
          <span>Par page :</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={disabled}
            className="px-2 py-1 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => goTo(page - 1)}
          disabled={disabled || page <= 1}
          className={`${baseBtn} border-slate-300 hover:bg-slate-50`}
        >
          Précédent
        </button>
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`gap-${i}`} className="px-2 text-slate-400">…</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => goTo(p)}
              disabled={disabled}
              className={
                p === page
                  ? `${baseBtn} bg-indigo-600 text-white border-indigo-600`
                  : `${baseBtn} border-slate-300 hover:bg-slate-50`
              }
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => goTo(page + 1)}
          disabled={disabled || page >= totalPages}
          className={`${baseBtn} border-slate-300 hover:bg-slate-50`}
        >
          Suivant
        </button>
      </div>
    </div>
  )
}
