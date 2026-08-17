import { Routes, Route, Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Layout from './components/layout/Layout'
import Button from './components/ui/Button'

import LoginPage from './pages/auth/Login'
import RegisterPage from './pages/auth/Register'
import DashboardPage from './pages/dashboard/Dashboard'
import RepairsList from './pages/repairs/RepairsList'
import NewRepair from './pages/repairs/NewRepair'
import RepairDetail from './pages/repairs/RepairDetail'
import ClientsList from './pages/clients/ClientsList'
import ClientDetail from './pages/clients/ClientDetail'
import StockPage from './pages/stock/Stock'
import QuotesList from './pages/quotes/QuotesList'
import NewQuote from './pages/quotes/NewQuote'
import PlanningPage from './pages/planning/Planning'
import ReportsPage from './pages/reports/Reports'
import SettingsPage from './pages/settings/Settings'
import DeletionRequests from './pages/admin/DeletionRequests'
import MyData from './pages/client-portal/MyData'

function ProtectedRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role === 'client') return <Navigate to="/portal" replace />
  return children
}

function ClientPortalRoute({ children }) {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'client') return <Navigate to="/" replace />
  return children
}

export default function App() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()
  const handleLogout = () => { clearAuth(); navigate('/login') }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to={user?.role === 'client' ? '/portal' : '/'} /> : <LoginPage />
        }
      />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/repairs" element={<RepairsList />} />
        <Route path="/repairs/new" element={<NewRepair />} />
        <Route path="/repairs/:id" element={<RepairDetail />} />
        <Route path="/clients" element={<ClientsList />} />
        <Route path="/clients/:id" element={<ClientDetail />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/quotes" element={<QuotesList />} />
        <Route path="/quotes/new" element={<NewQuote />} />
        <Route path="/planning" element={<PlanningPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/admin/deletion-requests" element={<DeletionRequests />} />
      </Route>

      <Route
        path="/portal"
        element={
          <ClientPortalRoute>
            <div className="min-h-screen bg-gray-50 p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold">Mon espace client</h1>
                  <div className="flex items-center gap-4">
                    {user && (
                      <span className="text-sm text-gray-600">
                        Bonjour {user.first_name} {user.last_name}
                      </span>
                    )}
                    <Button variant="secondary" onClick={handleLogout}>
                      Déconnexion
                    </Button>
                  </div>
                </div>
                <nav className="flex gap-1 border-b border-gray-200">
                  {[
                    { to: 'data', label: 'Mes données' },
                  ].map(({ to, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        `px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                          isActive
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`
                      }
                    >
                      {label}
                    </NavLink>
                  ))}
                </nav>
                <Outlet />
              </div>
            </div>
          </ClientPortalRoute>
        }
      >
        <Route index element={<Navigate to="data" />} />
        <Route path="data" element={<MyData />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  )
}
