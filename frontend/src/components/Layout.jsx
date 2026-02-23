import { Menu } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout({ role }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        role={role}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main area — shifts right on desktop only */}
      <div className="flex flex-col flex-1 min-w-0 lg:ml-64">

        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center gap-3 bg-primary-900 px-4 h-14 lg:hidden shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-white p-1 -ml-1"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <span className="text-white font-bold text-sm">Esther Rent</span>
        </header>

        <main className="flex-1">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>

        <footer className="border-t border-slate-200 bg-white py-3 px-4 text-center shrink-0">
          <p className="text-xs text-slate-400">
            Powered by <span className="font-semibold text-slate-600">Sazara</span>
          </p>
        </footer>

      </div>
    </div>
  )
}
