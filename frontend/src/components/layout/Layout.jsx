import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const { pathname } = useLocation()

  // Ferme le tiroir à chaque changement de route. Les NavLink appellent déjà onClose,
  // ceci couvre les autres cas : navigation programmatique, bouton retour du navigateur.
  useEffect(() => { setMobileNavOpen(false) }, [pathname])

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar onOpenNav={() => setMobileNavOpen(true)} />
        {/* overflow-x-hidden : dernier rempart contre un débordement horizontal ponctuel */}
        <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
