import {
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  Home,
  LayoutDashboard,
  LogOut,
  Users,
  X,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const LANDLORD_NAV = [
  { to: '/landlord/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/landlord/properties', icon: Building2, label: 'Properties' },
  { to: '/landlord/tenants', icon: Users, label: 'Tenants' },
  { to: '/landlord/invoices', icon: FileText, label: 'Invoices' },
  { to: '/landlord/payments', icon: CreditCard, label: 'Payments' },
  { to: '/landlord/reports', icon: BarChart3, label: 'Reports' },
]

const TENANT_NAV = [
  { to: '/tenant/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/tenant/invoices', icon: FileText, label: 'My Invoices' },
]

export default function Sidebar({ role, open, onClose }) {
  const { user, logout } = useAuth()
  const nav = role === 'landlord' ? LANDLORD_NAV : TENANT_NAV

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-primary-900 text-white
        transform transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
    >
      {/* Logo / header */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-primary-800 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
          <Home size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-none">Esther Rent</p>
          <p className="text-xs text-primary-300 leading-none mt-0.5 capitalize">{role} Portal</p>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className="lg:hidden text-primary-300 hover:text-white p-1 -mr-1"
          aria-label="Close menu"
        >
          <X size={20} />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}   // close drawer on mobile after navigating
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-700 text-white'
                  : 'text-primary-200 hover:bg-primary-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-primary-800 p-4 shrink-0">
        <div className="mb-3">
          <p className="text-sm font-medium text-white truncate">
            {user?.first_name} {user?.last_name}
          </p>
          <p className="text-xs text-primary-300 truncate">{user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary-200 hover:bg-primary-800 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
