import { useState, useEffect } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchRepairsPaginated } from '../../api/repairs'
import { QUERY_KEYS } from '../../api/queryKeys'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import SortableHeader from '../../components/ui/SortableHeader'
import MobileSortSelect from '../../components/ui/MobileSortSelect'
import Pagination from '../../components/ui/Pagination'
import { IconPlus } from '../../components/ui/Icon'
import { formatDate, REPAIR_STATUS_LABELS, getStatusColor } from '../../utils/formatters'

// Mêmes champs que les SortableHeader du tableau, pour le tri en vue cartes.
const SORT_FIELDS = [
  { label: 'N°', field: 'id' },
  { label: 'Statut', field: 'status' },
  { label: 'Date estimée', field: 'estimated_date' },
]

export default function RepairsList() {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState({ field: null, direction: 'asc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  useEffect(() => { setPage(1) }, [search, sort.field, sort.direction, pageSize])

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...QUERY_KEYS.repairs, 'paginated', search, sort.field, sort.direction, page, pageSize],
    queryFn: () => fetchRepairsPaginated({
      skip: (page - 1) * pageSize,
      limit: pageSize,
      search: search || undefined,
      order_by: sort.field || undefined,
      order_dir: sort.direction,
    }),
    placeholderData: keepPreviousData,
  })
  const repairs = data?.items ?? []
  const total = data?.total ?? 0

  const handleSort = (field) => {
    setSort((s) => s.field === field
      ? { field, direction: s.direction === 'asc' ? 'desc' : 'asc' }
      : { field, direction: 'asc' })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold">Réparations</h2>
        <Link to="/repairs/new">
          <Button className="inline-flex items-center gap-1.5">
            <IconPlus size={16} />
            Nouvelle
          </Button>
        </Link>
      </div>

      <div className="max-w-sm">
        <Input placeholder="Rechercher par nom de client..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <MobileSortSelect className="md:hidden" fields={SORT_FIELDS} sort={sort} onSort={handleSort} />

      <div className="bg-white rounded-xl border overflow-hidden">
        {/* Mobile : cartes. Le tableau ci-dessous reprend la main à partir de `md`. */}
        <div className="md:hidden divide-y">
          {isLoading ? (
            <p className="text-center py-8 text-gray-400 text-sm">Chargement...</p>
          ) : repairs.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">Aucune réparation</p>
          ) : repairs.map((r) => (
            <Link key={r.id} to={`/repairs/${r.id}`} className="block p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between gap-3">
                <span className="font-medium">#{r.id}</span>
                <span className="flex items-center gap-1.5 flex-shrink-0">
                  <Badge label={REPAIR_STATUS_LABELS[r.status]} color={getStatusColor(r.status)} />
                  {r.completed_date && <span className="text-xs text-green-600 font-medium">(rendu)</span>}
                </span>
              </div>
              <p className="text-sm mt-1 break-words">{r.device_type} {r.device_brand} {r.device_model}</p>
              <p className="text-sm text-gray-500 mt-0.5 break-words">
                {r.client ? `${r.client.first_name} ${r.client.last_name}` : '—'}
              </p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(r.estimated_date)}</p>
            </Link>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-500">
              <SortableHeader label="N°" field="id" sort={sort} onSort={handleSort} />
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Appareil</th>
              <SortableHeader label="Statut" field="status" sort={sort} onSort={handleSort} />
              <SortableHeader label="Date estimée" field="estimated_date" sort={sort} onSort={handleSort} />
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Chargement...</td></tr>
            ) : repairs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Aucune réparation</td></tr>
            ) : repairs.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-3">#{r.id}</td>
                <td className="px-4 py-3">{r.client ? `${r.client.first_name} ${r.client.last_name}` : '—'}</td>
                <td className="px-4 py-3">{r.device_type} {r.device_brand} {r.device_model}</td>
                <td className="px-4 py-3">
                  <Badge label={REPAIR_STATUS_LABELS[r.status]} color={getStatusColor(r.status)} />
                  {r.completed_date && <span className="ml-2 text-xs text-green-600 font-medium">(rendu)</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(r.estimated_date)}</td>
                <td className="px-4 py-3">
                  <Link to={`/repairs/${r.id}`} className="text-indigo-600 hover:underline text-xs">Voir</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
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
