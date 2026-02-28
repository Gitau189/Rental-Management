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
import { useState } from 'react'

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
  const [hoveredItem, setHoveredItem] = useState(null)

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase()
    : '?'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@500;600&family=DM+Sans:wght@400;500;600&display=swap');

        .sidebar-root {
          position: fixed;
          inset-block: 0;
          left: 0;
          z-index: 40;
          display: flex;
          flex-direction: column;
          width: 248px;
          background-color: #16213e;
          background-image:
            radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.12) 0%, transparent 60%),
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E");
          color: #fff;
          font-family: 'DM Sans', sans-serif;
          transform: translateX(${open ? '0' : '-100%'});
          transition: transform 280ms cubic-bezier(0.32, 0.72, 0, 1);
          border-right: 1px solid rgba(255,255,255,0.05);
          box-shadow: 4px 0 24px rgba(0,0,0,0.35);
        }

        @media (min-width: 1024px) {
          .sidebar-root {
            transform: translateX(0) !important;
          }
        }

        /* Header */
        .sidebar-header {
          display: flex;
          align-items: center;
          gap: 10px;
          height: 64px;
          padding: 0 18px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          flex-shrink: 0;
        }

        .logo-mark {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          box-shadow: 0 2px 10px rgba(99,102,241,0.4);
          flex-shrink: 0;
          transition: box-shadow 200ms ease;
        }

        .logo-mark:hover {
          box-shadow: 0 4px 16px rgba(99,102,241,0.6);
        }

        .logo-text-primary {
          font-family: 'Lora', Georgia, serif;
          font-weight: 600;
          font-size: 14px;
          line-height: 1;
          color: #fff;
          letter-spacing: 0.01em;
        }

        .logo-text-secondary {
          font-size: 11px;
          color: rgba(255,255,255,0.38);
          margin-top: 3px;
          line-height: 1;
          text-transform: capitalize;
          letter-spacing: 0.04em;
        }

        .close-btn {
          margin-left: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          color: rgba(255,255,255,0.35);
          cursor: pointer;
          transition: color 150ms ease, background 150ms ease;
          background: transparent;
          border: none;
          flex-shrink: 0;
        }

        .close-btn:hover {
          color: #fff;
          background: rgba(255,255,255,0.08);
        }

        @media (min-width: 1024px) {
          .close-btn { display: none; }
        }

        /* Section label */
        .nav-section-label {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.22);
          padding: 16px 18px 6px;
        }

        /* Nav */
        .sidebar-nav {
          flex: 1;
          overflow-y: auto;
          padding: 8px 10px 12px;
          scrollbar-width: none;
        }

        .sidebar-nav::-webkit-scrollbar { display: none; }

        .nav-item {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 8px;
          font-size: 13.5px;
          font-weight: 500;
          text-decoration: none;
          color: rgba(255,255,255,0.48);
          margin-bottom: 2px;
          transition: color 150ms ease, background 150ms ease;
          cursor: pointer;
          letter-spacing: 0.01em;
        }

        .nav-item:hover {
          color: rgba(255,255,255,0.85);
          background: rgba(255,255,255,0.05);
        }

        .nav-item.active {
          color: #fff;
          background: rgba(99,102,241,0.18);
        }

        .nav-item.active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 20%;
          bottom: 20%;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: linear-gradient(to bottom, #6366f1, #8b5cf6);
        }

        .nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 18px;
          height: 18px;
          flex-shrink: 0;
          opacity: 0.7;
          transition: opacity 150ms ease;
        }

        .nav-item.active .nav-icon,
        .nav-item:hover .nav-icon {
          opacity: 1;
        }

        /* Footer */
        .sidebar-footer {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding: 14px 12px;
          flex-shrink: 0;
        }

        .user-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 8px 10px;
        }

        .avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #a78bfa);
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.04em;
          flex-shrink: 0;
          box-shadow: 0 1px 6px rgba(99,102,241,0.4);
        }

        .user-name {
          font-size: 13px;
          font-weight: 600;
          color: rgba(255,255,255,0.9);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          line-height: 1.2;
        }

        .user-email {
          font-size: 11px;
          color: rgba(255,255,255,0.3);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-top: 1px;
          line-height: 1.2;
        }

        .logout-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 8px 10px;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: rgba(255,255,255,0.32);
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: color 150ms ease, background 150ms ease;
          letter-spacing: 0.01em;
        }

        .logout-btn:hover {
          color: #f87171;
          background: rgba(248,113,113,0.08);
        }

        .logout-btn svg {
          flex-shrink: 0;
        }
      `}</style>

      <aside className="sidebar-root">
        {/* Header */}
        <div className="sidebar-header">
          <div className="logo-mark">
            <Home size={17} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="logo-text-primary">Esther Rent</p>
            <p className="logo-text-secondary">{role} portal</p>
          </div>
          <button onClick={onClose} className="close-btn" aria-label="Close menu">
            <X size={17} />
          </button>
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          <p className="nav-section-label">Menu</p>
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onMouseEnter={() => setHoveredItem(to)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <span className="nav-icon">
                <Icon size={16} />
              </span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="user-row">
            <div className="avatar">{initials}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="user-name">{user?.first_name} {user?.last_name}</p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="logout-btn">
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}