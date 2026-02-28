import {
  BarChart3,
  Building2,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Users,
  X,
  ChevronsUpDown,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const LANDLORD_NAV = [
  { to: '/landlord/dashboard',  icon: LayoutDashboard, label: 'Dashboard'},
  { to: '/landlord/properties', icon: Building2,        label: 'Properties'},
  { to: '/landlord/tenants',    icon: Users,             label: 'Tenants'},
  { to: '/landlord/invoices',   icon: FileText,          label: 'Invoices'},
  { to: '/landlord/payments',   icon: CreditCard,        label: 'Payments'},
  { to: '/landlord/reports',    icon: BarChart3,         label: 'Reports'},
]

const TENANT_NAV = [
  { to: '/tenant/dashboard', icon: LayoutDashboard, label: 'Dashboard'},
  { to: '/tenant/invoices',  icon: FileText,          label: 'My Invoices'},
]

export default function Sidebar({ role, open, onClose }) {
  const { user, logout } = useAuth()
  const nav = role === 'landlord' ? LANDLORD_NAV : TENANT_NAV

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '?'

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex flex-col w-56 bg-gray-50 border-r transition-transform transform ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
        aria-hidden={!open && 'true'}
      >
        {/* Mobile close */}
        <div className="flex items-center justify-between p-3 lg:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">ER</div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Esther Rent</p>
              <p className="text-xs text-slate-500 capitalize">{role}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-md text-slate-500 hover:bg-slate-100">
            <X size={16} />
          </button>
        </div>

        {/* Desktop header */}
        <div className="hidden lg:flex lg:items-center lg:gap-3 lg:px-4 lg:py-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">ER</div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Esther Rent</p>
            <p className="text-xs text-slate-500 capitalize">{role}</p>
          </div>
        </div>

        <div className="border-t border-slate-100 my-2 lg:mt-3" />

        <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{role === 'landlord' ? 'Management' : 'My Portal'}</p>

        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {nav.map(({ to, icon: Icon, label, shortcut }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-100'}`}
            >
              <span className={`text-sm ${'text-slate-400'}`}><Icon size={16} /></span>
              <span className="truncate">{label}</span>
              {shortcut && <span className="ml-auto text-xs text-slate-300">{shortcut}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-pink-400 text-white flex items-center justify-center text-xs font-bold shadow-sm">{initials}</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user?.first_name} {user?.last_name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
            <div className="ml-auto hidden lg:flex"><ChevronsUpDown size={14} className="text-slate-300" /></div>
          </div>

          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600">
            <LogOut size={14} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>
    </>
  )
}