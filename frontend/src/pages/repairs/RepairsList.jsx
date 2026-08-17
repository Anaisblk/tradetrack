import { useState, useEffect } from 'react'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { fetchRepairsPaginated } from '../../api/repairs'
import { QUERY_KEYS } from '../../api/queryKeys'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import SortableHeader from '../../components/ui/SortableHeader'
import Pagination from '../../components/ui/Pagination'
import { IconPlus } from '../../components/ui/Icon'
import { formatDate, REPAIR_STATUS_LABELS, getStatusColor } from '../../utils/formatters'

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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Réparations</h2>
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

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
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
