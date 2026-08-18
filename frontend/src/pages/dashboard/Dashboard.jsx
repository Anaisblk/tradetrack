import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip
} from 'recharts'
import { fetchDashboardToday, fetchTopDevices, fetchRepairsDailyRevenue } from '../../api/dashboard'
import { QUERY_KEYS } from '../../api/queryKeys'
import { formatCurrency } from '../../utils/formatters'

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-l-4 border-l-indigo-500 border-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { data: today } = useQuery({ queryKey: QUERY_KEYS.dashboard('today'), queryFn: fetchDashboardToday })
  const { data: repairsDaily = [] } = useQuery({ queryKey: QUERY_KEYS.dashboard('repairs-daily-revenue'), queryFn: fetchRepairsDailyRevenue })
  const { data: topDevices = [] } = useQuery({ queryKey: QUERY_KEYS.dashboard('top-devices'), queryFn: () => fetchTopDevices(8) })

  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Dashboard</h2>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Recettes du jour (€)" value={formatCurrency(today?.revenue_ttc)} />
        <StatCard label="Réparations clôturées" value={today?.repairs_completed ?? 0} />
        <StatCard label="Réparations en cours" value={today?.repairs_in_progress ?? 0} />
        <StatCard label="RDV aujourd'hui" value={today?.appointments_today ?? 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold mb-4">CA réparations - 30 derniers jours</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={repairsDaily}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-semibold mb-4">Top appareils réparés</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topDevices.map((d) => ({ label: `${d.device_brand ? d.device_brand + ' ' : ''}${d.device_type}`, count: d.count }))}>
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
