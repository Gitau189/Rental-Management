import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import LoadingSpinner from './components/LoadingSpinner'
import Layout from './components/Layout'

import Login from './pages/Login'
import Dashboard from './pages/landlord/Dashboard'
import Properties from './pages/landlord/Properties'
import PropertyDetail from './pages/landlord/PropertyDetail'
import Tenants from './pages/landlord/Tenants'
import TenantDetail from './pages/landlord/TenantDetail'
import Invoices from './pages/landlord/Invoices'
import CreateInvoice from './pages/landlord/CreateInvoice'
import InvoiceDetail from './pages/landlord/InvoiceDetail'
import Payments from './pages/landlord/Payments'
import Reports from './pages/landlord/Reports'

import TenantDashboard from './pages/tenant/TenantDashboard'
import TenantInvoices from './pages/tenant/TenantInvoices'
import TenantInvoiceDetail from './pages/tenant/TenantInvoiceDetail'

function RequireAuth({ children, role }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner fullPage />
  if (!user) return <Navigate to="/login" replace />
  if (role && user.role !== role) {
    return <Navigate to={user.role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard'} replace />
  }
  return children
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) return <LoadingSpinner fullPage />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          user ? <Navigate to={user.role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard'} replace /> : <Login />
        } />

        {/* Landlord routes */}
        <Route path="/landlord" element={
          <RequireAuth role="landlord"><Layout role="landlord" /></RequireAuth>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="properties" element={<Properties />} />
          <Route path="properties/:id" element={<PropertyDetail />} />
          <Route path="tenants" element={<Tenants />} />
          <Route path="tenants/:id" element={<TenantDetail />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/create" element={<CreateInvoice />} />
          <Route path="invoices/:id" element={<InvoiceDetail />} />
          <Route path="payments" element={<Payments />} />
          <Route path="reports" element={<Reports />} />
        </Route>

        {/* Tenant routes */}
        <Route path="/tenant" element={
          <RequireAuth role="tenant"><Layout role="tenant" /></RequireAuth>
        }>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<TenantDashboard />} />
          <Route path="invoices" element={<TenantInvoices />} />
          <Route path="invoices/:id" element={<TenantInvoiceDetail />} />
        </Route>

        <Route path="/" element={
          user
            ? <Navigate to={user.role === 'landlord' ? '/landlord/dashboard' : '/tenant/dashboard'} replace />
            : <Navigate to="/login" replace />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
