import { useState, useEffect } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchQuotesPaginated } from '../../api/quotes'
import { QUERY_KEYS } from '../../api/queryKeys'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import SortableHeader from '../../components/ui/SortableHeader'
import Pagination from '../../components/ui/Pagination'
import { IconPlus } from '../../components/ui/Icon'
import { formatCurrency, formatDate, QUOTE_STATUS_LABELS, getStatusColor } from '../../utils/formatters'
import { parseQuoteNotes, extractDeviceFields } from '../../utils/quoteNotes'
import { DEVICE_TYPES, getBrands } from '../../utils/deviceCatalog'

// Construit l'URL /repairs/new préremplie à partir d'un devis autonome.
const buildRepairUrl = (q) => {
  const { deviceInfo, problem } = parseQuoteNotes(q.notes)
  const { device_type, device_brand, device_model } = extractDeviceFields(deviceInfo, DEVICE_TYPES, getBrands)
  const params = new URLSearchParams()
  params.set('fromQuote', q.id)
  if (q.client_id) params.set('client_id', q.client_id)
  if (device_type) params.set('device_type', device_type)
  if (device_brand) params.set('device_brand', device_brand)
  if (device_model) params.set('device_model', device_model)
  if (q.total_ttc) params.set('estimated_cost', q.total_ttc)
  if (problem) params.set('problem', problem)
  return `/repairs/new?${params.toString()}`
}

export default function QuotesList() {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ field: null, direction: 'asc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => { setPage(1) }, [search, sort.field, sort.direction, pageSize])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...QUERY_KEYS.quotes, 'paginated', search, sort.field, sort.direction, page, pageSize],
    queryFn: () => fetchQuotesPaginated({
      skip: (page - 1) * pageSize,
      limit: pageSize,
      search: search || undefined,
      order_by: sort.field || undefined,
      order_dir: sort.direction,
    }),
    placeholderData: keepPreviousData,
  })
  const quotes = data?.items ?? []
  const total = data?.total ?? 0

  const handleSort = (field) => {
    setSort((s) => s.field === field
      ? { field, direction: s.direction === 'asc' ? 'desc' : 'asc' }
      : { field, direction: 'asc' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Devis</h2>
        <Link to="/quotes/new">
          <Button className="inline-flex items-center gap-1.5">
            <IconPlus size={16} />
            Nouveau
          </Button>
        </Link>
      </div>

      <div className="max-w-sm">
        <Input placeholder="Rechercher par nom de client..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <SortableHeader label="N°" field="id" sort={sort} onSort={handleSort} />
              <th className="px-4 py-3">Client</th>
              <SortableHeader label="Montant TTC" field="total_ttc" sort={sort} onSort={handleSort} />
              <SortableHeader label="Statut" field="status" sort={sort} onSort={handleSort} />
              <SortableHeader label="Validité" field="valid_until" sort={sort} onSort={handleSort} />
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Chargement...</td></tr>
            ) : quotes.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Aucun devis</td></tr>
            ) : quotes.map((q) => (
              <tr key={q.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">#{q.id}</td>
                <td className="px-4 py-3">{q.client ? `${q.client.first_name} ${q.client.last_name}` : '—'}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(q.total_ttc)}</td>
                <td className="px-4 py-3"><Badge label={QUOTE_STATUS_LABELS[q.status]} color={getStatusColor(q.status)} /></td>
                <td className="px-4 py-3 text-gray-500">{formatDate(q.valid_until)}</td>
                <td className="px-4 py-3 flex gap-2">
                  <Link to={buildRepairUrl(q)} className="text-indigo-600 hover:underline text-xs">
                    → Réparation
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          disabled={isFetching}
        />
      </div>
    </div>
  )
}
