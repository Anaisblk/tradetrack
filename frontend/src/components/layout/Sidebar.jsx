import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import {
  IconDashboard, IconWrench, IconUsers, IconPackage,
  IconFileText, IconCalendar, IconTrending, IconSettings, IconChevronLeft,
} from '../ui/Icon'

const navItems = [
  { to: '/', label: 'Dashboard', Icon: IconDashboard, roles: ['admin', 'vendeur', 'technicien'] },
  { to: '/repairs', label: 'Réparations', Icon: IconWrench, roles: ['admin', 'vendeur', 'technicien'] },
  { to: '/clients', label: 'Clients', Icon: IconUsers, roles: ['admin', 'vendeur'] },
  { to: '/stock', label: 'Pièces détachées', Icon: IconPackage, roles: ['admin', 'vendeur', 'technicien'] },
  { to: '/quotes', label: 'Devis', Icon: IconFileText, roles: ['admin', 'vendeur'] },
  { to: '/planning', label: 'Planning', Icon: IconCalendar, roles: ['admin', 'vendeur', 'technicien'] },
  { to: '/reports', label: 'Rapports', Icon: IconTrending, roles: ['admin', 'vendeur'] },
  { to: '/admin/deletion-requests', label: 'Demandes RGPD', Icon: IconFileText, roles: ['admin'] },
  { to: '/settings', label: 'Paramètres', Icon: IconSettings, roles: ['admin'] },
]

const STORAGE_KEY = 'sidebar_collapsed'

export default function Sidebar() {
  const { user } = useAuthStore()
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
  })

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0') } catch { /* ignore */ }
  }, [collapsed])

  const toggle = () => setCollapsed((c) => !c)

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-64'} min-h-screen bg-slate-900 text-white flex flex-col transition-all duration-200`}
    >
      <div
        className={`py-5 border-b border-slate-800 flex gap-3 ${
          collapsed
            ? 'flex-col items-center px-2'
            : 'flex-row items-center justify-between px-6'
        }`}
      >
        {collapsed ? (
          <img src="/assets/tradetrack-mark.png" alt="TradeTrack" width="32" height="32" />
        ) : (
          <div className="flex items-center gap-3 min-w-0">
            <img src="/assets/tradetrack-mark.png" alt="TradeTrack" width="38" height="38" className="flex-shrink-0" />
            <span className="text-xl font-bold truncate">
              <span className="text-white">Trade</span>
              <span className="text-cyan-400 italic">Track</span>
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Déplier la barre latérale' : 'Replier la barre latérale'}
          title={collapsed ? 'Déplier' : 'Replier'}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <span className={`inline-block transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}>
            <IconChevronLeft size={16} />
          </span>
        </button>
      </div>

      <nav className={`flex-1 ${collapsed ? 'px-2' : 'px-3'} py-4 space-y-1`}>
        {navItems
          .filter((item) => !user?.role || item.roles.includes(user.role))
          .map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          ))}
      </nav>

      {!collapsed && (
        <div className="px-6 py-4 border-t border-slate-800 text-xs text-slate-400">
          {user?.first_name} {user?.last_name}
          <br />
          <span className="capitalize">{user?.role}</span>
        </div>
      )}
    </aside>
  )
}
