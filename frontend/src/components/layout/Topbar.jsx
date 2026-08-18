import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useNotificationStore from '../../store/notificationStore'
import { fetchNotifications, markNotificationRead, markAllRead } from '../../api/notifications'
import { formatDateTime } from '../../utils/formatters'
import { IconBell, IconMenu } from '../ui/Icon'

export default function Topbar({ onOpenNav = () => {} }) {
  const { user, clearAuth, accessToken } = useAuthStore()
  const { notifications, unreadCount, setNotifications, markRead } = useNotificationStore()
  const [showNotifs, setShowNotifs] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchNotifications().then(setNotifications).catch(() => {})
  }, [])

  useEffect(() => {
    if (!accessToken) return
    // EventSource cannot send custom headers, so the token goes in the query string
    const url = `${import.meta.env.VITE_API_URL || '/api'}/notifications/stream?token=${encodeURIComponent(accessToken)}`
    const es = new EventSource(url)
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        if (data.title) fetchNotifications().then(setNotifications).catch(() => {})
      } catch {}
    }
    return () => es.close()
  }, [accessToken])

  const handleMarkRead = async (id) => {
    await markNotificationRead(id)
    markRead(id)
  }

  const handleMarkAll = async () => {
    await markAllRead()
    fetchNotifications().then(setNotifications)
  }

  const logout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-2 sticky top-0 z-20">
      {/* Opens the nav drawer, mobile and tablet */}
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Ouvrir le menu"
        className="lg:hidden p-2 -ml-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
      >
        <IconMenu size={22} />
      </button>
      <h1 className="text-lg font-semibold text-gray-800 flex-1" />
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative">
          <button
            className="relative p-2 text-slate-500 hover:text-slate-700"
            onClick={() => setShowNotifs(!showNotifs)}
            aria-label="Notifications"
          >
            <IconBell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-xl shadow-xl border z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="font-semibold text-sm">Notifications</span>
                <button onClick={handleMarkAll} className="text-xs text-indigo-600">Lire</button>
              </div>
              <div className="max-h-80 overflow-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-gray-400 text-center">Aucune notification</p>
                ) : (
                  notifications.slice(0, 20).map((n) => (
                    <button
                      key={n.id}
                      className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 ${!n.is_read ? 'bg-indigo-50' : ''}`}
                      onClick={() => handleMarkRead(n.id)}
                    >
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatDateTime(n.created_at)}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <span className="hidden sm:inline text-sm text-slate-600">{user?.first_name}</span>
        <button onClick={logout} className="text-sm text-slate-500 hover:text-rose-600 transition-colors whitespace-nowrap">Déconnexion</button>
      </div>
    </header>
  )
}
