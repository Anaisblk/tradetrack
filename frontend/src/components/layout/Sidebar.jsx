import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useMediaQuery, { LG } from '../../hooks/useMediaQuery'
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

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const { user } = useAuthStore()
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) === '1' } catch { return false }
  })

  // Sous `lg`, la barre devient un tiroir de 256px : le repli en icônes seules n'a plus
  // de sens et serait illisible au doigt. On neutralise donc `collapsed` hors desktop,
  // sans toucher à la préférence enregistrée.
  const isDesktop = useMediaQuery(LG)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0') } catch { /* ignore */ }
  }, [collapsed])

  const isCollapsed = collapsed && isDesktop
  const toggle = () => setCollapsed((c) => !c)

  return (
    <>
      {/* Voile : ferme le tiroir au clic. Mobile uniquement. */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`${isCollapsed ? 'w-16' : 'w-64'} bg-slate-900 text-white flex flex-col
          transition-transform duration-200
          fixed inset-y-0 left-0 z-40 overflow-y-auto
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:static lg:translate-x-0 lg:min-h-screen lg:overflow-visible lg:transition-all`}
      >
        <div
          className={`py-5 border-b border-slate-800 flex gap-3 ${
            isCollapsed
              ? 'flex-col items-center px-2'
              : 'flex-row items-center justify-between px-6'
          }`}
        >
          {isCollapsed ? (
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
          {/* Repli : desktop uniquement. Sur mobile, la fermeture se fait par le voile. */}
          <button
            type="button"
            onClick={toggle}
            aria-label={isCollapsed ? 'Déplier la barre latérale' : 'Replier la barre latérale'}
            title={isCollapsed ? 'Déplier' : 'Replier'}
            className="hidden lg:block p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <span className={`inline-block transition-transform duration-200 ${isCollapsed ? 'rotate-180' : ''}`}>
              <IconChevronLeft size={16} />
            </span>
          </button>
          {/* Fermeture du tiroir : mobile uniquement */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="lg:hidden p-2 -mr-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xl leading-none"
          >
            &times;
          </button>
        </div>

        <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-3'} py-4 space-y-1`}>
          {navItems
            .filter((item) => !user?.role || item.roles.includes(user.role))
            .map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                title={isCollapsed ? label : undefined}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 lg:py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {!isCollapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
        </nav>

        {!isCollapsed && (
          <div className="px-6 py-4 border-t border-slate-800 text-xs text-slate-400">
            {user?.first_name} {user?.last_name}
            <br />
            <span className="capitalize">{user?.role}</span>
          </div>
        )}
      </aside>
    </>
  )
}
