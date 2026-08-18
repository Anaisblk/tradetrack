import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'
import {
  fetchRepairsStats, fetchRepairsMonthly, fetchRepairsDailyRevenue,
  fetchTopDevices, fetchRepairsStatusBreakdown, fetchRepairsAvgDuration,
} from '../../api/dashboard'
import { QUERY_KEYS } from '../../api/queryKeys'
import { formatCurrency } from '../../utils/formatters'
import Select from '../../components/ui/Select'
import useMediaQuery, { SM } from '../../hooks/useMediaQuery'

const PERIODS = [
  { value: 'day', label: 'Jour' },
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
  { value: 'year', label: 'Année' },
]

export default function ReportsPage() {
  const [period, setPeriod] = useState('month')

  const { data: stats } = useQuery({
    queryKey: [...QUERY_KEYS.dashboard('repairs-stats'), period],
    queryFn: () => fetchRepairsStats(period),
  })
  const { data: avgDuration } = useQuery({ queryKey: QUERY_KEYS.dashboard('repairs-avg-duration'), queryFn: fetchRepairsAvgDuration })
  const { data: breakdown = [] } = useQuery({ queryKey: QUERY_KEYS.dashboard('repairs-status-breakdown'), queryFn: fetchRepairsStatusBreakdown })
  const { data: monthly = [] } = useQuery({ queryKey: QUERY_KEYS.dashboard('repairs-monthly'), queryFn: fetchRepairsMonthly })
  const { data: dailyRevenue = [] } = useQuery({ queryKey: QUERY_KEYS.dashboard('repairs-daily-revenue'), queryFn: fetchRepairsDailyRevenue })
  const { data: topDevices = [] } = useQuery({ queryKey: QUERY_KEYS.dashboard('top-devices'), queryFn: () => fetchTopDevices(10) })

  // Recharts is sized in JS, so the Y axis has to shrink on mobile
  const isWide = useMediaQuery(SM)

  const byStatus = Object.fromEntries(breakdown.map((s) => [s.status, s.count]))
  const avgDays = avgDuration?.avg_days
  const topData = topDevices.map((d) => ({
    label: `${d.device_brand ? d.device_brand + ' ' : ''}${d.device_type}`,
    count: d.count,
  }))

  return (
    <div className="space-y-8">
      <h2 className="text-xl sm:text-2xl font-bold">Rapports atelier</h2>

      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: completed repairs */}
        <div className="bg-white rounded-xl border p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-500">Réparations terminées</p>
            <div className="w-28 sm:w-32">
              <Select options={PERIODS} value={period} onChange={(e) => setPeriod(e.target.value)} />
            </div>
          </div>
          <p className="text-3xl font-bold">{stats?.count ?? 0}</p>
          <p className="text-sm text-gray-500">CA : {formatCurrency(stats?.revenue_ttc)}</p>
        </div>

        {/* Card 2: average repair time */}
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Temps moyen d'intervention</p>
          <p className="text-3xl font-bold mt-1">
            {avgDays != null ? `${avgDays.toFixed(1).replace('.', ',')} jours` : '—'}
          </p>
          <p className="text-sm text-gray-500 mt-1">entre réception et clôture</p>
        </div>

        {/* Card 3: breakdown by status */}
        <div className="bg-white rounded-xl border p-5">
          <p className="text-sm text-gray-500">Répartition par statut</p>
          <p className="text-base font-medium mt-2 leading-relaxed">
            {byStatus.recu || 0} reçus, {byStatus.en_cours || 0} en cours,{' '}
            {byStatus.repare || 0} réparés, {byStatus.annulee || 0} annulées
          </p>
        </div>
      </div>

      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: repairs per month */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">Réparations terminées par mois (année en cours)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: revenue over the last 30 days */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-semibold mb-4">CA réparations - 30 derniers jours</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: most repaired devices */}
        <div className="bg-white rounded-xl border p-6 lg:col-span-2">
          <h3 className="font-semibold mb-4">Top 10 des appareils les plus réparés</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topData} layout="vertical" margin={{ left: isWide ? 40 : 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: isWide ? 11 : 9 }} width={isWide ? 150 : 92} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
